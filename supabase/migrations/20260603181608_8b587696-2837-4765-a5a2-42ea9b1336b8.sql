
-- 1) Restrict scenarios SELECT to authenticated only (system_prompt was publicly readable)
DROP POLICY IF EXISTS "scenarios_read_all" ON public.scenarios;
CREATE POLICY "scenarios_read_authenticated" ON public.scenarios
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.scenarios FROM anon;

-- 2) Assignments write policies (program admins or global admins)
CREATE POLICY "assignments_insert_by_admins" ON public.assignments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_program_admin(auth.uid(), program_id) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "assignments_update_by_admins" ON public.assignments
  FOR UPDATE TO authenticated
  USING (public.is_program_admin(auth.uid(), program_id) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.is_program_admin(auth.uid(), program_id) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "assignments_delete_by_admins" ON public.assignments
  FOR DELETE TO authenticated
  USING (public.is_program_admin(auth.uid(), program_id) OR public.has_role(auth.uid(), 'admin'::app_role));

-- 3) program_members write policies
CREATE POLICY "program_members_insert_by_admins" ON public.program_members
  FOR INSERT TO authenticated
  WITH CHECK (public.is_program_admin(auth.uid(), program_id) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "program_members_update_by_admins" ON public.program_members
  FOR UPDATE TO authenticated
  USING (public.is_program_admin(auth.uid(), program_id) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.is_program_admin(auth.uid(), program_id) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "program_members_delete_by_admins" ON public.program_members
  FOR DELETE TO authenticated
  USING (public.is_program_admin(auth.uid(), program_id) OR public.has_role(auth.uid(), 'admin'::app_role));

-- 4) program_admins write policies (only global admins can add/remove program admins)
CREATE POLICY "program_admins_insert_by_global_admins" ON public.program_admins
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "program_admins_delete_by_global_admins" ON public.program_admins
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
