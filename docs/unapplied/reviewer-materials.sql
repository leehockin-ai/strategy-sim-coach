-- APPLIED as drizzle/migrations/0014_reviewer_materials.sql (Lee approved, Nov 2026).
CREATE TABLE public.reviewer_supplements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 session_id uuid NOT NULL UNIQUE REFERENCES public.sessions(id),
 evaluation_id uuid NOT NULL REFERENCES public.evaluations(id),
 owner_id uuid NOT NULL,
 request_id uuid NOT NULL,
 note text NOT NULL,
 files jsonb NOT NULL DEFAULT '[]',
 submitted_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reviewer_supplements TO authenticated;
GRANT SELECT, INSERT ON public.reviewer_supplements TO service_role;
ALTER TABLE public.reviewer_supplements ENABLE ROW LEVEL SECURITY;
CREATE POLICY supplements_owner ON public.reviewer_supplements FOR SELECT TO authenticated
 USING (owner_id=auth.uid() AND EXISTS(SELECT 1 FROM public.sessions s WHERE s.id=session_id AND s.owner_id=auth.uid()));
CREATE POLICY supplements_reviewer ON public.reviewer_supplements FOR SELECT TO authenticated
 USING ((public.has_role(auth.uid(),'reviewer') OR public.has_role(auth.uid(),'admin')) AND EXISTS(SELECT 1 FROM public.sessions s WHERE s.id=session_id AND s.scenario_id IS NOT NULL AND s.submission_requested_at IS NOT NULL));

CREATE FUNCTION public.submit_reviewer_materials(_session uuid,_owner uuid,_request uuid,_note text,_files jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.sessions%ROWTYPE; prior public.reviewer_supplements%ROWTYPE; ev uuid; f jsonb; stamp timestamptz;
BEGIN
 SELECT * INTO s FROM public.sessions WHERE id=_session FOR UPDATE;
 IF NOT FOUND OR s.owner_id IS DISTINCT FROM _owner OR s.scenario_id IS NULL THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 SELECT id INTO ev FROM public.evaluations WHERE session_id=_session;
 IF ev IS NULL THEN RAISE EXCEPTION 'Generate assessment first'; END IF;
 IF _request IS NULL OR _note IS NULL OR length(_note)>4000 OR jsonb_typeof(_files) IS DISTINCT FROM 'array' OR jsonb_array_length(_files)>3 THEN RAISE EXCEPTION 'Invalid supplementary materials'; END IF;
 FOR f IN SELECT value FROM jsonb_array_elements(_files) LOOP
  IF jsonb_typeof(f) IS DISTINCT FROM 'object' OR f->>'name' IS NULL OR length(f->>'name') NOT BETWEEN 1 AND 160 OR f->>'name' ~ '[/\\]' OR f->>'type' IS NULL OR f->>'type' NOT IN ('application/pdf','image/png','image/jpeg','image/webp') OR f->>'size' IS NULL OR (f->>'size')::integer NOT BETWEEN 1 AND 4194304 OR f->>'path' IS NULL OR f->>'path' NOT LIKE 'reviewer-supplements/'||_owner||'/'||_session||'/'||_request||'/%' THEN RAISE EXCEPTION 'Invalid supplementary file'; END IF;
 END LOOP;
 SELECT * INTO prior FROM public.reviewer_supplements WHERE session_id=_session;
 IF FOUND THEN
  IF prior.request_id IS DISTINCT FROM _request OR prior.note IS DISTINCT FROM _note OR prior.files IS DISTINCT FROM _files THEN RAISE EXCEPTION 'Submission is already frozen'; END IF;
  RETURN jsonb_build_object('alreadySubmitted',true,'submittedAt',prior.submitted_at);
 END IF;
 IF s.submission_requested_at IS NOT NULL THEN RAISE EXCEPTION 'Historical submission cannot be supplemented'; END IF;
 stamp:=now();
 INSERT INTO public.reviewer_supplements(session_id,evaluation_id,owner_id,request_id,note,files,submitted_at) VALUES(_session,ev,_owner,_request,_note,_files,stamp);
 UPDATE public.sessions SET submission_requested_at=stamp WHERE id=_session;
 RETURN jsonb_build_object('alreadySubmitted',false,'submittedAt',stamp);
END $$;
REVOKE ALL ON FUNCTION public.submit_reviewer_materials(uuid,uuid,uuid,text,jsonb) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_reviewer_materials(uuid,uuid,uuid,text,jsonb) TO service_role;

-- Existing private playbooks bucket is reused. Supplements start with a reserved
-- non-user folder, so existing owner-folder policies cannot grant raw access.
-- A restrictive fence also prevents any future permissive policy bypass.
CREATE POLICY reviewer_materials_server_only ON storage.objects AS RESTRICTIVE FOR ALL TO authenticated
 USING (bucket_id<>'playbooks' OR name NOT LIKE 'reviewer-supplements/%')
 WITH CHECK (bucket_id<>'playbooks' OR name NOT LIKE 'reviewer-supplements/%');

-- Capability installed LAST; install as one transaction, never partially.
CREATE FUNCTION public.reviewer_materials_capability() RETURNS integer LANGUAGE sql STABLE SET search_path=public AS $$ SELECT 1 $$;
REVOKE ALL ON FUNCTION public.reviewer_materials_capability() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reviewer_materials_capability() TO authenticated,service_role;