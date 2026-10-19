-- Run through the privileged database runner. Sandbox SQL access is read-only.
-- All test rows roll back; no production methodology content is introduced.
BEGIN;
DO $$
DECLARE
 scenario uuid; session_uuid uuid; coach uuid; program_uuid uuid; assignment_uuid uuid;
 actual text; before_count integer; after_count integer; phase_count integer;
BEGIN
 SELECT id INTO scenario FROM public.scenarios ORDER BY id LIMIT 1;
 SELECT user_id INTO coach FROM public.user_roles WHERE role = 'admin' LIMIT 1;
 SELECT count(*) INTO before_count FROM public.stakeholder_states;
 INSERT INTO public.programs(slug,name,kind) VALUES ('test-stabilization-' || gen_random_uuid(),'TEST/NON-PRODUCTION stabilization','internal_qa') RETURNING id INTO program_uuid;
 INSERT INTO public.program_members(program_id,user_id) VALUES (program_uuid,coach);
 INSERT INTO public.assignments(program_id,scenario_id,assigned_to_user_id,assigned_by_user_id)
 VALUES(program_uuid,scenario,coach,coach) RETURNING id INTO assignment_uuid;
 INSERT INTO public.sessions(scenario_id,candidate_name,candidate_email,owner_id,status,assignment_id)
 VALUES(scenario,'TEST/NON-PRODUCTION stabilization','test@example.invalid',coach,'intervention',assignment_uuid) RETURNING id INTO session_uuid;
 SELECT count(*) INTO after_count FROM public.stakeholder_states WHERE session_id=session_uuid;
 IF after_count <> (SELECT jsonb_array_length(stakeholders) FROM public.scenarios WHERE id=scenario) THEN RAISE EXCEPTION 'Transactional stakeholder seeds missing'; END IF;
 UPDATE public.sessions SET application_canvas='{"customer_segments":"TEST/NON-PRODUCTION"}'::jsonb WHERE id=session_uuid;
 SELECT status INTO actual FROM public.sessions WHERE id=session_uuid;
 IF actual <> 'intervention' THEN RAISE EXCEPTION 'Canvas save regressed progress'; END IF;
 UPDATE public.sessions SET status='framing' WHERE id=session_uuid;
 SELECT status INTO actual FROM public.sessions WHERE id=session_uuid;
 IF actual <> 'intervention' THEN RAISE EXCEPTION 'Backward status regressed progress'; END IF;
 SELECT status INTO actual FROM public.assignments WHERE id=assignment_uuid;
 IF actual <> 'in_progress' THEN RAISE EXCEPTION 'Assignment rollup changed: %',actual; END IF;
 INSERT INTO public.messages(session_id,role,stakeholder_name,content,phase) VALUES(session_uuid,'candidate','TEST','TEST/NON-PRODUCTION','playbook:test');
 SELECT count(*) INTO phase_count FROM public.messages WHERE session_id=session_uuid AND phase='playbook:test';
 IF phase_count <> 1 THEN RAISE EXCEPTION 'Activity phase no longer retrievable'; END IF;
 UPDATE public.sessions SET status='approved' WHERE id=session_uuid;
 INSERT INTO public.evaluations(session_id,scores,strengths,gaps,recommendation,reviewer_decision,reviewer_name,reviewer_notes,coach_feedback,reviewed_at)
 VALUES(session_uuid,'{}','{}','{}','test','approved','TEST reviewer','Human notes','Human feedback',now());
 UPDATE public.evaluations SET scores='{"test":2}',reviewer_decision=NULL,reviewer_name=NULL,reviewer_notes=NULL,coach_feedback='AI draft' WHERE session_id=session_uuid;
 IF NOT EXISTS(SELECT 1 FROM public.evaluations WHERE session_id=session_uuid AND reviewer_decision='approved' AND reviewer_name='TEST reviewer' AND reviewer_notes='Human notes' AND coach_feedback='Human feedback') THEN RAISE EXCEPTION 'AI rerun erased human authority'; END IF;
 UPDATE public.sessions SET status='evaluated' WHERE id=session_uuid;
 SELECT status INTO actual FROM public.sessions WHERE id=session_uuid;
 IF actual <> 'approved' THEN RAISE EXCEPTION 'Rerun erased signed progress'; END IF;
 UPDATE public.evaluations SET reviewer_decision='retry_required',reviewed_at=now()+interval '1 second' WHERE session_id=session_uuid;
 UPDATE public.sessions SET status='retry' WHERE id=session_uuid;
 IF NOT EXISTS(SELECT 1 FROM public.evaluations WHERE session_id=session_uuid AND reviewer_decision='retry_required') THEN RAISE EXCEPTION 'Explicit human redecision blocked'; END IF;
 SELECT status INTO actual FROM public.sessions WHERE id=session_uuid;
 IF actual <> 'retry' THEN RAISE EXCEPTION 'Human redecision status blocked'; END IF;
 RAISE NOTICE 'PASS: seeds, canvas progress, backward progress, assignment rollup, activity phases, human preservation and redecision';
END;
$$;
ROLLBACK;