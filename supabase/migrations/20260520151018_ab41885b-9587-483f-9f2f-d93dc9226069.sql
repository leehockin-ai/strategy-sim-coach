
-- Scenarios library
CREATE TABLE public.scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  industry TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'intermediate',
  summary TEXT NOT NULL,
  context TEXT NOT NULL,
  stakeholders JSONB NOT NULL DEFAULT '[]'::jsonb,
  ambiguity_factors TEXT[] NOT NULL DEFAULT '{}',
  system_prompt TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
  candidate_name TEXT NOT NULL,
  candidate_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'intake',
  framing_notes TEXT,
  methodology_choice TEXT,
  methodology_rationale TEXT,
  intervention_recommendation TEXT,
  decision TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_sessions_email ON public.sessions(candidate_email);
CREATE INDEX idx_sessions_scenario ON public.sessions(scenario_id);

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  stakeholder_name TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_session ON public.messages(session_id, created_at);

CREATE TABLE public.evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE UNIQUE,
  scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  strengths TEXT[] NOT NULL DEFAULT '{}',
  gaps TEXT[] NOT NULL DEFAULT '{}',
  recommendation TEXT NOT NULL DEFAULT 'pending',
  overall_summary TEXT,
  raw_response JSONB,
  reviewer_notes TEXT,
  reviewer_decision TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scenarios_read_all" ON public.scenarios FOR SELECT USING (true);

CREATE POLICY "sessions_read_all" ON public.sessions FOR SELECT USING (true);
CREATE POLICY "sessions_insert_all" ON public.sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "sessions_update_all" ON public.sessions FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "messages_read_all" ON public.messages FOR SELECT USING (true);
CREATE POLICY "messages_insert_all" ON public.messages FOR INSERT WITH CHECK (true);

CREATE POLICY "evaluations_read_all" ON public.evaluations FOR SELECT USING (true);
CREATE POLICY "evaluations_insert_all" ON public.evaluations FOR INSERT WITH CHECK (true);
CREATE POLICY "evaluations_update_all" ON public.evaluations FOR UPDATE USING (true) WITH CHECK (true);

-- Seed scenarios
INSERT INTO public.scenarios (slug, title, industry, difficulty, summary, context, stakeholders, ambiguity_factors, system_prompt) VALUES
(
  'weak-sponsor-fintech',
  'The Distant Sponsor',
  'Financial Services',
  'intermediate',
  'A regional bank''s innovation team wants to test a new SMB lending product. Their executive sponsor is supportive in words but absent in practice.',
  'NorthBay Bank has chartered an innovation team to explore a digital SMB lending product. The Chief Innovation Officer publicly champions the work but has missed the last three steering meetings. The team has built a prototype and is preparing customer interviews but lacks budget approval for a paid pilot. There is internal tension between the digital team and the credit risk department, who feel they were not consulted.',
  '[
    {"name":"Priya Shah","role":"Innovation Team Lead","posture":"Energetic but anxious. Wants to ship something before quarterly review."},
    {"name":"Marcus Lin","role":"Chief Innovation Officer (Sponsor)","posture":"Publicly supportive, privately disengaged. Cancels at the last minute."},
    {"name":"Dale Whitmore","role":"Head of Credit Risk","posture":"Skeptical, feels bypassed, controls the gate to any pilot."}
  ]'::jsonb,
  ARRAY['Sponsor commitment is unclear','Cross-functional alignment missing','Pressure to ship before learning','Pilot budget not approved'],
  'You are simulating stakeholders in a Strategyzer coaching scenario. The candidate is the coach. Stay in character based on the persona the candidate addresses. Respond in 2-4 sentences, in first person, conversationally. Surface tension realistically: Marcus deflects and reschedules; Priya is anxious and pushes for action; Dale is skeptical and probing. Never break character. Never coach the candidate. If the candidate jumps to solutions, react as the persona would — defensive, confused, or compliant. Always end with something the coach must navigate.'
),
(
  'solution-jumping-saas',
  'The Solution Factory',
  'B2B SaaS',
  'advanced',
  'A 200-person SaaS company''s product team is convinced their next big bet is an AI assistant. They want help "designing the rollout," not exploring the problem.',
  'Helix is a mid-market HR analytics platform. Leadership has decided to build an "AI HR copilot" within six months. The product team has wireframes, a roadmap, and a launch date. They have hired you to "facilitate workshops that get everyone aligned." There is no evidence of customer demand for this specific feature, but executives are convinced because three competitors announced similar bets.',
  '[
    {"name":"Jordan Park","role":"VP Product","posture":"Confident, has the roadmap. Sees coaching as project management help."},
    {"name":"Sam Okafor","role":"Lead Designer","posture":"Privately skeptical, willing to ask hard questions if the coach creates space."},
    {"name":"Renee Castillo","role":"CEO","posture":"Decisive, competitive. Wants speed. Frames doubt as foot-dragging."}
  ]'::jsonb,
  ARRAY['Solution committed before problem validated','Executive ego invested in answer','Competitive FOMO','Team conflates alignment with progress'],
  'You are simulating stakeholders in a Strategyzer coaching scenario. The candidate is the coach. Stay strictly in character. Jordan presents the roadmap as a fait accompli; Sam will quietly support good questioning if invited; Renee gets impatient with anything that sounds like slowing down. If the candidate immediately runs a workshop or accepts the framing, comply — and let things get worse. If the candidate reframes toward problem/assumption, push back realistically before opening up. Respond in 2-4 sentences. Never coach the candidate.'
),
(
  'evidence-resistant-health',
  'The Confident Executive',
  'Healthcare',
  'advanced',
  'A hospital system''s strategy lead has launched a digital triage pilot. Early data is mixed. The executive sponsor insists they "already know it works."',
  'Meridian Health piloted a digital triage tool in three clinics over 12 weeks. The CMO sponsored it and has spoken about it in two board meetings. Quantitative results are mixed: patient wait times dropped in one clinic, were unchanged in another, and increased in the third. Qualitative feedback from nurses is largely negative. The CMO wants to "scale to all 22 clinics next quarter." You have been brought in to "help operationalize the rollout."',
  '[
    {"name":"Dr. Eleanor Voss","role":"Chief Medical Officer (Sponsor)","posture":"Authoritative, reputationally invested. Dismisses negative signals as change resistance."},
    {"name":"Nurse Manager Tariq Hassan","role":"Frontline Operator","posture":"Tired, has watched many initiatives fail. Honest if asked directly."},
    {"name":"Maya Bernstein","role":"Strategy Lead","posture":"Caught between sponsor and reality. Wants the coach to give her air cover."}
  ]'::jsonb,
  ARRAY['Sponsor confidence exceeds evidence','Mixed signals interpreted selectively','Frontline disengagement','Coach being recruited to legitimize a decision'],
  'You are simulating stakeholders in a Strategyzer coaching scenario. Stay strictly in character. Dr. Voss is direct, formal, and frames doubt as politically risky. Tariq is plainspoken and honest when given space. Maya looks for permission to slow down. If the candidate validates Dr. Voss''s framing, she becomes more entrenched. If the candidate asks evidence-oriented questions of Dr. Voss, she initially resists but may concede ground under careful probing. Respond in 2-4 sentences. Never break character.'
);
