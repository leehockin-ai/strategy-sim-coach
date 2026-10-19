REVOKE SELECT ON public.evaluations FROM anon, authenticated;
DO $$ DECLARE safe_columns text; BEGIN
 SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position) INTO safe_columns FROM information_schema.columns WHERE table_schema='public' AND table_name='evaluations' AND column_name <> 'internal_notes';
 EXECUTE 'GRANT SELECT (' || safe_columns || ') ON public.evaluations TO authenticated';
END $$;
REVOKE SELECT (internal_notes) ON public.evaluations FROM anon, authenticated;
GRANT ALL ON public.evaluations TO service_role;
COMMENT ON COLUMN public.evaluations.internal_notes IS 'Private reviewer notes; read and write only through role-verified server paths. Not available via candidate/owner Data API reads.';