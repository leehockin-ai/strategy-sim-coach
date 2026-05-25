ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS playbook_suggestions jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.sessions.playbook_suggestions IS
  'Append-only log of every AI suggestion shown during Coaching Approach. Each entry: { shown_at, requested_mode, candidate_state_at_request, suggestion }. Used by the evaluator to assess independent reasoning vs AI scaffolding.';