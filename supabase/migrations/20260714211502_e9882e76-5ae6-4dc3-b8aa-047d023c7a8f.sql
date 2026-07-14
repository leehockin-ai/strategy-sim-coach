
-- 1) interventions reference table
CREATE TABLE public.interventions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  pathway_type text NOT NULL CHECK (pathway_type IN ('pre_playbook','playbook','evidence_gathering','deliberate_pause')),
  phase text CHECK (phase IN ('pre_playbook','discovery','design','test','n_a')),
  label text NOT NULL,
  short_description text NOT NULL DEFAULT '',
  long_description text NOT NULL DEFAULT '',
  default_activity_list jsonb,
  is_deep_vertical boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.interventions TO authenticated;
GRANT ALL ON public.interventions TO service_role;

ALTER TABLE public.interventions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Interventions are readable by authenticated users"
  ON public.interventions FOR SELECT
  TO authenticated
  USING (true);

-- updated_at trigger (reuse or create)
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER interventions_set_updated_at
  BEFORE UPDATE ON public.interventions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 2) Seed 16 rows
INSERT INTO public.interventions (slug, pathway_type, phase, label, short_description, is_deep_vertical, sort_order, default_activity_list) VALUES
('team_alignment_map', 'pre_playbook', 'pre_playbook',
  'Team Alignment Map or bespoke alignment work',
  'Facilitate alignment on objectives, commitments, resources, and risks before introducing Strategyzer methodology.',
  true, 10, NULL),

('idea_generation', 'playbook', 'discovery',
  'Idea Generation',
  'Generate a broad set of opportunity ideas before narrowing.',
  true, 20, NULL),
('customer_profile_interviews', 'playbook', 'discovery',
  'Customer Profile Interviews',
  'Run structured customer interviews to build a defensible Customer Profile.',
  true, 21, NULL),
('focus_on_the_right_customer', 'playbook', 'discovery',
  'Focus on the Right Customer',
  'Choose the customer segment that best fits the strategic bet.',
  false, 22, NULL),
('map_out_customer_profile_with_ai', 'playbook', 'discovery',
  'Map Out Customer Profile with AI',
  'Draft an initial Customer Profile using AI, then validate.',
  false, 23, NULL),

('competing_on_business_models', 'playbook', 'design',
  'Competing on Business Models',
  'Design and stress-test a Business Model Canvas that can compete.',
  true, 30,
  '[
    {"n":1,"section":"Get started with the Business Model Canvas","label":"Intro to the program","kind":"elearning","minutes":6},
    {"n":2,"section":"Get started with the Business Model Canvas","label":"Intro to the Business Model Canvas","kind":"elearning","minutes":4},
    {"n":3,"section":"Get started with the Business Model Canvas","label":"Practice using the Business Model Canvas","kind":"workspace","minutes":5},
    {"n":4,"section":"Get started with the Business Model Canvas","label":"How to use the Business Model Canvas","kind":"elearning","minutes":6},
    {"n":5,"section":"Get started with the Business Model Canvas","label":"Create a rough draft of your business model","kind":"workspace","minutes":30},
    {"n":6,"section":"Level up your business model","label":"Level up your business model","kind":"elearning","minutes":3},
    {"n":7,"section":"Level up your business model","label":"Practice understanding business model levels","kind":"workspace","minutes":15},
    {"n":8,"section":"Business model connections","label":"Business model connections","kind":"elearning","minutes":6},
    {"n":9,"section":"Business model connections","label":"Practice making business model connections","kind":"workspace","minutes":20},
    {"n":10,"section":"Business model connections","label":"Understand your business model connections","kind":"workspace","minutes":20},
    {"n":11,"section":"Competing on business models","label":"Assess your business model design","kind":"elearning","minutes":6},
    {"n":12,"section":"Competing on business models","label":"Practice understanding & simplifying your business model story","kind":"workspace","minutes":20},
    {"n":13,"section":"Competing on business models","label":"Simplify your business model story","kind":"workspace","minutes":25}
  ]'::jsonb),

('strong_value_propositions', 'playbook', 'design',
  'Strong Value Propositions',
  'Design value propositions that connect to real customer jobs, pains, and gains.',
  true, 31, NULL),
('value_scenes', 'playbook', 'design',
  'Value Scenes',
  'Prototype vivid customer scenes to test value proposition resonance.',
  false, 32, NULL),
('how_strong_is_your_business_model', 'playbook', 'design',
  'How Strong Is Your Business Model?',
  'Assess business model strength across seven design criteria.',
  false, 33, NULL),
('map_out_your_business_model_b2c', 'playbook', 'design',
  'Map Out Your Business Model (B2C)',
  'Draft a Business Model Canvas for a B2C context.',
  false, 34, NULL),
('map_out_your_business_model_b2b', 'playbook', 'design',
  'Map Out Your Business Model (B2B)',
  'Draft a Business Model Canvas for a B2B context.',
  false, 35, NULL),
('map_out_your_value_proposition', 'playbook', 'design',
  'Map Out Your Value Proposition',
  'Draft a Value Proposition Canvas grounded in customer evidence.',
  false, 36, NULL),
('ten_x_your_business_model_with_ai', 'playbook', 'design',
  '10x Your Business Model with AI',
  'Use AI to generate 10x variants of the current business model.',
  false, 37, NULL),

('how_market_ready', 'playbook', 'test',
  'How Market-Ready Are You?',
  'Assess evidence strength across desirability, feasibility, and viability.',
  false, 40, NULL),

('evidence_gathering', 'evidence_gathering', 'n_a',
  'Send the team to gather evidence first',
  'No live intervention yet. The team runs interviews, ecosystem mapping, or artifact gathering before methodology work will land.',
  true, 50, NULL),

('deliberate_pause', 'deliberate_pause', 'n_a',
  'Deliberate pause',
  'No intervention is the right move right now. Specify what would need to be true before re-engaging.',
  true, 60, NULL);

-- 3) Session columns
ALTER TABLE public.sessions
  ADD COLUMN chosen_intervention_slug text,
  ADD COLUMN intervention_rationale text,
  ADD COLUMN intervention_committed_at timestamptz,
  ADD COLUMN alignment_workspace jsonb,
  ADD COLUMN playbook_facilitation_plan jsonb,
  ADD COLUMN playbook_activity_run jsonb,
  ADD COLUMN playbook_interpretation jsonb,
  ADD COLUMN evidence_gathering_plan jsonb,
  ADD COLUMN pause_justification jsonb;
