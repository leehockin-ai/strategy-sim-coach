-- Signed-out visitors have no access rules on any app table; remove their table privileges entirely.
REVOKE ALL ON public.activity_external_connections, public.assignments, public.evaluation_jobs,
  public.external_runtime_allowed_hosts, public.interventions, public.messages, public.program_admins,
  public.program_members, public.programs, public.reviewer_supplements, public.sessions, public.user_roles,
  public.scenarios FROM anon;

-- Built-in scenarios: signed-in coaches may read only public client context.
-- Hidden simulation truth (system prompt, ambiguity factors, unrealistic aspects) is server-only.
REVOKE ALL ON public.scenarios FROM authenticated;
GRANT SELECT (id, slug, title, industry, difficulty, summary, context, success_definition, success_pressure, stakeholders, created_at)
  ON public.scenarios TO authenticated;
DROP POLICY IF EXISTS scenarios_read_authenticated ON public.scenarios;
CREATE POLICY scenarios_builtin_catalog_read ON public.scenarios FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL AND slug IS NOT NULL);
COMMENT ON TABLE public.scenarios IS 'Built-in seeded scenario catalog only; private custom practice lives in owner-only sessions.custom_practice_snapshot.';

-- Interventions: shared read-only method catalog (no owner data); signed-in read only, no writes.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.interventions FROM authenticated;
DROP POLICY IF EXISTS "Interventions are readable by authenticated users" ON public.interventions;
CREATE POLICY interventions_catalog_read ON public.interventions FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);
COMMENT ON TABLE public.interventions IS 'Shared read-only method catalog; a coach''s own chosen intervention is stored on their session.';