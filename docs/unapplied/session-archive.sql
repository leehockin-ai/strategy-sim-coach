-- UNAPPLIED. Lets a coach archive (hide) their own abandoned attempt. Nothing is deleted.
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE OR REPLACE FUNCTION public.set_my_session_archived(_session_id uuid, _archived boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.sessions
     SET archived_at = CASE WHEN _archived THEN now() ELSE NULL END
   WHERE id = _session_id AND owner_id = auth.uid()
     AND submission_requested_at IS NULL;  -- submitted work stays visible
  IF NOT FOUND THEN RAISE EXCEPTION 'Session not found or cannot be archived'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.set_my_session_archived(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_my_session_archived(uuid, boolean) TO authenticated;
