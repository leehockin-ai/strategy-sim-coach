REVOKE ALL ON public.scope_revisions FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.scope_revisions TO authenticated;
GRANT ALL ON public.scope_revisions TO service_role;
REVOKE ALL ON public.scope_submissions FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.scope_submissions TO authenticated;
GRANT ALL ON public.scope_submissions TO service_role;
COMMENT ON TABLE public.scope_revisions IS 'Append-only Scope evidence snapshots created atomically on candidate edits. Explicit candidate read-only grants and owner/reviewer SELECT policies. No historical backfill. Future chapter submission references a frozen revision.';