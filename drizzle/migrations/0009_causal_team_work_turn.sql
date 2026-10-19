CREATE OR REPLACE FUNCTION public.append_team_work_turn(_run uuid,_candidate uuid,_request uuid,_identity jsonb,_expected_sequence integer,_expected_revision integer,_events jsonb,_participant_state jsonb DEFAULT NULL,_internal jsonb DEFAULT NULL,_artifact jsonb DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.activity_runs%ROWTYPE; prior public.activity_events%ROWTYPE; result jsonb; artifact_event uuid; instruction_event uuid;
BEGIN
 SELECT * INTO r FROM public.activity_runs WHERE id=_run FOR UPDATE;
 IF NOT FOUND OR r.candidate_id IS DISTINCT FROM _candidate OR r.runtime_type<>'strategyzer_external' OR NOT EXISTS(SELECT 1 FROM public.sessions s WHERE s.id=r.session_id AND s.owner_id=_candidate) THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 SELECT * INTO prior FROM public.activity_events WHERE run_id=_run AND request_key=_request;
 IF FOUND THEN
  IF prior.request_payload->'identity' IS DISTINCT FROM _identity THEN RAISE EXCEPTION 'Idempotency key reused with different request'; END IF;
  RETURN jsonb_build_object('duplicate',true);
 END IF;
 IF r.status<>'active' OR r.last_sequence IS DISTINCT FROM _expected_sequence OR r.artifact_revision IS DISTINCT FROM _expected_revision THEN RAISE EXCEPTION 'Working session changed; reload before continuing' USING ERRCODE='40001'; END IF;
 IF jsonb_typeof(_events)<>'array' OR jsonb_array_length(_events)<1 OR jsonb_array_length(_events)>6 THEN RAISE EXCEPTION 'Invalid team event batch'; END IF;
 IF _artifact IS NOT NULL THEN
  IF NOT public.activity_runtime_test_allowed(r.session_id,_candidate) THEN RAISE EXCEPTION 'Simulated work requires a disposable POC session' USING ERRCODE='42501'; END IF;
  IF jsonb_typeof(_artifact)<>'object' OR octet_length(_artifact::text)>100000 OR _artifact->>'provenance' IS DISTINCT FROM 'simulated_client_team' OR _artifact->>'status' NOT IN ('complete','partial','revised','unresolved','stopped_intentionally') OR jsonb_typeof(_artifact->'sections') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Invalid simulated work'; END IF;
  IF (_events->(jsonb_array_length(_events)-1)->>'actor') IS DISTINCT FROM 'team' OR (_events->(jsonb_array_length(_events)-1)->>'type') NOT IN ('artifact_contribution','artifact_edit') THEN RAISE EXCEPTION 'Team work requires a team artifact event'; END IF;
 END IF;
 result:=public.append_team_events(_run,_request,_events,_participant_state,_internal);
 SELECT id INTO instruction_event FROM public.activity_events WHERE run_id=_run AND request_key=_request;
 UPDATE public.activity_events SET request_payload=request_payload||jsonb_build_object('identity',_identity) WHERE id=instruction_event;
 IF _artifact IS NOT NULL THEN
  SELECT id INTO artifact_event FROM public.activity_events WHERE run_id=_run AND sequence=_expected_sequence+jsonb_array_length(_events);
  INSERT INTO public.activity_artifact_history(run_id,event_id,revision,state,actor_type,actor_id,confidence,unresolved_ambiguity,contribution)
  VALUES(_run,artifact_event,r.artifact_revision+1,_artifact,'team','client_team','unknown',_artifact->>'status' IN ('partial','unresolved','stopped_intentionally'),jsonb_build_object('provenance','simulated_client_team','instruction_event_id',instruction_event,'base_revision',r.artifact_revision));
  UPDATE public.activity_runs SET artifact_state=_artifact,artifact_revision=r.artifact_revision+1 WHERE id=_run;
 END IF;
 RETURN result||jsonb_build_object('revision',r.artifact_revision+CASE WHEN _artifact IS NOT NULL THEN 1 ELSE 0 END);
END $$;
REVOKE ALL ON FUNCTION public.append_team_work_turn(uuid,uuid,uuid,jsonb,integer,integer,jsonb,jsonb,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.append_team_work_turn(uuid,uuid,uuid,jsonb,integer,integer,jsonb,jsonb,jsonb,jsonb) TO service_role;
COMMENT ON FUNCTION public.append_team_work_turn(uuid,uuid,uuid,jsonb,integer,integer,jsonb,jsonb,jsonb,jsonb) IS 'Server-owned causal POC turn: owner check, stable request identity, optimistic sequence/revision and atomic event-linked simulated work. Does not read or change Strategyzer state.';
CREATE OR REPLACE FUNCTION public.guard_external_team_artifact() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.event_type IN ('artifact_edit','artifact_contribution') AND NEW.actor_type<>'team' AND EXISTS(SELECT 1 FROM public.activity_runs WHERE id=NEW.run_id AND runtime_type='strategyzer_external') THEN RAISE EXCEPTION 'Simulated client team work cannot be edited by the candidate' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER external_team_artifact_owner BEFORE INSERT ON public.activity_events FOR EACH ROW EXECUTE FUNCTION public.guard_external_team_artifact();