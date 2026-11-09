import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { assembleLiveEvidence, type EvidenceEventRow, type EvidenceRevisionRow } from "./evaluation-live-evidence";
import { publicStakeholders } from "./scenario-visibility";

// Caller must have checked session ownership or reviewer role. RLS remains the read boundary.
// No privileged client or private tables are needed to assess public observable behavior.
export async function loadLiveEvaluationEvidence(client: SupabaseClient<Database>, session: { id: string; owner_id: string | null; scenario_id: string }) {
  if (!session.owner_id) return { version: "public_live_v1" as const, runs: [], omittedRuns: 0 };
  const runsResult = await client.from("activity_runs").select("id,session_id,candidate_id,scenario_id,runtime_type,intervention_slug,scope_revision_id,started_at,last_sequence").eq("session_id", session.id).eq("candidate_id", session.owner_id).eq("runtime_type", "strategyzer_external").order("started_at", { ascending: false }).limit(5);
  if (runsResult.error) throw new Error("Live assessment evidence could not be loaded");
  const runs = (runsResult.data ?? []).slice(0, 4);
  if (!runs.length) return { version: "public_live_v1" as const, runs: [], omittedRuns: 0 };
  const scenario = await client.from("scenarios").select("stakeholders").eq("id", session.scenario_id).single();
  if (scenario.error) throw new Error("Public participant identities could not be loaded");
  const identities = publicStakeholders(scenario.data.stakeholders).map(p => ({ name: p.name, role: p.role ?? "" }));
  const events: EvidenceEventRow[] = [], revisions: EvidenceRevisionRow[] = [];
  const columns = "id,run_id,sequence,event_type,actor_type,actor_id,content,occurred_at,metadata" as const;
  for (const run of runs) {
    const [eventResult, historyResult, startResult] = await Promise.all([
      client.from("activity_events").select(columns).eq("run_id", run.id).lte("sequence", run.last_sequence).order("sequence", { ascending: false }).limit(601),
      client.from("activity_artifact_history").select("id,run_id,event_id,revision,state,actor_type,contribution,created_at").eq("run_id", run.id).order("revision", { ascending: false }).limit(25),
      client.from("activity_events").select(columns).eq("run_id", run.id).eq("actor_type", "system").contains("metadata", { team_kind: "session_started" }).lte("sequence", run.last_sequence).limit(1),
    ]);
    if (eventResult.error || historyResult.error || startResult.error) throw new Error("Live assessment evidence could not be loaded");
    const history = historyResult.data ?? [];
    const linkedIds = new Set<string>();
    // Follow only public revision/source links, never arbitrary private annotations.
    for (const h of history.slice(0, 8)) {
      linkedIds.add(h.event_id);
      const c = h.contribution as { instruction_event_id?: unknown } | null;
      if (typeof c?.instruction_event_id === "string") linkedIds.add(c.instruction_event_id);
      const state = h.state as { sections?: { items?: { sourceId?: unknown }[] }[] } | null;
      if (Array.isArray(state?.sections)) for (const s of state.sections.slice(0, 8)) if (Array.isArray(s.items)) for (const i of s.items.slice(0, 12)) if (typeof i.sourceId === "string") linkedIds.add(i.sourceId);
    }
    const missing = [...linkedIds].filter(id => /^[0-9a-f-]{36}$/i.test(id) && !eventResult.data?.some(e => e.id === id)).slice(0, 800);
    const linked = missing.length ? await client.from("activity_events").select(columns).eq("run_id", run.id).in("id", missing).lte("sequence", run.last_sequence) : { data: [], error: null };
    if (linked.error) throw new Error("Live revision sources could not be loaded");
    events.push(...new Map([...(eventResult.data ?? []), ...(startResult.data ?? []), ...(linked.data ?? [])].map(e => [e.id, e])).values());
    revisions.push(...history);
  }
  const scopeIds = runs.flatMap(r => r.scope_revision_id ? [r.scope_revision_id] : []);
  const scopes = scopeIds.length ? await client.from("scope_revisions").select("id,session_id,revision,snapshot").eq("session_id", session.id).in("id", scopeIds) : { data: [], error: null };
  if (scopes.error) throw new Error("Bound Scope assessment evidence could not be loaded");
  return assembleLiveEvidence({ sessionId: session.id, ownerId: session.owner_id, scenarioId: session.scenario_id, runs, events, revisions, scopes: scopes.data ?? [], identities, omittedRuns: Math.max(0, (runsResult.data?.length ?? 0) - 4) });
}