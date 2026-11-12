-- UNAPPLIED. Isolated backend only, AFTER built-in queue setup and scaffolding.
-- No pgmq/cron/Vault/provider infrastructure is manually created here.
-- Supersedes the outbox section of assessment-and-private-practice.sql; do NOT
-- install that combined obsolete design. No historical capture/backfill.
CREATE TABLE public.assessment_ready_outbox (
 assessment_id uuid PRIMARY KEY REFERENCES public.evaluations(id),
 session_id uuid NOT NULL REFERENCES public.sessions(id), owner_id uuid NOT NULL,
 recipient_email text NOT NULL, idempotency_key text NOT NULL UNIQUE,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','queued','retry','blocked')),
 attempt_count integer NOT NULL DEFAULT 0, lease_token uuid, lease_until timestamptz,
 retry_after timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,INSERT,UPDATE ON public.assessment_ready_outbox TO service_role;
ALTER TABLE public.assessment_ready_outbox ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.capture_assessment_ready() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE s public.sessions; address text;
BEGIN
 SELECT * INTO s FROM public.sessions WHERE id=NEW.session_id;
 SELECT email INTO address FROM auth.users WHERE id=s.owner_id AND email_confirmed_at IS NOT NULL;
 IF address IS NOT NULL THEN
  INSERT INTO public.assessment_ready_outbox(assessment_id,session_id,owner_id,recipient_email,idempotency_key)
  VALUES(NEW.id,s.id,s.owner_id,address,'assessment-ready:'||NEW.id::text) ON CONFLICT DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.capture_assessment_ready() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.capture_assessment_ready() TO service_role;
CREATE TRIGGER capture_new_assessment_ready AFTER INSERT ON public.evaluations FOR EACH ROW EXECUTE FUNCTION public.capture_assessment_ready();
CREATE FUNCTION public.claim_assessment_ready(_assessment uuid,_token uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE o public.assessment_ready_outbox; address text; pending boolean;
BEGIN
 SELECT * INTO o FROM public.assessment_ready_outbox WHERE assessment_id=_assessment FOR UPDATE;
 IF NOT FOUND OR o.status IN ('queued','blocked') OR o.retry_after>now() OR o.lease_until>now() THEN RETURN NULL; END IF;
 SELECT u.email,(s.submission_requested_at IS NOT NULL AND e.reviewer_decision IS NULL)
 INTO address,pending FROM public.sessions s JOIN public.evaluations e ON e.session_id=s.id
 JOIN auth.users u ON u.id=s.owner_id AND u.email_confirmed_at IS NOT NULL
 WHERE e.id=_assessment AND s.id=o.session_id AND s.owner_id=o.owner_id;
 IF address IS DISTINCT FROM o.recipient_email OR address IS NULL OR o.attempt_count>=5 OR o.created_at<now()-interval '60 minutes' THEN
  UPDATE public.assessment_ready_outbox SET status='blocked',lease_token=NULL,lease_until=NULL WHERE assessment_id=_assessment; RETURN NULL;
 END IF;
 UPDATE public.assessment_ready_outbox SET status='processing',attempt_count=attempt_count+1,lease_token=_token,lease_until=now()+interval '60 seconds' WHERE assessment_id=_assessment;
 RETURN jsonb_build_object('session_id',o.session_id,'owner_id',o.owner_id,'recipient_email',address,'pending_human_review',pending);
END $$;
CREATE FUNCTION public.settle_assessment_ready(_assessment uuid,_token uuid,_state text,_retry_seconds integer DEFAULT 60) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF _state NOT IN ('queued','retry','blocked') THEN RAISE EXCEPTION 'Invalid notice state'; END IF;
 UPDATE public.assessment_ready_outbox SET status=_state,lease_token=NULL,lease_until=NULL,retry_after=now()+make_interval(secs=>greatest(60,_retry_seconds))
 WHERE assessment_id=_assessment AND lease_token=_token AND status='processing';
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.claim_assessment_ready(uuid,uuid),public.settle_assessment_ready(uuid,uuid,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_assessment_ready(uuid,uuid),public.settle_assessment_ready(uuid,uuid,text,integer) TO service_role;
-- Dispatcher waking/recovery remains an isolated deployment prerequisite.
-- Do not enable until scaffold response and enqueue-level idempotency are tested.