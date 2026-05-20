
-- Add owner to sessions
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS owner_id uuid;
CREATE INDEX IF NOT EXISTS sessions_owner_id_idx ON public.sessions(owner_id);

-- Replace permissive policies on sessions with owner-scoped policies
DROP POLICY IF EXISTS sessions_insert_all ON public.sessions;
DROP POLICY IF EXISTS sessions_read_all ON public.sessions;
DROP POLICY IF EXISTS sessions_update_all ON public.sessions;

CREATE POLICY sessions_select_own ON public.sessions
  FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY sessions_insert_own ON public.sessions
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY sessions_update_own ON public.sessions
  FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- Messages: restrict to messages of sessions the user owns
DROP POLICY IF EXISTS messages_insert_all ON public.messages;
DROP POLICY IF EXISTS messages_read_all ON public.messages;

CREATE POLICY messages_select_own ON public.messages
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.owner_id = auth.uid()));
CREATE POLICY messages_insert_own ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.owner_id = auth.uid()));

-- Evaluations: restrict to evaluations of sessions the user owns
DROP POLICY IF EXISTS evaluations_insert_all ON public.evaluations;
DROP POLICY IF EXISTS evaluations_read_all ON public.evaluations;
DROP POLICY IF EXISTS evaluations_update_all ON public.evaluations;

CREATE POLICY evaluations_select_own ON public.evaluations
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.owner_id = auth.uid()));
CREATE POLICY evaluations_insert_own ON public.evaluations
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.owner_id = auth.uid()));
CREATE POLICY evaluations_update_own ON public.evaluations
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.owner_id = auth.uid()));
