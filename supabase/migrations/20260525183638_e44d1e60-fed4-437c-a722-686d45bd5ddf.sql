ALTER TABLE public.evaluations
  ADD COLUMN IF NOT EXISTS per_section_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_section_verdicts   jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS input_quality_signals jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS evaluation_architecture text DEFAULT 'fanout_v1';

COMMENT ON COLUMN public.evaluations.per_section_overrides IS
  'Reviewer overrides of section verdicts: { [section_key]: { ai_verdict, reviewer_verdict, note } }';
COMMENT ON COLUMN public.evaluations.ai_section_verdicts IS
  'Snapshot of original AI verdicts at evaluation time, preserved across reviewer edits.';
COMMENT ON COLUMN public.evaluations.input_quality_signals IS
  'Heuristics about the candidate inputs: character counts, blank-section flags.';
COMMENT ON COLUMN public.evaluations.evaluation_architecture IS
  'Which scoring architecture produced this row. fanout_v1 = per-section parallel + synthesis.';