-- UNAPPLIED: approved source only. Do not install on the shared backend.
-- Additive private context on ordinary sessions; no custom rows in scenarios.
ALTER TABLE public.sessions ADD COLUMN custom_practice_snapshot jsonb;
ALTER TABLE public.sessions ADD COLUMN custom_practice_request uuid;
ALTER TABLE public.sessions ALTER COLUMN scenario_id DROP NOT NULL;
CREATE UNIQUE INDEX private_practice_start_identity ON public.sessions(owner_id, custom_practice_request) WHERE custom_practice_request IS NOT NULL;
ALTER TABLE public.sessions ADD CONSTRAINT session_scenario_identity CHECK (
 (scenario_id IS NOT NULL AND custom_practice_snapshot IS NULL AND custom_practice_request IS NULL)
 OR (scenario_id IS NULL AND custom_practice_snapshot IS NOT NULL AND custom_practice_request IS NOT NULL AND assignment_id IS NULL)
);

-- No draft table is needed: only explicitly approved public draft fields persist.
CREATE FUNCTION public.valid_private_practice_draft(d jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path=public AS $$
DECLARE k text; t jsonb;
BEGIN
 IF jsonb_typeof(d) IS DISTINCT FROM 'object' OR (SELECT count(*) FROM jsonb_object_keys(d)) <> 8 THEN RETURN false; END IF;
 FOREACH k IN ARRAY ARRAY['title','brief','tensions','scope','outcome','constraints','challenge'] LOOP
  IF jsonb_typeof(d->k) IS DISTINCT FROM 'string' THEN RETURN false; END IF;
  IF length(d->>k) > (CASE k WHEN 'title' THEN 160 WHEN 'brief' THEN 5000 ELSE 2000 END) THEN RETURN false; END IF;
 END LOOP;
 IF length(trim(d->>'title')) < 1 OR length(trim(d->>'brief')) < 20 OR jsonb_typeof(d->'team') IS DISTINCT FROM 'array' THEN RETURN false; END IF;
 IF jsonb_array_length(d->'team') NOT BETWEEN 2 AND 6 THEN RETURN false; END IF;
 FOR t IN SELECT value FROM jsonb_array_elements(d->'team') LOOP
  IF jsonb_typeof(t) IS DISTINCT FROM 'object' OR (SELECT count(*) FROM jsonb_object_keys(t)) <> 3 THEN RETURN false; END IF;
  FOREACH k IN ARRAY ARRAY['name','role','description'] LOOP
   IF jsonb_typeof(t->k) IS DISTINCT FROM 'string' OR length(t->>k) > (CASE k WHEN 'name' THEN 100 WHEN 'role' THEN 160 ELSE 1000 END) THEN RETURN false; END IF;
  END LOOP;
  IF length(trim(t->>'name')) < 1 OR length(trim(t->>'role')) < 1 THEN RETURN false; END IF;
 END LOOP;
 IF (SELECT count(DISTINCT lower(trim(value->>'name'))) FROM jsonb_array_elements(d->'team')) <> jsonb_array_length(d->'team') THEN RETURN false; END IF;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.valid_private_practice_draft(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.valid_private_practice_draft(jsonb) TO authenticated, service_role;

CREATE FUNCTION public.guard_private_practice_session() RETURNS trigger
LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF TG_OP='UPDATE' AND (NEW.custom_practice_snapshot IS DISTINCT FROM OLD.custom_practice_snapshot OR NEW.custom_practice_request IS DISTINCT FROM OLD.custom_practice_request OR NEW.scenario_id IS DISTINCT FROM OLD.scenario_id OR (OLD.custom_practice_snapshot IS NOT NULL AND NEW.owner_id IS DISTINCT FROM OLD.owner_id)) THEN
  RAISE EXCEPTION 'Session scenario identity and approved roster are immutable';
 END IF;
 IF NEW.custom_practice_snapshot IS NOT NULL THEN
  IF NOT public.valid_private_practice_draft(NEW.custom_practice_snapshot) OR NEW.assignment_id IS NOT NULL OR NEW.submission_requested_at IS NOT NULL OR NEW.status IN ('approved','conditional','not_approved','retry','escalated') THEN
   RAISE EXCEPTION 'Private practice is not certification';
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_private_practice BEFORE INSERT OR UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.guard_private_practice_session();

-- Security-definer existence checks avoid recursive session policies and reveal
-- only access/eligibility, never private text. Owners cannot read hidden state.
CREATE FUNCTION public.private_practice_access(_session uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.sessions WHERE id=_session AND (custom_practice_snapshot IS NULL OR owner_id=auth.uid()));
$$;
CREATE FUNCTION public.standardized_session(_session uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.sessions WHERE id=_session AND custom_practice_snapshot IS NULL);
$$;
REVOKE ALL ON FUNCTION public.private_practice_access(uuid), public.standardized_session(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.private_practice_access(uuid), public.standardized_session(uuid) TO authenticated, service_role;

-- RESTRICTIVE policies intersect EVERY existing permissive owner/reviewer policy.
CREATE POLICY private_session_boundary ON public.sessions AS RESTRICTIVE FOR ALL TO authenticated
 USING (custom_practice_snapshot IS NULL OR owner_id=auth.uid()) WITH CHECK(custom_practice_snapshot IS NULL OR owner_id=auth.uid());
CREATE POLICY private_message_boundary ON public.messages AS RESTRICTIVE FOR ALL TO authenticated
 USING(public.private_practice_access(session_id)) WITH CHECK(public.private_practice_access(session_id));
CREATE POLICY private_evaluation_boundary ON public.evaluations AS RESTRICTIVE FOR ALL TO authenticated
 USING(public.private_practice_access(session_id)) WITH CHECK(public.private_practice_access(session_id));
CREATE POLICY private_scope_boundary ON public.scope_revisions AS RESTRICTIVE FOR ALL TO authenticated
 USING(public.private_practice_access(session_id)) WITH CHECK(public.private_practice_access(session_id));
CREATE POLICY private_submission_boundary ON public.scope_submissions AS RESTRICTIVE FOR ALL TO authenticated
 USING(public.private_practice_access(session_id)) WITH CHECK(public.private_practice_access(session_id));
CREATE POLICY private_hidden_state_boundary ON public.stakeholder_states AS RESTRICTIVE FOR ALL TO authenticated
 USING(public.standardized_session(session_id)) WITH CHECK(public.standardized_session(session_id));
-- Custom practice uses the normal transcript, never an external activity runtime.
CREATE POLICY private_run_boundary ON public.activity_runs AS RESTRICTIVE FOR ALL TO authenticated
 USING(public.standardized_session(session_id)) WITH CHECK(public.standardized_session(session_id));
CREATE POLICY private_event_boundary ON public.activity_events AS RESTRICTIVE FOR ALL TO authenticated
 USING(EXISTS(SELECT 1 FROM public.activity_runs r WHERE r.id=run_id AND public.standardized_session(r.session_id)))
 WITH CHECK(EXISTS(SELECT 1 FROM public.activity_runs r WHERE r.id=run_id AND public.standardized_session(r.session_id)));
CREATE POLICY private_artifact_boundary ON public.activity_artifact_history AS RESTRICTIVE FOR ALL TO authenticated
 USING(EXISTS(SELECT 1 FROM public.activity_runs r WHERE r.id=run_id AND public.standardized_session(r.session_id)))
 WITH CHECK(EXISTS(SELECT 1 FROM public.activity_runs r WHERE r.id=run_id AND public.standardized_session(r.session_id)));
CREATE POLICY private_connection_boundary ON public.activity_external_connections AS RESTRICTIVE FOR ALL TO authenticated
 USING(EXISTS(SELECT 1 FROM public.activity_runs r WHERE r.id=run_id AND public.standardized_session(r.session_id)))
 WITH CHECK(EXISTS(SELECT 1 FROM public.activity_runs r WHERE r.id=run_id AND public.standardized_session(r.session_id)));

CREATE FUNCTION public.guard_private_practice_review() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NOT public.standardized_session(NEW.session_id) AND (NEW.reviewer_decision IS NOT NULL OR NEW.reviewer_name IS NOT NULL OR NEW.reviewed_at IS NOT NULL OR NEW.reviewer_notes IS NOT NULL OR NEW.internal_notes IS NOT NULL OR NEW.per_section_overrides <> '{}'::jsonb) THEN
  RAISE EXCEPTION 'Private practice cannot receive certification review';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_private_practice_review BEFORE INSERT OR UPDATE ON public.evaluations FOR EACH ROW EXECUTE FUNCTION public.guard_private_practice_review();

-- Preserve the standardized initialization branch; only new custom sessions seed
-- their own frozen roster. No history is backfilled or synthesized.
CREATE OR REPLACE FUNCTION public.seed_new_session_stakeholder_states() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.custom_practice_snapshot IS NOT NULL THEN
  INSERT INTO public.stakeholder_states(session_id, stakeholder_id, engagement, trust, guardedness, turn_index, reasoning)
  SELECT NEW.id, participant->>'name','medium','medium','measured',0,'initial state'
  FROM jsonb_array_elements(NEW.custom_practice_snapshot->'team') participant
  ON CONFLICT(session_id,stakeholder_id,turn_index) DO NOTHING;
 ELSE
  INSERT INTO public.stakeholder_states(session_id, stakeholder_id, engagement, trust, guardedness, turn_index, reasoning)
  SELECT NEW.id, participant->>'name','medium','medium','measured',0,'initial state'
  FROM public.scenarios s CROSS JOIN LATERAL jsonb_array_elements(s.stakeholders) participant
  WHERE s.id=NEW.scenario_id AND nullif(participant->>'name','') IS NOT NULL
  ON CONFLICT(session_id,stakeholder_id,turn_index) DO NOTHING;
 END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION public.start_private_practice(_request uuid, _draft jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.sessions; u uuid:=auth.uid();
BEGIN
 IF u IS NULL OR _request IS NULL OR NOT public.valid_private_practice_draft(_draft) THEN RAISE EXCEPTION 'Invalid private practice start'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(u::text||':'||_request::text,0));
 SELECT * INTO s FROM public.sessions WHERE owner_id=u AND custom_practice_request=_request;
 IF FOUND THEN
  IF s.custom_practice_snapshot IS DISTINCT FROM _draft THEN RAISE EXCEPTION 'Start identity reused with different approved draft'; END IF;
  RETURN to_jsonb(s);
 END IF;
 INSERT INTO public.sessions(owner_id,scenario_id,candidate_name,candidate_email,status,custom_practice_request,custom_practice_snapshot)
 VALUES(u,NULL,'Practice coach',coalesce(auth.jwt()->>'email',''),'framing',_request,_draft) RETURNING * INTO s;
 RETURN to_jsonb(s);
END $$;
REVOKE ALL ON FUNCTION public.start_private_practice(uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_private_practice(uuid,jsonb) TO authenticated;
-- Install this version marker last: missing/partial schema always fails closed.
CREATE FUNCTION public.private_practice_capability() RETURNS integer LANGUAGE sql STABLE SET search_path=public AS $$ SELECT 1; $$;
REVOKE ALL ON FUNCTION public.private_practice_capability() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.private_practice_capability() TO authenticated;
