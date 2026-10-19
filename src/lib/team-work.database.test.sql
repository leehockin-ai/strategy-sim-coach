-- Privileged runner; every fixture and assertion is rolled back.
BEGIN;
DO $$
DECLARE owner uuid; scenario uuid; sid uuid:=gen_random_uuid(); rid uuid; request uuid:=gen_random_uuid(); batch jsonb; work jsonb; result jsonb; rejected boolean; source uuid; before_seq integer; bad jsonb;
BEGIN
 SELECT owner_id,scenario_id INTO owner,scenario FROM public.sessions WHERE owner_id IS NOT NULL LIMIT 1;
 INSERT INTO public.sessions(id,scenario_id,owner_id,candidate_name,candidate_email,status) VALUES(sid,scenario,owner,'TEST/NON-PRODUCTION causal rollback','test@example.invalid','working_session');
 INSERT INTO public.activity_runtime_test_access VALUES(sid,owner,now());
 INSERT INTO public.activity_runs(session_id,candidate_id,scenario_id,intervention_id,intervention_slug,definition_snapshot,scope_context,start_request_key,runtime_type) VALUES(sid,owner,scenario,(SELECT id FROM public.interventions WHERE slug='customer_profile_interviews'),'customer_profile_interviews','{}','{}',gen_random_uuid(),'strategyzer_external') RETURNING id INTO rid;
 IF has_function_privilege('authenticated','public.append_team_work_turn(uuid,uuid,uuid,jsonb,integer,integer,jsonb,jsonb,jsonb,jsonb)','EXECUTE') THEN RAISE EXCEPTION 'Candidate can write team turns'; END IF;
 IF has_table_privilege('authenticated','public.activity_run_private','SELECT') OR has_table_privilege('authenticated','public.team_activity_configs','SELECT') OR has_table_privilege('authenticated','public.activity_event_private','SELECT') THEN RAISE EXCEPTION 'Private data readable'; END IF;
 batch:=jsonb_build_array(jsonb_build_object('type','coach_message','actor','coach','actor_id',owner,'content','Please map what you know','metadata',jsonb_build_object('team_kind','utterance')),jsonb_build_object('type','team_response','actor','team','actor_id','Maya','content','We have not tested that.','metadata',jsonb_build_object('team_kind','response')),jsonb_build_object('type','artifact_contribution','actor','team','content','First pass'));
 work:=jsonb_build_object('provenance','simulated_client_team','status','partial','sections',jsonb_build_array(jsonb_build_object('key','unknowns','label','Assumptions / unknowns','items',jsonb_build_array(jsonb_build_object('sourceId','request:'||request||':response:0','speaker','Maya','text','We have not tested that.')))));
 result:=public.append_team_work_turn(rid,owner,request,'{"action":"facilitate","message":"Please map what you know"}',0,0,batch,'{"team":{"surfaced":[]}}',NULL,work);
 SELECT id INTO source FROM public.activity_events WHERE run_id=rid AND sequence=2;
 IF (SELECT artifact_state#>>'{sections,0,items,0,sourceId}' FROM public.activity_runs WHERE id=rid) IS DISTINCT FROM source::text THEN RAISE EXCEPTION 'Response index lineage failed'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.activity_artifact_history h JOIN public.activity_events e ON e.id=(h.contribution->>'instruction_event_id')::uuid WHERE h.run_id=rid AND h.revision=1 AND e.sequence=1 AND h.actor_type='team') THEN RAISE EXCEPTION 'Instruction linkage failed'; END IF;
 result:=public.append_team_work_turn(rid,owner,request,'{"action":"facilitate","message":"Please map what you know"}',0,0,batch,NULL,NULL,work);
 IF result->>'duplicate'<>'true' OR (SELECT last_sequence FROM public.activity_runs WHERE id=rid)<>3 THEN RAISE EXCEPTION 'Retry duplicated evidence'; END IF;
 rejected:=false; BEGIN PERFORM public.append_team_work_turn(rid,owner,request,'{"action":"different"}',0,0,batch); EXCEPTION WHEN raise_exception THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Changed request identity accepted'; END IF;
 rejected:=false; BEGIN PERFORM public.append_team_work_turn(rid,gen_random_uuid(),gen_random_uuid(),'{}',3,1,batch); EXCEPTION WHEN insufficient_privilege THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Wrong owner accepted'; END IF;
 rejected:=false; BEGIN PERFORM public.append_team_work_turn(rid,owner,gen_random_uuid(),'{}',0,1,batch); EXCEPTION WHEN serialization_failure THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Stale sequence accepted'; END IF;
 work:=jsonb_set(work,'{sections,0,items,0,sourceId}',to_jsonb(source::text));
 FOR bad IN SELECT value FROM jsonb_array_elements(jsonb_build_array(jsonb_set(work,'{sections,0,items,0,text}','"SECRET fabricated knowledge"'),jsonb_set(work,'{sections,0,items,0,speaker}','"Wrong person"'),jsonb_set(work,'{sections,0,items,0,sourceId}','"malformed"'),jsonb_set(work,'{sections,0,items,0,sourceId}',to_jsonb(gen_random_uuid()::text)),jsonb_set(work,'{sections,0,items,0,sourceId}',to_jsonb((SELECT id::text FROM public.activity_events WHERE run_id=rid AND sequence=1))))) LOOP
  rejected:=false;
  BEGIN PERFORM public.append_team_work_turn(rid,owner,gen_random_uuid(),'{}',3,1,batch,'{"team":{"surfaced":["invalid"]}}',NULL,bad); EXCEPTION WHEN raise_exception OR invalid_text_representation THEN rejected:=true; END;
  IF NOT rejected OR (SELECT last_sequence FROM public.activity_runs WHERE id=rid)<>3 OR (SELECT count(*) FROM public.activity_artifact_history WHERE run_id=rid)<>1 OR (SELECT participant_state FROM public.activity_run_private WHERE run_id=rid)<>'{"team":{"surfaced":[]}}'::jsonb THEN RAISE EXCEPTION 'Invalid lineage was not atomic'; END IF;
 END LOOP;
 rejected:=false; BEGIN PERFORM public.append_team_work_turn(rid,owner,gen_random_uuid(),'{}',3,1,batch,NULL,NULL,jsonb_set(work,'{provenance}','"strategyzer_verified"')); EXCEPTION WHEN raise_exception THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Verified provenance accepted'; END IF;
 work:=jsonb_set(work,'{status}','"stopped_intentionally"');
 PERFORM public.append_team_work_turn(rid,owner,gen_random_uuid(),'{}',3,1,batch,NULL,NULL,work);
 IF (SELECT artifact_revision FROM public.activity_runs WHERE id=rid)<>2 OR (SELECT count(*) FROM public.activity_artifact_history WHERE run_id=rid)<>2 OR NOT EXISTS(SELECT 1 FROM public.activity_artifact_history WHERE run_id=rid AND revision=1 AND state->>'status'='partial') THEN RAISE EXCEPTION 'History overwritten'; END IF;
 RAISE NOTICE 'Causal work privacy, ownership, identity retry, sequence conflict, quote validation, atomic rollback, lineage, history and intentional stopping passed';
END $$;
ROLLBACK;