ALTER TABLE public.scenarios
  ADD COLUMN IF NOT EXISTS success_definition text NOT NULL DEFAULT 'The team has not articulated a shared definition of success yet.',
  ADD COLUMN IF NOT EXISTS success_pressure text NOT NULL DEFAULT 'Pressure to show progress quickly, with limited tolerance for evidence-gathering delays.',
  ADD COLUMN IF NOT EXISTS unrealistic_aspects text[] NOT NULL DEFAULT ARRAY['Timeline assumed to be shorter than the evidence base supports.','Stakeholder alignment assumed to be stronger than it is.']::text[];