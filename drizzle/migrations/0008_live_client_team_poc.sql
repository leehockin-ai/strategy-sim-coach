CREATE TABLE public.team_activity_configs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), activity_key text NOT NULL, version integer NOT NULL CHECK(version>0),
 intervention_slug text NOT NULL, scenario_id uuid NOT NULL REFERENCES public.scenarios(id),
 title text NOT NULL, exercise_label text NOT NULL, expected_duration_minutes integer NOT NULL CHECK(expected_duration_minutes>0),
 instructions text NOT NULL, activity_steps jsonb NOT NULL DEFAULT '[]',
 participants jsonb NOT NULL DEFAULT '[]', truth jsonb NOT NULL DEFAULT '{}',
 poc boolean NOT NULL DEFAULT true, methodology_approved boolean NOT NULL DEFAULT false,
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('draft','active','retired')),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(activity_key,version,scenario_id)
);
GRANT ALL ON public.team_activity_configs TO service_role;
ALTER TABLE public.team_activity_configs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.team_activity_configs FROM anon,authenticated;
COMMENT ON TABLE public.team_activity_configs IS 'Assessment simulation configuration (server-only). Participants/truth are private. poc=true rows are not approved certification content and are gated to allowlisted test sessions.';

-- Server-only ordered/idempotent append of a whole team turn (coach + team + system events) with private annotations.
CREATE FUNCTION public.append_team_events(_run uuid,_request uuid,_events jsonb,_participant_state jsonb DEFAULT NULL,_internal jsonb DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.activity_runs%ROWTYPE; existing public.activity_events%ROWTYPE; e jsonb; i integer := 0; seq integer; eid uuid; ids jsonb := '[]'; k uuid;
BEGIN
 SELECT * INTO r FROM public.activity_runs WHERE id=_run FOR UPDATE;
 IF NOT FOUND OR r.runtime_type<>'strategyzer_external' OR r.status<>'active' THEN RAISE EXCEPTION 'Run not available' USING ERRCODE='42501'; END IF;
 SELECT * INTO existing FROM public.activity_events WHERE run_id=_run AND request_key=_request;
 IF FOUND THEN
  IF existing.request_payload->'request'->>'content' IS DISTINCT FROM _events->0->>'content' OR existing.event_type IS DISTINCT FROM _events->0->>'type' THEN RAISE EXCEPTION 'Idempotency key reused with different payload'; END IF;
  RETURN jsonb_build_object('duplicate',true);
 END IF;
 FOR e IN SELECT * FROM jsonb_array_elements(_events) LOOP
  seq := r.last_sequence + i + 1; eid := gen_random_uuid();
  k := CASE WHEN i=0 THEN _request ELSE md5(_request::text||':'||i)::uuid END;
  INSERT INTO public.activity_events(id,run_id,sequence,event_type,actor_type,actor_id,content,metadata,evidence_reference,request_key,request_payload)
  VALUES(eid,_run,seq,e->>'type',e->>'actor',e->>'actor_id',coalesce(e->>'content',''),coalesce(e->'metadata','{}'),'activity-run:'||_run||':event:'||seq,k,jsonb_build_object('request',CASE WHEN i=0 THEN jsonb_build_object('type',e->>'type','content',e->>'content') ELSE jsonb_build_object('parent',_request,'index',i) END));
  IF e ? 'private' THEN INSERT INTO public.activity_event_private(event_id,evaluator_metadata,participant_state) VALUES(eid,coalesce(e->'private'->'evaluator','{}'),coalesce(e->'private'->'state','{}')); END IF;
  ids := ids || to_jsonb(eid); i := i+1;
 END LOOP;
 UPDATE public.activity_runs SET last_sequence=r.last_sequence+i WHERE id=_run;
 IF _participant_state IS NOT NULL OR _internal IS NOT NULL THEN
  INSERT INTO public.activity_run_private(run_id,participant_state,internal_configuration) VALUES(_run,coalesce(_participant_state,'{}'),coalesce(_internal,'{}'))
  ON CONFLICT(run_id) DO UPDATE SET participant_state=coalesce(_participant_state,activity_run_private.participant_state), internal_configuration=activity_run_private.internal_configuration||coalesce(_internal,'{}');
 END IF;
 RETURN jsonb_build_object('duplicate',false,'ids',ids);
END $$;
REVOKE ALL ON FUNCTION public.append_team_events(uuid,uuid,jsonb,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.append_team_events(uuid,uuid,jsonb,jsonb,jsonb) TO service_role;

INSERT INTO public.team_activity_configs(activity_key,version,intervention_slug,scenario_id,title,exercise_label,expected_duration_minutes,instructions,activity_steps,participants,truth)
SELECT 'map_first_customer_profile_ai',1,'map_out_customer_profile_with_ai',id,'Map your first Customer Profile (with AI)','Team exercise',15,
'Open this activity in your connected Strategyzer Playbook. Keep Coach Compass available alongside the Playbook. When you are ready to facilitate the team, begin the working session.',
'["Select the customer profile / customer segment to focus on","Map that customer''s Jobs, Pains and Gains based on current understanding","Mark the activity finished and move to the next activity"]',
'[{"name":"Maya Chen","role":"Founder / Product Lead","visible":"Founder; built the wireframes and feature list.","tendency":"dominant","personality":"Energetic, talks first and longest, attached to the app idea, impatient with slowing down, frames assumptions as facts. Takes over when the coach addresses the room generally.","beliefs":["Our customer is all university students","The biggest pain is not having time to cook","Students want AI meal recommendations"],"initial":{"engagement":"high","trust":"medium","defensiveness":"medium","willingness_to_contribute":"high"}},
{"name":"Jordan Patel","role":"Operations / Research","visible":"Handles operations and the little research the team has done.","tendency":"quiet","personality":"Analytical, hesitant, rarely interrupts Maya, gives short answers unless directly and genuinely invited. Becomes more forthcoming when the coach shows real interest in what they know.","beliefs":["We may be mixing different kinds of students","We have not really validated anything"],"initial":{"engagement":"medium","trust":"medium","defensiveness":"low","willingness_to_contribute":"low"}},
{"name":"Sofia Ramirez","role":"Design Lead","visible":"Designed the onboarding and screens.","tendency":"collaborative","personality":"Empathetic, curious about users, sometimes drifts into UI detail (onboarding flow, colours). Agreeable; goes along with a confident framing unless asked what she actually observed.","beliefs":["Users care about simplicity"],"initial":{"engagement":"medium","trust":"medium","defensiveness":"low","willingness_to_contribute":"medium"}}]',
'{"shared":["Pitch competition is in six weeks","The app has wireframes and a feature list: AI meal recommendations, grocery integration, social sharing","No formal customer interviews have been run"],
"evidence":[
{"id":"talked_to_students","holder":"Maya Chen","kind":"weak_evidence","claim":"We have talked to loads of students and they all love it.","reality":"About six informal chats with housemates and friends, mostly showing them the feature list and asking if they would use it.","reveal_when":"The coach asks concretely what those conversations involved, who they were with, or what was actually asked — not merely whether they talked to students."},
{"id":"poll_segments","holder":"Jordan Patel","kind":"unvolunteered_evidence","claim":"","reality":"Jordan ran a small Instagram poll (~40 responses). Most respondents who cook regularly were international postgraduate students on tight budgets cooking for themselves; first-years in catered halls barely cook. This suggests the segment is not all university students.","reveal_when":"Jordan is personally and genuinely invited (not a token check), feels safe, and the conversation is about who the customer is or what is known. Will not volunteer while Maya dominates or the coach has already declared the segment."},
{"id":"supermarket_behaviour","holder":"Sofia Ramirez","kind":"contradictory_evidence","claim":"","reality":"During wireframe walkthroughs, 2 of 5 students said they never plan meals; they decide in the supermarket based on what is cheap. This contradicts the assumed planning job.","reveal_when":"Sofia is asked a non-leading question about what users actually did or said in her walkthroughs. A leading question (e.g. confirming planning or convenience is the pain) gets agreement instead."}],
"assumptions":[{"id":"time_pain","holder":"Maya Chen","statement":"The biggest pain is not having time to cook","status":"unsupported"},{"id":"ai_wanted","holder":"Maya Chen","statement":"Students want AI meal recommendations","status":"feature_desire_not_evidence"}],
"misconceptions":["Treating all university students as one customer segment"],
"uncertainties":["Whether budget or time is the stronger pain","Whether students plan meals at all"],
"tangents":[{"holder":"Maya Chen","topic":"A rival team in the accelerator is also building a grocery app and Maya is worried the judges will prefer them"},{"holder":"Sofia Ramirez","topic":"Whether onboarding should ask dietary preferences on screen one or later"}]}'
FROM public.scenarios WHERE title='The Student Founder';