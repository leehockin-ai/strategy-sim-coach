import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { assembleLiveEvidence, type EvidenceEventRow } from "./evaluation-live-evidence";
import { buildChapter3Summary } from "./chapter3-summary";

// Phase 3: Chapter 3 summary is built only from bound public evidence. These assert
// routing/provenance/disposition, not coaching quality.
const run = { id: "run", session_id: "session", candidate_id: "owner", scenario_id: "scenario", runtime_type: "strategyzer_external", intervention_slug: "map", scope_revision_id: "bound", started_at: "2026-11-09T10:00:00Z", last_sequence: 10 };
const ev = (id: string, seq: number, actor: string, kind: string, content: string, speaker = actor, extra: Record<string, unknown> = {}): EvidenceEventRow => ({ id, run_id: "run", sequence: seq, event_type: kind === "concluded" ? "decision" : kind === "work_product" ? "artifact_contribution" : "event", actor_type: actor, actor_id: speaker, content, occurred_at: `2026-11-09T10:00:0${seq}Z`, metadata: { team_kind: kind, private_hint: "SECRET_TRUTH", ...extra } });
const scopes = [
  { id: "bound", session_id: "session", revision: 1, snapshot: { engagement_brief: { success: "Decide which customer problem to test", decision_to_enable: "Pick one segment", decision_maker: "Maya", assumptions: "Segment B cares about speed" } } },
  { id: "later", session_id: "session", revision: 3, snapshot: { engagement_brief: { success: "NEWER OUTCOME" } } },
];
const base = [ev("start", 1, "system", "session_started", "Started"), ev("coach", 2, "coach", "utterance", "Sofia, what have you seen?"), ev("team", 3, "team", "response", "Only two interviews; the problem is uncertain.", "Sofia")];
const work = { id: "rev1", run_id: "run", event_id: "work", revision: 1, actor_type: "team", created_at: "2026-11-09T10:00:04Z", contribution: { base_revision: 0, instruction_event_id: "coach" }, state: { provenance: "simulated_client_team", status: "partial", sections: [{ key: "pains", label: "x", items: [{ text: "the problem is uncertain", sourceId: "team", speaker: "Sofia" }] }] } };
const evidence = (events: EvidenceEventRow[], revisions: typeof work[] = [], scopeRows = scopes, r = run) => assembleLiveEvidence({ sessionId: "session", ownerId: "owner", scenarioId: "scenario", runs: [r], events, revisions, scopes: scopeRows });
const build = (e: ReturnType<typeof evidence>, extra: Partial<Parameters<typeof buildChapter3Summary>[0]> = {}) => buildChapter3Summary({ evidence: e, skip: null, roomUnavailable: null, latestScopeRevision: 3, ...extra });

describe("Chapter 3 summary", () => {
  it("shows the outcome from the BOUND brief revision, never a newer one, and counts later versions", () => {
    const s = build(evidence([...base, ev("end", 5, "coach", "concluded", "Done", "coach", { conclusion_mode: "after_synthesis" })]));
    expect(s.outcome).toMatchObject({ status: "bound", revision: 1, success: "Decide which customer problem to test", decision: "Pick one segment", decisionMaker: "Maya", laterRevisions: 2 });
    expect(JSON.stringify(s)).not.toContain("NEWER OUTCOME");
  });
  it("never substitutes a brief when the run isn't bound, and flags an empty bound brief", () => {
    expect(build(evidence(base, [], scopes, { ...run, scope_revision_id: null })).outcome).toEqual({ status: "unbound" });
    expect(build(evidence(base, [], [{ id: "bound", session_id: "session", revision: 1, snapshot: { engagement_brief: {} } }])).outcome).toMatchObject({ status: "bound_empty", revision: 1 });
  });
  it("attributes wall items and team statements to their speaker and source, separate from coach turns", () => {
    const s = build(evidence([...base, ev("work", 4, "team", "work_product", "First pass", "client_team")], [work]));
    expect(s.wall?.sections[0].items[0]).toEqual({ text: "the problem is uncertain", speaker: "Sofia", sourceId: "team" });
    expect(s.teamStatements).toEqual([{ id: "team", speaker: "Sofia", text: "Only two interviews; the problem is uncertain.", timestamp: "2026-11-09T10:00:03Z" }]);
    expect(s.teamStatements.some(t => t.text.includes("what have you seen"))).toBe(false);
    expect(s.coachStatementCount).toBe(1);
  });
  it("early stop: labelled with rationale, no invented synthesis, empty wall is not a failure", () => {
    const s = build(evidence([...base, ev("end", 4, "coach", "concluded", "Stopping: not enough evidence yet.", "coach", { conclusion_mode: "early_stop" })]));
    expect(s.disposition).toEqual({ kind: "early_stop", at: "2026-11-09T10:00:04Z", rationale: "Stopping: not enough evidence yet." });
    expect(s.wall).toBeNull();
  });
  it("historical conclusions stay unspecified", () => {
    expect(build(evidence([...base, ev("end", 4, "coach", "concluded", "Old")])).disposition.kind).toBe("unspecified");
  });
  it("skip reason is shown verbatim, including when the room was unavailable", () => {
    const skip = { reason: "The team wasn't ready to map yet.", recorded_at: "2026-11-09T11:00:00Z" };
    expect(build({ version: "public_live_v1", runs: [], omittedRuns: 0 }, { skip, roomUnavailable: "poc_not_allowlisted" }).disposition).toEqual({ kind: "skipped", reason: skip.reason, at: skip.recorded_at, roomUnavailable: true });
    expect(build({ version: "public_live_v1", runs: [], omittedRuns: 0 }, { roomUnavailable: "poc_not_allowlisted" }).disposition).toEqual({ kind: "unavailable" });
    expect(build({ version: "public_live_v1", runs: [], omittedRuns: 0 }).disposition).toEqual({ kind: "no_room" });
  });
  it("never carries private metadata into the candidate summary; another owner's run yields nothing", () => {
    const e = evidence([...base, ev("end", 4, "coach", "concluded", "x", "coach", { conclusion_mode: "early_stop" })]);
    expect(JSON.stringify(build(e))).not.toContain("SECRET_TRUTH");
    const other = assembleLiveEvidence({ sessionId: "session", ownerId: "intruder", scenarioId: "scenario", runs: [run], events: base, revisions: [], scopes });
    expect(build(other).teamStatements).toHaveLength(0);
  });
  it("summary is read-only: its server function performs no writes and doesn't touch evaluations", () => {
    const src = readFileSync(new URL("./chapter3.functions.ts", import.meta.url), "utf8");
    expect(src).not.toMatch(/\.(insert|update|upsert|delete)\(/);
    expect(src).not.toContain("evaluations");
    expect(src).toContain('session.owner_id !== context.userId');
  });
});
