insert into public.user_roles (user_id, role)
values ('feb98ca4-fd2f-4319-926c-1ad33f3353df', 'admin')
on conflict (user_id, role) do nothing;