-- DESIGN ONLY. UNAPPLIED. Do not auto-discover or run from migration tooling.
-- No email/provider setup is performed by this file; no historical backfill.
-- Future mail dispatcher requires built-in email infrastructure and verified
-- domain; it must send one registered template per claimed event through the
-- supported send route with idempotency_key, suppression and unsubscribe intact.
CREATE TABLE public.assessment_ready_outbox (
  assessment_id uuid PRIMARY KEY REFERENCES public.evaluations(id),
  session_id uuid NOT NULL REFERENCES public.sessions(id),
  owner_id uuid NOT NULL,
  recipient_email text NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  attempt_count integer NOT NULL DEFAULT 0,
  lease_token uuid,
  lease_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.assessment_ready_outbox TO service_role;
ALTER TABLE public.assessment_ready_outbox ENABLE ROW LEVEL SECURITY;
-- No candidate access, no public URL or report/score payload stored here.

CREATE FUNCTION public.capture_assessment_ready() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE s public.sessions; trusted_email text;
BEGIN
  SELECT * INTO s FROM public.sessions WHERE id=NEW.session_id;
  -- Do not use candidate_email: it is candidate-supplied and could name anyone.
  SELECT email INTO trusted_email FROM auth.users
    WHERE id=s.owner_id AND email_confirmed_at IS NOT NULL;
  IF s.owner_id IS NOT NULL AND trusted_email IS NOT NULL THEN
    INSERT INTO public.assessment_ready_outbox
      (assessment_id,session_id,owner_id,recipient_email,idempotency_key)
    VALUES (NEW.id,NEW.session_id,s.owner_id,trusted_email,'assessment-ready:'||NEW.id::text)
    ON CONFLICT (assessment_id) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.capture_assessment_ready() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.capture_assessment_ready() TO service_role;
CREATE TRIGGER capture_new_assessment_ready AFTER INSERT ON public.evaluations
  FOR EACH ROW EXECUTE FUNCTION public.capture_assessment_ready();

CREATE TABLE public.custom_practice_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  public_draft jsonb NOT NULL,
  complexity text NOT NULL,
  revision integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.custom_practice_drafts TO authenticated;
GRANT ALL ON public.custom_practice_drafts TO service_role;
ALTER TABLE public.custom_practice_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY custom_practice_read ON public.custom_practice_drafts FOR SELECT TO authenticated USING (owner_id=auth.uid());
CREATE POLICY custom_practice_insert ON public.custom_practice_drafts FOR INSERT TO authenticated WITH CHECK (owner_id=auth.uid());
CREATE POLICY custom_practice_update ON public.custom_practice_drafts FOR UPDATE TO authenticated USING (owner_id=auth.uid()) WITH CHECK (owner_id=auth.uid());
CREATE POLICY custom_practice_delete ON public.custom_practice_drafts FOR DELETE TO authenticated USING (owner_id=auth.uid());
-- Deliberately no start RPC: existing scenarios have an all-authenticated read
-- policy and admin-backed listing. Storing custom rows there would leak them.
-- A separate owner-scoped session snapshot/read adapter and practice eligibility
-- enforcement must be reviewed and implemented before enabling hosted Start.