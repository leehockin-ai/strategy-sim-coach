REVOKE ALL ON public.activity_definitions FROM anon,authenticated;
GRANT SELECT ON public.activity_definitions TO authenticated;
REVOKE ALL ON public.activity_runs,public.activity_artifact_history FROM anon,authenticated;
GRANT SELECT ON public.activity_runs,public.activity_artifact_history TO authenticated;
REVOKE ALL ON public.activity_events FROM anon,authenticated;
GRANT SELECT(id,run_id,sequence,event_type,actor_type,actor_id,content,metadata,occurred_at,simulated_time_seconds,time_category,evidence_reference,message_id) ON public.activity_events TO authenticated;
