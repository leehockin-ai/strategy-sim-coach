import { expect, it } from "vitest";
import { loadLiveEvaluationEvidence } from "./evaluation-live-evidence.server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function clientFixture(denied = false) {
  const queries: { table: string; projection: string; filters: [string, unknown][] }[] = [];
  const run = { id: "run", session_id: "session", candidate_id: "owner", scenario_id: "scenario", runtime_type: "strategyzer_external", intervention_slug: "original", scope_revision_id: "bound", started_at: "2026-11-09", last_sequence: 3 };
  const rows: Record<string, unknown[]> = {
    activity_runs: [run], scenarios: [{ stakeholders: [{ name: "Sofia", role: "Research", posture: "SECRET" }] }],
    activity_events: [{ id: "start", run_id: "run", sequence: 1, event_type: "system_event", actor_type: "system", actor_id: "system", content: "Started", occurred_at: "2026-11-09T10:00:01Z", metadata: { team_kind: "session_started" } }, { id: "team", run_id: "run", sequence: 2, event_type: "team_response", actor_type: "team", actor_id: "Sofia", content: "Two interviews", occurred_at: "2026-11-09T10:00:02Z", metadata: { team_kind: "response" } }],
    activity_artifact_history: [], scope_revisions: [{ id: "bound", session_id: "session", revision: 1, snapshot: { engagement_brief: { success: "Bound outcome" } } }],
  };
  const client = { from: (table: string) => {
    const q = { table, projection: "", filters: [] as [string, unknown][] }; queries.push(q);
    const result = () => ({ data: denied ? null : rows[table] ?? [], error: denied ? { message: "RLS denied" } : null });
    const chain: Record<string, any> = {
      select: (s: string) => { q.projection = s; return chain; },
      eq: (k: string, v: unknown) => { q.filters.push([k, v]); return chain; },
      order: () => chain, limit: () => chain, lte: () => chain, contains: () => chain, in: () => chain,
      then: (resolve: (r: unknown) => void) => resolve(result()),
      single: async () => ({ ...result(), data: (result().data ?? [])[0] }),
    }; return chain;
  } } as unknown as SupabaseClient<Database>;
  return { client, queries };
}
it("reads only scoped public projections and preserves bound outcome/identity", async () => {
  const { client, queries } = clientFixture();
  const evidence = await loadLiveEvaluationEvidence(client, { id: "session", owner_id: "owner", scenario_id: "scenario" });
  expect(evidence.runs[0].scope?.brief.success).toBe("Bound outcome");
  expect(evidence.runs[0].identities).toEqual([{ name: "Sofia", role: "Research" }]);
  expect(JSON.stringify(evidence)).not.toContain("SECRET");
  expect(queries[0].filters).toContainEqual(["candidate_id", "owner"]);
  expect(queries[0].filters).toContainEqual(["session_id", "session"]);
  expect(queries.map(q => q.table)).not.toContain("activity_run_private");
  expect(queries.map(q => q.table)).not.toContain("activity_event_private");
  expect(queries.map(q => q.table)).not.toContain("team_activity_configs");
  expect(queries.every(q => !q.projection.includes("request_payload") && !q.projection.includes("*"))).toBe(true);
});
it("fails closed when RLS denies evidence instead of quietly scoring legacy blanks", async () => {
  const { client } = clientFixture(true);
  await expect(loadLiveEvaluationEvidence(client, { id: "session", owner_id: "owner", scenario_id: "scenario" })).rejects.toThrow("Live assessment evidence could not be loaded");
});