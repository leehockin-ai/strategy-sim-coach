-- Roles enum
do $$ begin
  create type public.app_role as enum ('admin', 'reviewer', 'user');
exception when duplicate_object then null; end $$;

-- user_roles table
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- Security definer function to check roles (avoids RLS recursion)
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- Policies: users see their own roles; admins manage all
drop policy if exists "users_view_own_roles" on public.user_roles;
create policy "users_view_own_roles"
  on public.user_roles for select
  to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

drop policy if exists "admins_insert_roles" on public.user_roles;
create policy "admins_insert_roles"
  on public.user_roles for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "admins_update_roles" on public.user_roles;
create policy "admins_update_roles"
  on public.user_roles for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "admins_delete_roles" on public.user_roles;
create policy "admins_delete_roles"
  on public.user_roles for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Tighten reviewer access on existing tables: only admins/reviewers can read all sessions/evaluations/messages
drop policy if exists "reviewers_select_all_sessions" on public.sessions;
create policy "reviewers_select_all_sessions"
  on public.sessions for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'reviewer'));

drop policy if exists "reviewers_update_sessions" on public.sessions;
create policy "reviewers_update_sessions"
  on public.sessions for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'reviewer'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'reviewer'));

drop policy if exists "reviewers_select_all_evaluations" on public.evaluations;
create policy "reviewers_select_all_evaluations"
  on public.evaluations for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'reviewer'));

drop policy if exists "reviewers_update_evaluations" on public.evaluations;
create policy "reviewers_update_evaluations"
  on public.evaluations for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'reviewer'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'reviewer'));

drop policy if exists "reviewers_select_all_messages" on public.messages;
create policy "reviewers_select_all_messages"
  on public.messages for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'reviewer'));
