-- UNAPPLIED, isolated staging ONLY. Install after assessment-ready-mail.sql.
-- Gmail is NOT idempotent. Never automatically reclaim sending/ambiguous rows.
-- No capture trigger changes, historical inserts, scheduler or live sends.
ALTER TABLE public.assessment_ready_outbox DROP CONSTRAINT assessment_ready_outbox_status_check;
ALTER TABLE public.assessment_ready_outbox ADD CONSTRAINT assessment_ready_outbox_status_check
 CHECK(status IN ('pending','processing','queued','retry','blocked','sending','accepted','ambiguous'));

ALTER FUNCTION public.claim_assessment_ready(uuid,uuid) RENAME TO claim_assessment_ready_managed;
CREATE FUNCTION public.claim_assessment_ready(_assessment uuid,_token uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE state text;
BEGIN
 SELECT status INTO state FROM public.assessment_ready_outbox WHERE assessment_id=_assessment FOR UPDATE;
 IF state IN ('sending','accepted','ambiguous') THEN RETURN NULL; END IF;
 RETURN public.claim_assessment_ready_managed(_assessment,_token);
END $$;
-- Prevent direct calls bypassing the terminal-outcome guard.
REVOKE ALL ON FUNCTION public.claim_assessment_ready_managed(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.begin_assessment_gmail_send(_assessment uuid,_token uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 UPDATE public.assessment_ready_outbox SET status='sending'
 WHERE assessment_id=_assessment AND lease_token=_token AND status='processing' AND lease_until>now();
 RETURN FOUND;
END $$;
CREATE OR REPLACE FUNCTION public.settle_assessment_ready(_assessment uuid,_token uuid,_state text,_retry_seconds integer DEFAULT 60) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF _state NOT IN ('queued','accepted','ambiguous','retry','blocked') THEN RAISE EXCEPTION 'Invalid notice state'; END IF;
 UPDATE public.assessment_ready_outbox SET status=_state,lease_token=NULL,lease_until=NULL,
 retry_after=now()+make_interval(secs=>greatest(60,_retry_seconds))
 WHERE assessment_id=_assessment AND lease_token=_token
 AND ((status='processing' AND _state IN ('queued','retry','blocked'))
   OR (status='sending' AND _state IN ('accepted','ambiguous','retry','blocked')));
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.claim_assessment_ready(uuid,uuid),public.begin_assessment_gmail_send(uuid,uuid),public.settle_assessment_ready(uuid,uuid,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_assessment_ready(uuid,uuid),public.begin_assessment_gmail_send(uuid,uuid),public.settle_assessment_ready(uuid,uuid,text,integer) TO service_role;
-- A crash/settle failure leaves 'sending' permanently ineligible for claim.
-- Review manually in Gmail Sent. Never reset it automatically or blindly retry.