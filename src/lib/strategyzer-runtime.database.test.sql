-- Privileged runner; disposable fixture and claims are rolled back.
BEGIN;
DO $$
DECLARE owner uuid; other uuid; scenario uuid; sid uuid:=gen_random_uuid(); rid uuid; n int; denied boolean; rec record;
BEGIN
 SELECT owner_id,scenario_id INTO owner,scenario FROM public.sessions WHERE owner_id IS NOT NULL LIMIT 1;
 SELECT id INTO other FROM auth.users WHERE id<>owner LIMIT 1;
 INSERT INTO public.sessions(id,owner_id,scenario_id,candidate_name,candidate_email,chosen_intervention_slug) VALUES(sid,owner,scenario,'TEST/NON-PRODUCTION Jane Doe','test@example.invalid','customer_profile_interviews');
 PERFORM set_config('request.jwt.claims',json_build_object('sub',owner,'role','authenticated')::text,true);
 rid:=public.start_strategyzer_run(sid,'b4000000-0000-4000-8000-0000000000aa');
 IF public.start_strategyzer_run(sid,'b4000000-0000-4000-8000-0000000000aa')<>rid THEN RAISE EXCEPTION 'start not idempotent'; END IF;
 SELECT * INTO rec FROM public.activity_runs WHERE id=rid;
 IF rec.assessment_reference !~ '^CC-[0-9]+$' OR rec.required_project_name<>'Coach Compass Certification — '||regexp_replace(rec.required_project_name,'^Coach Compass Certification — (.*) — CC-.*$','\1')||' — '||rec.assessment_reference OR rec.integration_capability_level<>0 THEN RAISE EXCEPTION 'bad identity %',rec.required_project_name; END IF;
 RAISE NOTICE 'identity % / %',rec.assessment_reference,rec.required_project_name;
 PERFORM public.connect_strategyzer_playbook(rid,'b4000000-0000-4000-8000-0000000000b1','https://app.strategyzer.com/x','https://app.strategyzer.com/x','app.strategyzer.com',true,true,true,null,null);
 PERFORM public.connect_strategyzer_playbook(rid,'b4000000-0000-4000-8000-0000000000b1','https://app.strategyzer.com/x','https://app.strategyzer.com/x','app.strategyzer.com',true,true,true,null,null);
 PERFORM public.connect_strategyzer_playbook(rid,'b4000000-0000-4000-8000-0000000000b2','https://app.strategyzer.com/y','https://app.strategyzer.com/y','app.strategyzer.com',true,true,true,null,null);
 SELECT count(*) INTO n FROM public.activity_external_connections WHERE run_id=rid; IF n<>2 THEN RAISE EXCEPTION 'history count %',n; END IF;
 SELECT count(*) INTO n FROM public.activity_external_connections WHERE run_id=rid AND status='connected' AND launch_url='https://app.strategyzer.com/y'; IF n<>1 THEN RAISE EXCEPTION 'current wrong'; END IF;
 PERFORM public.record_strategyzer_launch(rid,'b4000000-0000-4000-8000-0000000000c1');
 SELECT count(*) INTO n FROM public.activity_events WHERE run_id=rid; IF n<>7 THEN RAISE EXCEPTION 'event count %',n; END IF;
 denied:=false; BEGIN PERFORM public.connect_strategyzer_playbook(rid,gen_random_uuid(),'https://evil.com/','https://evil.com/','evil.com',true,true,true,null,null); EXCEPTION WHEN OTHERS THEN denied:=true; END; IF NOT denied THEN RAISE EXCEPTION 'foreign host accepted'; END IF;
 denied:=false; BEGIN PERFORM public.connect_strategyzer_playbook(rid,gen_random_uuid(),'https://app.strategyzer.com/z','https://app.strategyzer.com/z','app.strategyzer.com',true,false,true,null,null); EXCEPTION WHEN OTHERS THEN denied:=true; END; IF NOT denied THEN RAISE EXCEPTION 'unconfirmed accepted'; END IF;
 PERFORM set_config('request.jwt.claims',json_build_object('sub',other,'role','authenticated')::text,true);
 denied:=false; BEGIN PERFORM public.record_strategyzer_launch(rid,gen_random_uuid()); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END; IF NOT denied THEN RAISE EXCEPTION 'other candidate launched'; END IF;
 denied:=false; BEGIN PERFORM public.connect_strategyzer_playbook(rid,gen_random_uuid(),'https://app.strategyzer.com/q','https://app.strategyzer.com/q','app.strategyzer.com',true,true,true,null,null); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END; IF NOT denied THEN RAISE EXCEPTION 'other candidate connected'; END IF;
 RAISE NOTICE 'strategyzer runtime checks passed';
END $$;
ROLLBACK;
