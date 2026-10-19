CREATE FUNCTION public.resolve_team_work_sources(_run uuid,_state jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE s jsonb; item jsonb; sections jsonb:='[]'; items jsonb; source public.activity_events%ROWTYPE; ref text; parts text[];
BEGIN
 FOR s IN SELECT value FROM jsonb_array_elements(_state->'sections') LOOP
  items:='[]';
  FOR item IN SELECT value FROM jsonb_array_elements(s->'items') LOOP
   ref:=item->>'sourceId';
   IF ref ~ '^request:[0-9a-f-]{36}:response:[0-2]$' THEN
    parts:=string_to_array(ref,':');
    SELECT * INTO source FROM public.activity_events WHERE run_id=_run AND request_key=md5(parts[2]||':'||((parts[4])::integer+1))::uuid;
   ELSIF ref ~ '^[0-9a-f-]{36}$' THEN
    SELECT * INTO source FROM public.activity_events WHERE run_id=_run AND id=ref::uuid;
   ELSE RAISE EXCEPTION 'Invalid team work source'; END IF;
   IF NOT FOUND OR source.actor_type<>'team' OR source.metadata->>'team_kind' IS DISTINCT FROM 'response' OR source.actor_id IS DISTINCT FROM item->>'speaker' OR nullif(item->>'text','') IS NULL OR position(item->>'text' in source.content)=0 THEN RAISE EXCEPTION 'Team work must quote a public participant response from this run'; END IF;
   items:=items||jsonb_build_array(jsonb_set(item,'{sourceId}',to_jsonb(source.id::text)));
  END LOOP;
  sections:=sections||jsonb_build_array(jsonb_set(s,'{items}',items));
 END LOOP;
 RETURN jsonb_set(_state,'{sections}',sections);
END $$;
REVOKE ALL ON FUNCTION public.resolve_team_work_sources(uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_team_work_sources(uuid,jsonb) TO service_role;
CREATE FUNCTION public.normalize_team_work_lineage() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF TG_TABLE_NAME='activity_artifact_history' THEN
  IF NEW.state->>'provenance'='simulated_client_team' THEN NEW.state:=public.resolve_team_work_sources(NEW.run_id,NEW.state); END IF;
 ELSE
  IF NEW.artifact_state->>'provenance'='simulated_client_team' THEN NEW.artifact_state:=public.resolve_team_work_sources(NEW.id,NEW.artifact_state); END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER team_work_history_lineage BEFORE INSERT ON public.activity_artifact_history FOR EACH ROW EXECUTE FUNCTION public.normalize_team_work_lineage();
CREATE TRIGGER team_work_current_lineage BEFORE UPDATE OF artifact_state ON public.activity_runs FOR EACH ROW EXECUTE FUNCTION public.normalize_team_work_lineage();