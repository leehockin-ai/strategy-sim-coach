import { describe, expect, it } from "vitest";
import { activityEventSchema, artifactForWorkspace, PUBLIC_EVENT_COLUMNS, workspaceKind } from "./activity-runtime";

const base = { runId: "00000000-0000-4000-8000-000000000001", requestKey: "00000000-0000-4000-8000-000000000002", content: "Candidate evidence", type: "coach_message" };
describe("activity evidence boundary", () => {
  it("candidates cannot supply a team response or participant state event", () => {
    expect(activityEventSchema.safeParse({ ...base, type: "team_response" }).success).toBe(false);
    expect(activityEventSchema.safeParse({ ...base, type: "participant_state_change" }).success).toBe(false);
  });
  it("candidates cannot supply reviewer metadata or impersonate a team actor", () => {
    expect(activityEventSchema.safeParse({ ...base, reviewer_metadata: { decision: "approved" } }).success).toBe(false);
    expect(activityEventSchema.safeParse({ ...base, actor_type: "team" }).success).toBe(false);
  });
  it("artifact edits require an event and the observed artifact revision", () => {
    expect(activityEventSchema.safeParse({ ...base, artifact: { notes: "Evidence" } }).success).toBe(false);
    expect(activityEventSchema.safeParse({ ...base, type: "artifact_edit", artifact: {} }).success).toBe(false);
    expect(activityEventSchema.safeParse({ ...base, type: "artifact_edit", artifact: { notes: "Evidence" }, expectedRevision: 0 }).success).toBe(true);
  });
  it("candidate stop requires their rationale", () => {
    expect(activityEventSchema.safeParse({ ...base, type: "candidate_stop", content: " " }).success).toBe(false);
    expect(activityEventSchema.safeParse({ ...base, type: "candidate_stop", content: "No evidence available" }).success).toBe(true);
  });
  it("candidate event projection excludes private and retry payloads", () => {
    const columns = PUBLIC_EVENT_COLUMNS.split(",");
    expect(columns).not.toContain("participant_state");
    expect(columns).not.toContain("reviewer_metadata");
    expect(columns).not.toContain("request_payload");
    expect(columns).toContain("evidence_reference");
  });
});
describe("workspace compatibility", () => {
  it("dispatches different workspace types without requiring canvas cells", () => {
    expect(workspaceKind("bmc")).toBe("canvas");
    expect(workspaceKind("ecosystem_mapping")).toBe("structured");
    expect(artifactForWorkspace("notes", { notes: "Unknowns" })).toEqual({ notes: "Unknowns" });
  });
  it("renders legacy flat and nested canvas states without rewriting them", () => {
    const flat = { jobs: ["One", "Two"], __meta__jobs: '{"confidence":"low","ambiguity":true}' };
    const nested = { cells: { jobs: { value: "One\nTwo", confidence: "low", ambiguity: true } } };
    const before = JSON.stringify([flat, nested]);
    expect(artifactForWorkspace("canvas", flat)).toEqual(artifactForWorkspace("canvas", nested));
    expect(JSON.stringify([flat, nested])).toBe(before);
  });
});
import { normalizeStrategyzerUrl } from "./activity-runtime";
describe("Strategyzer URL handling", () => {
  const hosts = ["strategyzer.com"];
  it("accepts https Strategyzer subdomains", () => expect(normalizeStrategyzerUrl(" https://app.strategyzer.com/p/1 ", hosts)).toMatchObject({ ok: true, host: "app.strategyzer.com" }));
  it("rejects http", () => expect(normalizeStrategyzerUrl("http://strategyzer.com/x", hosts).ok).toBe(false));
  it("rejects lookalike domains", () => expect(normalizeStrategyzerUrl("https://strategyzer.com.evil.io/x", hosts).ok).toBe(false));
  it("rejects suffix tricks", () => expect(normalizeStrategyzerUrl("https://evilstrategyzer.com/x", hosts).ok).toBe(false));
  it("rejects script payloads", () => expect(normalizeStrategyzerUrl("javascript:alert(1)", hosts).ok).toBe(false));
  it("rejects credentials in URL", () => expect(normalizeStrategyzerUrl("https://a:b@strategyzer.com/", hosts).ok).toBe(false));
});
