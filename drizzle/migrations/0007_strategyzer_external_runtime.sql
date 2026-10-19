ALTER TABLE public.activity_runs ALTER COLUMN activity_definition_id DROP NOT NULL;
ALTER TABLE public.activity_runs ALTER COLUMN activity_version DROP NOT NULL;
ALTER TABLE public.activity_runs ADD COLUMN runtime_type text NOT NULL DEFAULT 'coach_compass' CHECK (runtime_type IN ('coach_compass','strategyzer_external'));
ALTER TABLE public.activity_runs ADD COLUMN assessment_reference text UNIQUE;
ALTER TABLE public.activity_runs ADD COLUMN external_platform text CHECK (external_platform IS NULL OR external_platform='strategyzer_playbook_library');
ALTER TABLE public.activity_runs ADD COLUMN required_project_name text;
ALTER TABLE public.activity_runs ADD COLUMN integration_capability_level smallint CHECK (integration_capability_level BETWEEN 0 AND 4);
ALTER TABLE public.activity_runs ADD CONSTRAINT activity_runs_runtime_shape CHECK (
 (runtime_type='coach_compass' AND activity_definition_id IS NOT NULL AND activity_version IS NOT NULL)
 OR (runtime_type='strategyzer_external' AND assessment_reference IS NOT NULL AND required_project_name IS NOT NULL AND external_platform IS NOT NULL AND integration_capability_level IS NOT NULL));
COMMENT ON COLUMN public.activity_runs.integration_capability_level IS '0 Linked (candidate-supplied URL only), 1 Verified, 2 Observable, 3 Participatory, 4 Embedded. Only level 0 is implemented.';

CREATE SEQUENCE public.activity_assessment_reference_seq START 1001;
REVOKE ALL ON SEQUENCE public.activity_assessment_reference_seq FROM PUBLIC,anon,authenticated;

CREATE TABLE public.external_runtime_allowed_hosts (
 host_suffix text PRIMARY KEY CHECK (host_suffix ~ '^[a-z0-9.-]+\.[a-z]{2,}$'), platform text NOT NULL DEFAULT 'strategyzer_playbook_library', enabled boolean NOT NULL DEFAULT true, note text, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.external_runtime_allowed_hosts TO authenticated;
GRANT ALL ON public.external_runtime_allowed_hosts TO service_role;
ALTER TABLE public.external_runtime_allowed_hosts ENABLE ROW LEVEL SECURITY;
CREATE POLICY external_hosts_read ON public.external_runtime_allowed_hosts FOR SELECT TO authenticated USING (enabled);
COMMENT ON TABLE public.external_runtime_allowed_hosts IS 'Server-managed allowlist of external runtime hostnames; a host matches its suffix exactly or as a subdomain.';

CREATE TABLE public.activity_external_connections (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), run_id uuid NOT NULL REFERENCES public.activity_runs(id) ON DELETE CASCADE, version integer NOT NULL CHECK (version>0),
 supplied_url text NOT NULL, launch_url text NOT NULL, host text NOT NULL,
 candidate_confirmed_project boolean NOT NULL, candidate_confirmed_name boolean NOT NULL, candidate_confirmed_playbook boolean NOT NULL,
 confirmed_project_name text, confirmed_playbook_title text,
 verification_status text NOT NULL DEFAULT 'candidate_confirmed' CHECK (verification_status IN ('candidate_confirmed','strategyzer_verified')),
 status text NOT NULL DEFAULT 'connected' CHECK (status IN ('connected','superseded')),
 connected_at timestamptz NOT NULL DEFAULT now(), superseded_at timestamptz, event_id uuid NOT NULL, request_key uuid NOT NULL,
 UNIQUE(run_id,version), UNIQUE(run_id,request_key)
);
CREATE UNIQUE INDEX activity_external_one_current ON public.activity_external_connections(run_id) WHERE status='connected';
GRANT SELECT ON public.activity_external_connections TO authenticated;
GRANT ALL ON public.activity_external_connections TO service_role;
ALTER TABLE public.activity_external_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY external_conn_owner_read ON public.activity_external_connections FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.activity_runs r JOIN public.sessions s ON s.id=r.session_id WHERE r.id=run_id AND r.candidate_id=auth.uid() AND s.owner_id=auth.uid()));
CREATE POLICY external_conn_reviewer_read ON public.activity_external_connections FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'reviewer') OR public.has_role(auth.uid(),'admin'));
COMMENT ON TABLE public.activity_external_connections IS 'Append-only connection history; changes supersede, never overwrite. Level 0 rows are candidate-confirmed, not system-verified.';

CREATE FUNCTION public.insert_activity_run_event(_run uuid,_request uuid,_actor text,_content text,_metadata jsonb,_payload jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE seq integer; eid uuid := gen_random_uuid();
BEGIN
 UPDATE public.activity_runs SET last_sequence=last_sequence+1 WHERE id=_run RETURNING last_sequence INTO seq;
 INSERT INTO public.activity_events(id,run_id,sequence,event_type,actor_type,actor_id,content,metadata,evidence_reference,request_key,request_payload)
 VALUES(eid,_run,seq,'system_event',_actor,CASE WHEN _actor='coach' THEN auth.uid()::text END,_content,_metadata,'activity-run:'||_run||':event:'||seq,_request,_payload);
 RETURN eid;
END $$;
REVOKE ALL ON FUNCTION public.insert_activity_run_event(uuid,uuid,text,text,jsonb,jsonb) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.start_strategyzer_run(_session uuid,_request uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.sessions%ROWTYPE; r public.activity_runs%ROWTYPE; i public.interventions%ROWTYPE; rid uuid; ref text; display text; last_name text; pname text; revision_id uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 SELECT * INTO s FROM public.sessions WHERE id=_session FOR UPDATE;
 IF NOT FOUND OR s.owner_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 SELECT * INTO r FROM public.activity_runs WHERE session_id=_session AND start_request_key=_request;
 IF FOUND THEN IF r.runtime_type<>'strategyzer_external' THEN RAISE EXCEPTION 'Idempotency key reused with different activity'; END IF; RETURN r.id; END IF;
 SELECT * INTO i FROM public.interventions WHERE slug=s.chosen_intervention_slug;
 IF NOT FOUND OR i.pathway_type<>'playbook' THEN RAISE EXCEPTION 'Commit to a Strategyzer Playbook intervention in Scope first'; END IF;
 IF EXISTS (SELECT 1 FROM public.activity_runs WHERE session_id=_session AND runtime_type='strategyzer_external' AND status='active') THEN RAISE EXCEPTION 'This engagement already has an active Strategyzer assessment workspace'; END IF;
 SELECT coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'),''), nullif(trim(u.raw_user_meta_data->>'name'),''), nullif(trim(s.candidate_name),''), split_part(u.email,'@',1))
   INTO display FROM auth.users u WHERE u.id=auth.uid();
 last_name := regexp_replace(coalesce(nullif(regexp_replace(trim(coalesce(display,'')),'^.*\s',''),''),'Candidate'),'[^[:alnum:]''-]','','g');
 IF last_name='' THEN last_name:='Candidate'; END IF;
 last_name := left(last_name,60);
 ref := 'CC-'||nextval('public.activity_assessment_reference_seq');
 pname := 'Coach Compass Certification — '||last_name||' — '||ref;
 SELECT id INTO revision_id FROM public.scope_revisions WHERE session_id=_session AND revision=s.scope_revision;
 INSERT INTO public.activity_runs(session_id,candidate_id,scenario_id,intervention_id,intervention_slug,definition_snapshot,scope_revision_id,scope_context,start_request_key,runtime_type,assessment_reference,external_platform,required_project_name,integration_capability_level)
 VALUES(_session,auth.uid(),s.scenario_id,i.id,i.slug,jsonb_build_object('title','Strategyzer Playbook — '||i.label,'intervention_label',i.label,'runtime','strategyzer_external'),revision_id,
  jsonb_build_object('primary_intervention',i.slug,'candidate_rationale',s.intervention_rationale,'sequence_context',coalesce(s.engagement_brief->'intervention_sequence','[]'::jsonb),'scope_revision',s.scope_revision),
  _request,'strategyzer_external',ref,'strategyzer_playbook_library',pname,0) RETURNING id INTO rid;
 INSERT INTO public.activity_run_private(run_id) VALUES(rid);
 PERFORM public.insert_activity_run_event(rid,gen_random_uuid(),'system','Assessment ID and required Strategyzer project name generated: '||pname,jsonb_build_object('kind','project_name_generated','assessment_reference',ref,'required_project_name',pname),jsonb_build_object('kind','project_name_generated'));
 PERFORM public.insert_activity_run_event(rid,gen_random_uuid(),'system','Strategyzer project creation instructions presented for Playbook: '||i.label,jsonb_build_object('kind','instructions_presented','intervention',i.slug),jsonb_build_object('kind','instructions_presented'));
 RETURN rid;
END $$;
REVOKE ALL ON FUNCTION public.start_strategyzer_run(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.start_strategyzer_run(uuid,uuid) TO authenticated;

CREATE FUNCTION public.connect_strategyzer_playbook(_run uuid,_request uuid,_supplied_url text,_launch_url text,_host text,_confirm_project boolean,_confirm_name boolean,_confirm_playbook boolean,_project_name text DEFAULT NULL,_playbook_title text DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.activity_runs%ROWTYPE; prior public.activity_external_connections%ROWTYPE; cur public.activity_external_connections%ROWTYPE; cid uuid := gen_random_uuid(); eid uuid; ver integer; changed boolean;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 SELECT * INTO r FROM public.activity_runs WHERE id=_run FOR UPDATE;
 IF NOT FOUND OR r.candidate_id IS DISTINCT FROM auth.uid() OR NOT EXISTS(SELECT 1 FROM public.sessions s WHERE s.id=r.session_id AND s.owner_id=auth.uid()) THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 SELECT * INTO prior FROM public.activity_external_connections WHERE run_id=_run AND request_key=_request;
 IF FOUND THEN RETURN prior.id; END IF;
 IF r.runtime_type<>'strategyzer_external' OR r.status<>'active' THEN RAISE EXCEPTION 'This activity cannot be connected'; END IF;
 IF NOT (_confirm_project AND _confirm_name AND _confirm_playbook) THEN RAISE EXCEPTION 'All three confirmations are required'; END IF;
 _host := lower(coalesce(_host,''));
 IF _host !~ '^[a-z0-9.-]+$' OR NOT EXISTS (SELECT 1 FROM public.external_runtime_allowed_hosts a WHERE a.enabled AND (_host=a.host_suffix OR _host LIKE '%.'||a.host_suffix)) THEN RAISE EXCEPTION 'That address is not a recognised Strategyzer address'; END IF;
 IF length(_supplied_url)>2048 OR length(_launch_url)>2048 OR _launch_url NOT LIKE 'https://'||_host||'/%' AND _launch_url<>'https://'||_host OR _launch_url ~ '[[:space:]<>"''`\\]' THEN RAISE EXCEPTION 'Invalid Strategyzer address'; END IF;
 IF length(coalesce(_project_name,''))>300 OR length(coalesce(_playbook_title,''))>300 THEN RAISE EXCEPTION 'Name too long'; END IF;
 SELECT * INTO cur FROM public.activity_external_connections WHERE run_id=_run AND status='connected';
 changed := FOUND;
 IF changed THEN UPDATE public.activity_external_connections SET status='superseded',superseded_at=now() WHERE id=cur.id; END IF;
 SELECT coalesce(max(version),0)+1 INTO ver FROM public.activity_external_connections WHERE run_id=_run;
 eid := public.insert_activity_run_event(_run,_request,'coach',
   CASE WHEN changed THEN 'Candidate changed the connected Strategyzer workspace (connection '||cur.version||' superseded by '||ver||').' ELSE 'Candidate connected a Strategyzer workspace.' END,
   jsonb_build_object('kind',CASE WHEN changed THEN 'connection_changed' ELSE 'external_runtime_connected' END,'connection_id',cid,'connection_version',ver,'superseded_connection_id',cur.id,'host',_host),
   jsonb_build_object('kind','connect','url',_supplied_url));
 INSERT INTO public.activity_external_connections(id,run_id,version,supplied_url,launch_url,host,candidate_confirmed_project,candidate_confirmed_name,candidate_confirmed_playbook,confirmed_project_name,confirmed_playbook_title,event_id,request_key)
 VALUES(cid,_run,ver,_supplied_url,_launch_url,_host,true,true,true,nullif(trim(_project_name),''),nullif(trim(_playbook_title),''),eid,_request);
 PERFORM public.insert_activity_run_event(_run,gen_random_uuid(),'coach','Candidate confirmed this is their assessment project, uses the required name and matches the selected Playbook (candidate confirmed, not Strategyzer verified).',jsonb_build_object('kind','candidate_confirmation_recorded','connection_id',cid),jsonb_build_object('kind','confirmation'));
 RETURN cid;
END $$;
REVOKE ALL ON FUNCTION public.connect_strategyzer_playbook(uuid,uuid,text,text,text,boolean,boolean,boolean,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.connect_strategyzer_playbook(uuid,uuid,text,text,text,boolean,boolean,boolean,text,text) TO authenticated;

CREATE FUNCTION public.record_strategyzer_launch(_run uuid,_request uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.activity_runs%ROWTYPE; cur public.activity_external_connections%ROWTYPE; prior uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 SELECT * INTO r FROM public.activity_runs WHERE id=_run FOR UPDATE;
 IF NOT FOUND OR r.candidate_id IS DISTINCT FROM auth.uid() OR NOT EXISTS(SELECT 1 FROM public.sessions s WHERE s.id=r.session_id AND s.owner_id=auth.uid()) THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 SELECT id INTO prior FROM public.activity_events WHERE run_id=_run AND request_key=_request; IF FOUND THEN RETURN prior; END IF;
 SELECT * INTO cur FROM public.activity_external_connections WHERE run_id=_run AND status='connected';
 IF NOT FOUND THEN RAISE EXCEPTION 'No connected Strategyzer workspace'; END IF;
 RETURN public.insert_activity_run_event(_run,_request,'coach','Candidate launched connected Strategyzer workspace.',jsonb_build_object('kind','playbook_launched','connection_id',cur.id,'connection_version',cur.version),jsonb_build_object('kind','launch'));
END $$;
REVOKE ALL ON FUNCTION public.record_strategyzer_launch(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_strategyzer_launch(uuid,uuid) TO authenticated;