CREATE TABLE public.scope_submissions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
 revision integer NOT NULL,
 submitted_at timestamptz NOT NULL DEFAULT now(),
 assessment jsonb,
 feedback jsonb,
 locked_at timestamptz,
 FOREIGN KEY(session_id,revision) REFERENCES public.scope_revisions(session_id,revision)
);
GRANT SELECT ON public.scope_submissions TO authenticated;
GRANT ALL ON public.scope_submissions TO service_role;
ALTER TABLE public.scope_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY scope_submission_owner_read ON public.scope_submissions FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.sessions s WHERE s.id=session_id AND s.owner_id=auth.uid()));
CREATE POLICY scope_submission_reviewer_read ON public.scope_submissions FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'reviewer') OR public.has_role(auth.uid(),'admin'));
COMMENT ON TABLE public.scope_submissions IS 'Future chapter stage-gate foundation: references a frozen Scope revision, with separate assessment, feedback and lock timestamp. Stage 2 creates no submissions, assessments, feedback or locks.';