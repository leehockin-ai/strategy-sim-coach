CREATE TABLE public.evaluation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL UNIQUE,
  owner_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','failed','completed')),
  steps jsonb NOT NULL DEFAULT '{}'::jsonb,
  live_evidence jsonb,
  lease_token uuid,
  lease_until timestamptz,
  error text,
  evaluation_id uuid,
  run_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
COMMENT ON TABLE public.evaluation_jobs IS 'Server-only resumable assessment generation state; candidates read progress via owner-checked server functions only.';
GRANT ALL ON public.evaluation_jobs TO service_role;
ALTER TABLE public.evaluation_jobs ENABLE ROW LEVEL SECURITY;