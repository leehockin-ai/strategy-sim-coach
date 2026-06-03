-- Programs: named contexts that scope membership and scenario access.
create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  kind text not null check (kind in ('internal_qa', 'enterprise', 'public')),
  description text,
  archived_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_programs_kind on public.programs(kind) where archived_at is null;
grant select on public.programs to authenticated;
grant all on public.programs to service_role;
alter table public.programs enable row level security;

-- Program admins
create table if not exists public.program_admins (
  program_id uuid not null references public.programs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  added_at timestamptz not null default now(),
  added_by uuid references auth.users(id),
  primary key (program_id, user_id)
);
create index if not exists idx_program_admins_user on public.program_admins(user_id);
grant select on public.program_admins to authenticated;
grant all on public.program_admins to service_role;
alter table public.program_admins enable row level security;

-- Program members
create table if not exists public.program_members (
  program_id uuid not null references public.programs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text,
  cohort_label text,
  joined_at timestamptz not null default now(),
  invited_by uuid references auth.users(id),
  primary key (program_id, user_id)
);
create index if not exists idx_program_members_user on public.program_members(user_id);
create index if not exists idx_program_members_program on public.program_members(program_id);
grant select on public.program_members to authenticated;
grant all on public.program_members to service_role;
alter table public.program_members enable row level security;

-- Assignments
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  scenario_id uuid not null references public.scenarios(id) on delete restrict,
  assigned_to_user_id uuid not null references auth.users(id) on delete cascade,
  assigned_by_user_id uuid not null references auth.users(id),
  admin_note text,
  due_at timestamptz,
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'submitted', 'reviewed', 'cancelled')),
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  unique (program_id, scenario_id, assigned_to_user_id)
);
create index if not exists idx_assignments_assignee on public.assignments(assigned_to_user_id, status);
create index if not exists idx_assignments_program on public.assignments(program_id, status);
grant select on public.assignments to authenticated;
grant all on public.assignments to service_role;
alter table public.assignments enable row level security;

-- Membership check trigger
create or replace function public.assignments_check_membership()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.program_members
    where program_id = new.program_id and user_id = new.assigned_to_user_id
  ) then
    raise exception 'Assignee % is not a member of program %', new.assigned_to_user_id, new.program_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_assignments_check_membership on public.assignments;
create trigger trg_assignments_check_membership
  before insert or update of program_id, assigned_to_user_id
  on public.assignments
  for each row execute function public.assignments_check_membership();

-- Link sessions to assignments
alter table public.sessions
  add column if not exists assignment_id uuid references public.assignments(id) on delete set null;
create index if not exists idx_sessions_assignment on public.sessions(assignment_id) where assignment_id is not null;

-- Status sync
create or replace function public.refresh_assignment_status(_assignment_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  has_reviewed boolean;
  has_evaluated boolean;
  has_inprogress boolean;
  current_status text;
begin
  if _assignment_id is null then return; end if;
  select status into current_status from public.assignments where id = _assignment_id;
  if current_status = 'cancelled' then return; end if;
  select
    bool_or(status in ('approved', 'conditional', 'not_approved', 'retry', 'escalated')),
    bool_or(status = 'evaluated'),
    bool_or(status not in ('approved', 'conditional', 'not_approved', 'retry', 'escalated', 'evaluated'))
  into has_reviewed, has_evaluated, has_inprogress
  from public.sessions where assignment_id = _assignment_id;
  update public.assignments
  set status = case
    when has_reviewed   then 'reviewed'
    when has_evaluated  then 'submitted'
    when has_inprogress then 'in_progress'
    else 'open'
  end
  where id = _assignment_id;
end $$;

create or replace function public.sessions_refresh_assignment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'UPDATE' and old.assignment_id is distinct from new.assignment_id) then
    perform public.refresh_assignment_status(old.assignment_id);
  end if;
  perform public.refresh_assignment_status(new.assignment_id);
  return new;
end $$;

drop trigger if exists trg_sessions_refresh_assignment on public.sessions;
create trigger trg_sessions_refresh_assignment
  after insert or update of status, assignment_id
  on public.sessions
  for each row execute function public.sessions_refresh_assignment();

-- Helpers
create or replace function public.is_program_admin(_user_id uuid, _program_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.program_admins where user_id = _user_id and program_id = _program_id)
$$;

create or replace function public.is_program_member(_user_id uuid, _program_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.program_members where user_id = _user_id and program_id = _program_id)
$$;

-- RLS
drop policy if exists "programs_visible_to_principals" on public.programs;
create policy "programs_visible_to_principals" on public.programs for select to authenticated
  using (public.is_program_admin(auth.uid(), id) or public.is_program_member(auth.uid(), id) or public.has_role(auth.uid(), 'admin'));

drop policy if exists "programs_inserted_by_admins" on public.programs;
create policy "programs_inserted_by_admins" on public.programs for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "programs_updated_by_admins" on public.programs;
create policy "programs_updated_by_admins" on public.programs for update to authenticated
  using (public.is_program_admin(auth.uid(), id) or public.has_role(auth.uid(), 'admin'))
  with check (public.is_program_admin(auth.uid(), id) or public.has_role(auth.uid(), 'admin'));

drop policy if exists "program_admins_visible_to_principals" on public.program_admins;
create policy "program_admins_visible_to_principals" on public.program_admins for select to authenticated
  using (public.is_program_admin(auth.uid(), program_id) or public.is_program_member(auth.uid(), program_id) or public.has_role(auth.uid(), 'admin'));

drop policy if exists "program_members_visible_appropriately" on public.program_members;
create policy "program_members_visible_appropriately" on public.program_members for select to authenticated
  using (user_id = auth.uid() or public.is_program_admin(auth.uid(), program_id) or public.has_role(auth.uid(), 'admin'));

drop policy if exists "assignments_visible_to_principals" on public.assignments;
create policy "assignments_visible_to_principals" on public.assignments for select to authenticated
  using (assigned_to_user_id = auth.uid() or public.is_program_admin(auth.uid(), program_id) or public.has_role(auth.uid(), 'admin'));

-- Seed
insert into public.programs (slug, name, kind, description, created_by)
values (
  'strategyzer-internal-coaches',
  'Strategyzer Internal Coaches',
  'internal_qa',
  'Internal QA and ongoing calibration for Strategyzer''s certified coach network.',
  'feb98ca4-fd2f-4319-926c-1ad33f3353df'
) on conflict (slug) do nothing;

insert into public.program_admins (program_id, user_id, added_by)
select id, 'feb98ca4-fd2f-4319-926c-1ad33f3353df', 'feb98ca4-fd2f-4319-926c-1ad33f3353df'
from public.programs where slug = 'strategyzer-internal-coaches'
on conflict do nothing;

comment on table public.programs is 'Named contexts that scope membership and scenario access. internal_qa = Strategyzer coach network; enterprise = client engagement; public = open-enrolment certification.';
comment on table public.assignments is 'A specific scenario assigned to a specific program member. One assignment can have many session attempts; status is derived from the most-advanced linked session.';
