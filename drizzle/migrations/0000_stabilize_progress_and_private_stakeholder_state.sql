CREATE OR REPLACE FUNCTION public.session_progress_rank(_status text)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$
 SELECT CASE _status
 WHEN 'intake' THEN 0 WHEN 'framing' THEN 0
 WHEN 'dialogue' THEN 1 WHEN 'stakeholder_workspace' THEN 1
 WHEN 'method' THEN 2 WHEN 'methodology' THEN 2 WHEN 'coaching_approach' THEN 2
 WHEN 'working_session' THEN 3 WHEN 'live_playbook' THEN 3 WHEN 'application' THEN 3
 WHEN 'intervention' THEN 4 WHEN 'next_step_judgment' THEN 4
 WHEN 'engagement_orchestration' THEN 5 WHEN 'playbook' THEN 5
 WHEN 'evaluated' THEN 6
 WHEN 'approved' THEN 7 WHEN 'conditional' THEN 7 WHEN 'not_approved' THEN 7 WHEN 'retry' THEN 7 WHEN 'escalated' THEN 7
 ELSE -1 END;
$$;
CREATE OR REPLACE FUNCTION public.guard_session_progress()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF NEW.status IS DISTINCT FROM OLD.status THEN
  IF public.session_progress_rank(NEW.status) < 0 THEN RAISE EXCEPTION 'Unknown session progress status'; END IF;
  IF auth.role() = 'authenticated' AND public.session_progress_rank(NEW.status) >= 6 AND NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'reviewer')) THEN
   RAISE EXCEPTION 'Assessment progress is server managed';
  END IF;
  IF public.session_progress_rank(OLD.status) < 0 OR public.session_progress_rank(NEW.status) <= public.session_progress_rank(OLD.status) THEN
   IF NOT (public.session_progress_rank(OLD.status) = 7 AND public.session_progress_rank(NEW.status) = 7) THEN NEW.status := OLD.status; END IF;
  END IF;
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER sessions_guard_progress BEFORE UPDATE OF status ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.guard_session_progress();
DROP POLICY IF EXISTS "Owner can read own session stakeholder states" ON public.stakeholder_states;
REVOKE ALL ON public.stakeholder_states FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.stakeholder_states FROM authenticated;
GRANT SELECT ON public.stakeholder_states TO authenticated;
GRANT ALL ON public.stakeholder_states TO service_role;
CREATE UNIQUE INDEX stakeholder_states_turn_unique ON public.stakeholder_states(session_id, stakeholder_id, turn_index);
CREATE OR REPLACE FUNCTION public.seed_new_session_stakeholder_states()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 INSERT INTO public.stakeholder_states(session_id, stakeholder_id, engagement, trust, guardedness, turn_index, reasoning)
 SELECT NEW.id, participant->>'name', 'medium', 'medium', 'measured', 0, 'initial state'
 FROM public.scenarios s CROSS JOIN LATERAL jsonb_array_elements(s.stakeholders) participant
 WHERE s.id = NEW.scenario_id AND nullif(participant->>'name', '') IS NOT NULL
 ON CONFLICT(session_id, stakeholder_id, turn_index) DO NOTHING;
 RETURN NEW;
END;
$$;
CREATE TRIGGER sessions_seed_private_state AFTER INSERT ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.seed_new_session_stakeholder_states();
REVOKE ALL ON FUNCTION public.seed_new_session_stakeholder_states() FROM PUBLIC;
CREATE OR REPLACE FUNCTION public.guard_human_evaluation_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF OLD.reviewer_decision IS NOT NULL AND NEW.reviewed_at IS NOT DISTINCT FROM OLD.reviewed_at THEN
  NEW.reviewer_decision := OLD.reviewer_decision;
  NEW.reviewer_name := OLD.reviewer_name;
  NEW.reviewer_notes := OLD.reviewer_notes;
  NEW.internal_notes := OLD.internal_notes;
  NEW.coach_feedback := OLD.coach_feedback;
  NEW.per_section_overrides := OLD.per_section_overrides;
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER evaluations_preserve_human_review BEFORE UPDATE ON public.evaluations FOR EACH ROW EXECUTE FUNCTION public.guard_human_evaluation_fields();
REVOKE INSERT, UPDATE, DELETE ON public.evaluations FROM anon, authenticated;
GRANT SELECT ON public.evaluations TO authenticated;
GRANT ALL ON public.evaluations TO service_role;
COMMENT ON TABLE public.stakeholder_states IS 'Private simulation state. Reviewer/admin SELECT only; server-managed writes. Never store public candidate-visible scenario truth here.';