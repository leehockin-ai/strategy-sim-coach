
CREATE TYPE public.stakeholder_engagement AS ENUM ('low', 'medium', 'high');
CREATE TYPE public.stakeholder_trust AS ENUM ('low', 'medium', 'high');
CREATE TYPE public.stakeholder_guardedness AS ENUM ('open', 'measured', 'guarded');

CREATE TABLE public.stakeholder_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  stakeholder_id text NOT NULL,
  engagement public.stakeholder_engagement NOT NULL,
  trust public.stakeholder_trust NOT NULL,
  guardedness public.stakeholder_guardedness NOT NULL,
  turn_index integer NOT NULL,
  reasoning text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_stakeholder_states_session ON public.stakeholder_states(session_id, stakeholder_id, turn_index);

GRANT SELECT ON public.stakeholder_states TO authenticated;
GRANT ALL ON public.stakeholder_states TO service_role;

ALTER TABLE public.stakeholder_states ENABLE ROW LEVEL SECURITY;

-- Coach can see states from their own sessions
CREATE POLICY "Owner can read own session stakeholder states"
ON public.stakeholder_states
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = stakeholder_states.session_id
      AND s.owner_id = auth.uid()
  )
);

-- Reviewers and admins can see all states
CREATE POLICY "Reviewers and admins can read all stakeholder states"
ON public.stakeholder_states
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'reviewer') OR public.has_role(auth.uid(), 'admin')
);
