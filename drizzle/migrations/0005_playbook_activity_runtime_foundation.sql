CREATE TABLE public.activity_definitions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), activity_key text NOT NULL, version integer NOT NULL CHECK(version > 0), intervention_id uuid NOT NULL REFERENCES public.interventions(id), title text NOT NULL, objective text NOT NULL, instructions text NOT NULL, methodology_reference jsonb NOT NULL DEFAULT '{}', expected_inputs jsonb NOT NULL DEFAULT '[]', workspace_type text NOT NULL, workspace_config jsonb NOT NULL DEFAULT '{}', intended_output text NOT NULL, prerequisites jsonb NOT NULL DEFAULT '[]', suggested_duration_minutes integer CHECK(suggested_duration_minutes > 0), stop_conditions jsonb NOT NULL DEFAULT '[]', sort_order integer NOT NULL DEFAULT 0, status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','retired')), test_only boolean NOT NULL DEFAULT false, methodology_approved boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(activity_key,version), CHECK(test_only OR status <> 'active' OR methodology_approved)
);
GRANT SELECT ON public.activity_definitions TO authenticated;
GRANT ALL ON public.activity_definitions TO service_role;
ALTER TABLE public.activity_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY activity_definition_approved_read ON public.activity_definitions FOR SELECT TO authenticated USING(status='active' AND methodology_approved AND NOT test_only);
CREATE POLICY activity_definition_reviewer_read ON public.activity_definitions FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'reviewer') OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.activity_runtime_test_access (
 session_id uuid PRIMARY KEY REFERENCES public.sessions(id) ON DELETE CASCADE, candidate_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.activity_runtime_test_access TO service_role;
ALTER TABLE public.activity_runtime_test_access ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.activity_runtime_test_access FROM anon,authenticated;
CREATE FUNCTION public.activity_runtime_test_allowed(_session uuid, _candidate uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.activity_runtime_test_access t JOIN public.sessions s ON s.id=t.session_id WHERE t.session_id=_session AND t.candidate_id=_candidate AND s.owner_id=_candidate AND s.candidate_name LIKE 'TEST/NON-PRODUCTION%') $$;
REVOKE ALL ON FUNCTION public.activity_runtime_test_allowed(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.activity_runtime_test_allowed(uuid,uuid) TO authenticated,service_role;
CREATE POLICY activity_definition_test_read ON public.activity_definitions FOR SELECT TO authenticated USING(test_only AND EXISTS(SELECT 1 FROM public.sessions s WHERE s.owner_id=auth.uid() AND public.activity_runtime_test_allowed(s.id,auth.uid())));

CREATE TABLE public.activity_simulation_truth (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), scenario_id uuid NOT NULL REFERENCES public.scenarios(id), activity_definition_id uuid NOT NULL REFERENCES public.activity_definitions(id), version integer NOT NULL CHECK(version>0), truth jsonb NOT NULL DEFAULT '{}', participant_knowledge jsonb NOT NULL DEFAULT '{}', participant_motivations jsonb NOT NULL DEFAULT '{}', reveal_conditions jsonb NOT NULL DEFAULT '[]', challenge_moments jsonb NOT NULL DEFAULT '[]', created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(scenario_id,activity_definition_id,version)
);
GRANT ALL ON public.activity_simulation_truth TO service_role;
ALTER TABLE public.activity_simulation_truth ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.activity_simulation_truth FROM anon,authenticated;

CREATE TABLE public.activity_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE, candidate_id uuid NOT NULL, scenario_id uuid NOT NULL REFERENCES public.scenarios(id), intervention_id uuid NOT NULL REFERENCES public.interventions(id), intervention_slug text NOT NULL, activity_definition_id uuid NOT NULL REFERENCES public.activity_definitions(id), activity_version integer NOT NULL, definition_snapshot jsonb NOT NULL, scope_revision_id uuid REFERENCES public.scope_revisions(id), scope_context jsonb NOT NULL DEFAULT '{}', status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','completed','stopped')), started_at timestamptz NOT NULL DEFAULT now(), ended_at timestamptz, artifact_state jsonb NOT NULL DEFAULT '{}', artifact_revision integer NOT NULL DEFAULT 0, stop_state jsonb NOT NULL DEFAULT '{}', candidate_stop_rationale text, simulation_version integer NOT NULL DEFAULT 1, simulation_config jsonb NOT NULL DEFAULT '{}', time_budget_seconds integer, elapsed_simulated_seconds integer, last_sequence integer NOT NULL DEFAULT 0, start_request_key uuid NOT NULL, UNIQUE(session_id,start_request_key)
);
GRANT SELECT ON public.activity_runs TO authenticated;
GRANT ALL ON public.activity_runs TO service_role;
ALTER TABLE public.activity_runs ENABLE ROW LEVEL SECURITY;
REVOKE INSERT,UPDATE,DELETE ON public.activity_runs FROM authenticated,anon;
CREATE POLICY activity_run_owner_read ON public.activity_runs FOR SELECT TO authenticated USING(candidate_id=auth.uid() AND EXISTS(SELECT 1 FROM public.sessions s WHERE s.id=session_id AND s.owner_id=auth.uid()));
CREATE POLICY activity_run_reviewer_read ON public.activity_runs FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'reviewer') OR public.has_role(auth.uid(),'admin'));
CREATE INDEX activity_runs_session_idx ON public.activity_runs(session_id,started_at);

CREATE TABLE public.activity_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), run_id uuid NOT NULL REFERENCES public.activity_runs(id) ON DELETE CASCADE, sequence integer NOT NULL, event_type text NOT NULL CHECK(event_type IN ('coach_message','team_response','methodology_explanation','artifact_contribution','artifact_edit','evidence_surfaced','assumption_surfaced','ambiguity_flagged','ambiguity_resolved','participant_state_change','activity_transition','time_charged','synthesis','decision','candidate_stop','system_event')), actor_type text NOT NULL CHECK(actor_type IN ('coach','team','system')), actor_id text, content text NOT NULL DEFAULT '', metadata jsonb NOT NULL DEFAULT '{}', occurred_at timestamptz NOT NULL DEFAULT now(), simulated_time_seconds integer, time_category text, evidence_reference text NOT NULL, request_key uuid NOT NULL, request_payload jsonb NOT NULL, message_id uuid REFERENCES public.messages(id), UNIQUE(run_id,sequence), UNIQUE(run_id,request_key), UNIQUE(id,run_id)
);
GRANT SELECT(id,run_id,sequence,event_type,actor_type,actor_id,content,metadata,occurred_at,simulated_time_seconds,time_category,evidence_reference,message_id) ON public.activity_events TO authenticated;
GRANT ALL ON public.activity_events TO service_role;
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;
REVOKE INSERT,UPDATE,DELETE ON public.activity_events FROM authenticated,anon;
CREATE POLICY activity_event_owner_read ON public.activity_events FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.activity_runs r JOIN public.sessions s ON s.id=r.session_id WHERE r.id=run_id AND r.candidate_id=auth.uid() AND s.owner_id=auth.uid()));
CREATE POLICY activity_event_reviewer_read ON public.activity_events FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'reviewer') OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.activity_artifact_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), run_id uuid NOT NULL REFERENCES public.activity_runs(id) ON DELETE CASCADE, event_id uuid NOT NULL, revision integer NOT NULL, state jsonb NOT NULL, actor_type text NOT NULL CHECK(actor_type IN ('coach','team','system')), actor_id text, confidence text CHECK(confidence IN ('unknown','low','medium','high')), unresolved_ambiguity boolean NOT NULL DEFAULT false, contribution jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), FOREIGN KEY(event_id,run_id) REFERENCES public.activity_events(id,run_id) ON DELETE CASCADE, UNIQUE(run_id,revision), UNIQUE(event_id)
);
GRANT SELECT ON public.activity_artifact_history TO authenticated;
GRANT ALL ON public.activity_artifact_history TO service_role;
ALTER TABLE public.activity_artifact_history ENABLE ROW LEVEL SECURITY;
REVOKE INSERT,UPDATE,DELETE ON public.activity_artifact_history FROM authenticated,anon;
CREATE POLICY activity_artifact_owner_read ON public.activity_artifact_history FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.activity_runs r JOIN public.sessions s ON s.id=r.session_id WHERE r.id=run_id AND r.candidate_id=auth.uid() AND s.owner_id=auth.uid()));
CREATE POLICY activity_artifact_reviewer_read ON public.activity_artifact_history FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'reviewer') OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.activity_event_private (
 event_id uuid PRIMARY KEY REFERENCES public.activity_events(id) ON DELETE CASCADE, reviewer_metadata jsonb NOT NULL DEFAULT '{}', evaluator_metadata jsonb NOT NULL DEFAULT '{}', participant_state jsonb NOT NULL DEFAULT '{}'
);
GRANT ALL ON public.activity_event_private TO service_role;
ALTER TABLE public.activity_event_private ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.activity_event_private FROM anon,authenticated;
CREATE TABLE public.activity_run_private (
 run_id uuid PRIMARY KEY REFERENCES public.activity_runs(id) ON DELETE CASCADE, simulation_truth_id uuid REFERENCES public.activity_simulation_truth(id), participant_state jsonb NOT NULL DEFAULT '{}', internal_configuration jsonb NOT NULL DEFAULT '{}'
);
GRANT ALL ON public.activity_run_private TO service_role;
ALTER TABLE public.activity_run_private ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.activity_run_private FROM anon,authenticated;

CREATE FUNCTION public.start_activity_run(_session uuid,_definition uuid,_request uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.sessions%ROWTYPE; d public.activity_definitions%ROWTYPE; r public.activity_runs%ROWTYPE; rid uuid; slug text; revision_id uuid; truth_id uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 SELECT * INTO s FROM public.sessions WHERE id=_session FOR UPDATE;
 IF NOT FOUND OR s.owner_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 SELECT * INTO r FROM public.activity_runs WHERE session_id=_session AND start_request_key=_request;
 IF FOUND THEN IF r.activity_definition_id<>_definition THEN RAISE EXCEPTION 'Idempotency key reused with different activity'; END IF; RETURN r.id; END IF;
 SELECT * INTO d FROM public.activity_definitions WHERE id=_definition;
 IF NOT FOUND OR d.status<>'active' OR (d.test_only AND NOT public.activity_runtime_test_allowed(_session,auth.uid())) OR (NOT d.test_only AND NOT d.methodology_approved) THEN RAISE EXCEPTION 'Activity unavailable' USING ERRCODE='42501'; END IF;
 SELECT i.slug INTO slug FROM public.interventions i WHERE i.id=d.intervention_id;
 IF s.chosen_intervention_slug IS DISTINCT FROM slug THEN RAISE EXCEPTION 'Activity must match the committed primary intervention'; END IF;
 SELECT id INTO revision_id FROM public.scope_revisions WHERE session_id=_session AND revision=s.scope_revision;
 INSERT INTO public.activity_runs(session_id,candidate_id,scenario_id,intervention_id,intervention_slug,activity_definition_id,activity_version,definition_snapshot,scope_revision_id,scope_context,start_request_key)
 VALUES(_session,auth.uid(),s.scenario_id,d.intervention_id,slug,d.id,d.version,to_jsonb(d)-'created_at',revision_id,jsonb_build_object('primary_intervention',slug,'candidate_rationale',s.intervention_rationale,'sequence_context',coalesce(s.engagement_brief->'intervention_sequence','[]'::jsonb),'scope_revision',s.scope_revision),_request) RETURNING id INTO rid;
 SELECT id INTO truth_id FROM public.activity_simulation_truth WHERE scenario_id=s.scenario_id AND activity_definition_id=d.id ORDER BY version DESC LIMIT 1;
 INSERT INTO public.activity_run_private(run_id,simulation_truth_id) VALUES(rid,truth_id);
 RETURN rid;
END $$;
REVOKE ALL ON FUNCTION public.start_activity_run(uuid,uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.start_activity_run(uuid,uuid,uuid) TO authenticated;

CREATE FUNCTION public.append_activity_event(_run uuid,_request uuid,_type text,_content text,_artifact jsonb DEFAULT NULL,_expected_revision integer DEFAULT NULL,_confidence text DEFAULT 'unknown',_ambiguity boolean DEFAULT false) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.activity_runs%ROWTYPE; prior public.activity_events%ROWTYPE; payload jsonb; eid uuid; next_seq integer;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 SELECT * INTO r FROM public.activity_runs WHERE id=_run FOR UPDATE;
 IF NOT FOUND OR r.candidate_id IS DISTINCT FROM auth.uid() OR NOT EXISTS(SELECT 1 FROM public.sessions s WHERE s.id=r.session_id AND s.owner_id=auth.uid()) THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 payload:=jsonb_build_object('type',_type,'content',_content,'artifact',_artifact,'expected_revision',_expected_revision,'confidence',_confidence,'ambiguity',_ambiguity);
 SELECT * INTO prior FROM public.activity_events WHERE run_id=_run AND request_key=_request;
 IF FOUND THEN IF prior.request_payload IS DISTINCT FROM payload THEN RAISE EXCEPTION 'Idempotency key reused with different event'; END IF; RETURN prior.id; END IF;
 IF r.status<>'active' THEN RAISE EXCEPTION 'Activity run has ended'; END IF;
 IF _type NOT IN ('coach_message','artifact_edit','artifact_contribution','evidence_surfaced','assumption_surfaced','ambiguity_flagged','ambiguity_resolved','synthesis','decision','candidate_stop') THEN RAISE EXCEPTION 'Candidate event type not permitted' USING ERRCODE='42501'; END IF;
 IF _content IS NULL OR length(_content)>8000 OR (_type='candidate_stop' AND length(trim(_content))=0) THEN RAISE EXCEPTION 'Invalid event content'; END IF;
 IF _confidence NOT IN ('unknown','low','medium','high') OR _ambiguity IS NULL THEN RAISE EXCEPTION 'Invalid artifact confidence'; END IF;
 IF (_type IN ('artifact_edit','artifact_contribution')) IS DISTINCT FROM (_artifact IS NOT NULL) THEN RAISE EXCEPTION 'Artifact change must be associated with an artifact event'; END IF;
 IF _artifact IS NOT NULL THEN
  IF jsonb_typeof(_artifact)<>'object' OR octet_length(_artifact::text)>100000 OR _expected_revision IS DISTINCT FROM r.artifact_revision THEN RAISE EXCEPTION 'Artifact conflict or invalid artifact; reload before saving'; END IF;
 END IF;
 next_seq:=r.last_sequence+1; eid:=gen_random_uuid();
 INSERT INTO public.activity_events(id,run_id,sequence,event_type,actor_type,actor_id,content,metadata,evidence_reference,request_key,request_payload) VALUES(eid,_run,next_seq,_type,'coach',auth.uid()::text,_content,jsonb_build_object('artifact_revision',CASE WHEN _artifact IS NOT NULL THEN r.artifact_revision+1 ELSE NULL END),'activity-run:'||_run||':event:'||next_seq,_request,payload);
 IF _artifact IS NOT NULL THEN
  INSERT INTO public.activity_artifact_history(run_id,event_id,revision,state,actor_type,actor_id,confidence,unresolved_ambiguity,contribution) VALUES(_run,eid,r.artifact_revision+1,_artifact,'coach',auth.uid()::text,_confidence,_ambiguity,jsonb_build_object('summary',_content));
  UPDATE public.activity_runs SET artifact_state=_artifact,artifact_revision=artifact_revision+1 WHERE id=_run;
 END IF;
 UPDATE public.activity_runs SET last_sequence=next_seq,status=CASE WHEN _type='candidate_stop' THEN 'stopped' ELSE status END,ended_at=CASE WHEN _type='candidate_stop' THEN now() ELSE ended_at END,candidate_stop_rationale=CASE WHEN _type='candidate_stop' THEN _content ELSE candidate_stop_rationale END,stop_state=CASE WHEN _type='candidate_stop' THEN jsonb_build_object('event_id',eid,'reason',_content) ELSE stop_state END WHERE id=_run;
 RETURN eid;
END $$;
REVOKE ALL ON FUNCTION public.append_activity_event(uuid,uuid,text,text,jsonb,integer,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.append_activity_event(uuid,uuid,text,text,jsonb,integer,text,boolean) TO authenticated;

CREATE FUNCTION public.guard_activity_definition_version() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN IF EXISTS(SELECT 1 FROM public.activity_runs WHERE activity_definition_id=OLD.id) AND (to_jsonb(NEW)-'status') IS DISTINCT FROM (to_jsonb(OLD)-'status') THEN RAISE EXCEPTION 'Used activity versions are immutable; configure a new version'; END IF; RETURN NEW; END $$;
CREATE TRIGGER activity_definition_version_guard BEFORE UPDATE ON public.activity_definitions FOR EACH ROW EXECUTE FUNCTION public.guard_activity_definition_version();
COMMENT ON TABLE public.activity_simulation_truth IS 'Private server-only scenario/activity reality; never project into candidate payloads.';
COMMENT ON TABLE public.activity_event_private IS 'Reviewer/evaluator annotations and private participant state are server-only; event metadata is candidate-visible.';
COMMENT ON TABLE public.activity_runtime_test_access IS 'Explicit server-managed allowlist for marked disposable technical sessions only; test activities are unavailable in ordinary certification sessions.';
COMMENT ON COLUMN public.activity_runs.simulation_config IS 'Public configuration only; internal configuration lives in activity_run_private. Time fields are reserved, no Stage 3 timing rules.';
COMMENT ON COLUMN public.activity_events.message_id IS 'Reserved linkage to existing stakeholder/team messages for future shared transcript; no new chat engine.';