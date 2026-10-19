-- Run with the privileged database runner. All fixtures are rolled back.
BEGIN;
DO $$
DECLARE sid uuid; scenario uuid; owner uuid; brief jsonb; revision_count integer; progress text;
BEGIN
 SELECT scenario_id,owner_id INTO scenario,owner FROM public.sessions WHERE owner_id IS NOT NULL LIMIT 1;
 INSERT INTO public.sessions(scenario_id,owner_id,candidate_name,candidate_email,status) VALUES(scenario,owner,'TEST/NON-PRODUCTION Scope regression','scope-test@example.invalid','framing') RETURNING id INTO sid;
 IF (SELECT count(*) FROM public.scope_revisions WHERE session_id=sid)<>0 THEN RAISE EXCEPTION 'Do not synthesize revision history on creation'; END IF;
 UPDATE public.sessions SET engagement_brief='{"decision_to_enable":"Sponsor decides whether to authorize discovery","scope":"One segment"}' WHERE id=sid;
 SELECT count(*) INTO revision_count FROM public.scope_revisions WHERE session_id=sid;
 IF revision_count<>2 THEN RAISE EXCEPTION 'First edit must retain original plus edited snapshot'; END IF;
 UPDATE public.sessions SET engagement_brief='{"decision_to_enable":"Sponsor decides whether to authorize discovery","scope":"One segment"}' WHERE id=sid;
 IF (SELECT count(*) FROM public.scope_revisions WHERE session_id=sid)<>2 THEN RAISE EXCEPTION 'Identical save must not create a revision'; END IF;
 UPDATE public.sessions SET framing_notes='Legacy five-field framing',dialogue_commitments='Sponsor decision meeting on Tuesday',chosen_intervention_slug='evidence_gathering',intervention_rationale='Evidence before design' WHERE id=sid;
 IF (SELECT count(*) FROM public.scope_revisions WHERE session_id=sid)<>3 THEN RAISE EXCEPTION 'Existing Scope evidence must be versioned'; END IF;
 UPDATE public.sessions SET status='working_session' WHERE id=sid;
 UPDATE public.sessions SET status='framing',engagement_brief='{"decision_to_enable":"Sponsor decides whether to fund a bounded sprint","scope":"One segment","out_of_scope":"Solution design"}' WHERE id=sid;
 SELECT status INTO progress FROM public.sessions WHERE id=sid;
 IF progress<>'working_session' THEN RAISE EXCEPTION 'Scope edits must not regress progress'; END IF;
 SELECT snapshot->'engagement_brief' INTO brief FROM public.scope_revisions WHERE session_id=sid AND revision=1;
 IF brief->>'decision_to_enable'<>'Sponsor decides whether to authorize discovery' THEN RAISE EXCEPTION 'Revision history was overwritten'; END IF;
 IF has_column_privilege('authenticated','public.evaluations','internal_notes','SELECT') THEN RAISE EXCEPTION 'Candidate can read reviewer notes'; END IF;
 IF has_table_privilege('authenticated','public.scope_revisions','UPDATE') OR has_table_privilege('authenticated','public.scope_revisions','INSERT') OR has_table_privilege('authenticated','public.scope_revisions','DELETE') THEN RAISE EXCEPTION 'Candidate can alter history'; END IF;
 IF (SELECT count(*) FROM public.scope_submissions WHERE session_id=sid)<>0 THEN RAISE EXCEPTION 'Stage 2 must not submit or lock Scope'; END IF;
 RAISE NOTICE 'Scope revision, original snapshot, compatibility, progress, privacy, append-only history and no-lock checks passed';
END $$;
ROLLBACK;