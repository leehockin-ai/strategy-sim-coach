ALTER TABLE public.evaluations
  ADD COLUMN IF NOT EXISTS soft_skills jsonb,
  ADD COLUMN IF NOT EXISTS methodology_skills jsonb,
  ADD COLUMN IF NOT EXISTS coach_feedback text,
  ADD COLUMN IF NOT EXISTS internal_notes text,
  ADD COLUMN IF NOT EXISTS reviewer_name text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamp with time zone;