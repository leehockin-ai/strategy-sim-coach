-- UNAPPLIED SOURCE ONLY. Shared Cloud writes were not authorized.
CREATE TABLE public.beginner_pilot_checkpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL, checkpoint_key text NOT NULL, scope_revision_id uuid NOT NULL REFERENCES public.scope_revisions(id),
  input_snapshot jsonb NOT NULL, update_snapshot jsonb, status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','running','failed','ready')),
  lease_token uuid, lease_until timestamptz, error text, presented_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(session_id,checkpoint_key)
);
GRANT SELECT ON public.beginner_pilot_checkpoints TO authenticated;
GRANT ALL ON public.beginner_pilot_checkpoints TO service_role;
ALTER TABLE public.beginner_pilot_checkpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read pilot checkpoints" ON public.beginner_pilot_checkpoints FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE FUNCTION public.freeze_ready_pilot_checkpoint() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN IF OLD.status='ready' AND (NEW.update_snapshot IS DISTINCT FROM OLD.update_snapshot OR NEW.input_snapshot IS DISTINCT FROM OLD.input_snapshot) THEN RAISE EXCEPTION 'Ready pilot updates are immutable'; END IF; RETURN NEW; END $$;
CREATE TRIGGER freeze_ready_pilot_checkpoint BEFORE UPDATE ON public.beginner_pilot_checkpoints FOR EACH ROW EXECUTE FUNCTION public.freeze_ready_pilot_checkpoint();