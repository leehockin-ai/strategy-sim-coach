ALTER TABLE public.sessions ADD COLUMN engagement_brief jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.sessions ADD COLUMN scope_revision integer NOT NULL DEFAULT 0;
CREATE TABLE public.scope_revisions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
 revision integer NOT NULL,
 snapshot jsonb NOT NULL,
 evidence_message_ids uuid[] NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(session_id, revision)
);
GRANT SELECT ON public.scope_revisions TO authenticated;
GRANT ALL ON public.scope_revisions TO service_role;
ALTER TABLE public.scope_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY scope_revision_owner_read ON public.scope_revisions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id=session_id AND s.owner_id=auth.uid()));
CREATE POLICY scope_revision_reviewer_read ON public.scope_revisions FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'reviewer') OR public.has_role(auth.uid(),'admin'));
CREATE OR REPLACE FUNCTION public.capture_scope_revision() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE old_scope jsonb; new_scope jsonb; evidence uuid[];
BEGIN
 old_scope := jsonb_build_object('engagement_brief',OLD.engagement_brief,'framing_notes',OLD.framing_notes,'dialogue_commitments',OLD.dialogue_commitments,'chosen_intervention_slug',OLD.chosen_intervention_slug,'intervention_rationale',OLD.intervention_rationale,'methodology_choice',OLD.methodology_choice,'methodology_rationale',OLD.methodology_rationale,'intervention_committed_at',OLD.intervention_committed_at);
 new_scope := jsonb_build_object('engagement_brief',NEW.engagement_brief,'framing_notes',NEW.framing_notes,'dialogue_commitments',NEW.dialogue_commitments,'chosen_intervention_slug',NEW.chosen_intervention_slug,'intervention_rationale',NEW.intervention_rationale,'methodology_choice',NEW.methodology_choice,'methodology_rationale',NEW.methodology_rationale,'intervention_committed_at',NEW.intervention_committed_at);
 NEW.scope_revision := OLD.scope_revision;
 IF old_scope IS DISTINCT FROM new_scope THEN
  SELECT coalesce(array_agg(id ORDER BY created_at,id),'{}'::uuid[]) INTO evidence FROM public.messages WHERE session_id=NEW.id AND (phase='scoping' OR phase='intervention');
  IF OLD.scope_revision=0 THEN
   INSERT INTO public.scope_revisions(session_id,revision,snapshot,evidence_message_ids) VALUES(NEW.id,0,old_scope,evidence) ON CONFLICT(session_id,revision) DO NOTHING;
  END IF;
  NEW.scope_revision := OLD.scope_revision+1;
  INSERT INTO public.scope_revisions(session_id,revision,snapshot,evidence_message_ids) VALUES(NEW.id,NEW.scope_revision,new_scope,evidence);
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER sessions_capture_scope_revision BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.capture_scope_revision();
REVOKE ALL ON FUNCTION public.capture_scope_revision() FROM PUBLIC;
COMMENT ON TABLE public.scope_revisions IS 'Append-only Scope evidence snapshots created atomically on candidate edits. No historical backfill. A later chapter submission can reference a specific revision without changing past evidence.';