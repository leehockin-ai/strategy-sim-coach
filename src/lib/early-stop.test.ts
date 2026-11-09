import { describe, expect, it } from "vitest";
import { conclusionModeFor, readConclusionMode, roomPhase, type PublicEvent } from "./live-team";
import { hasConcludedEvent, roomStage } from "./chapter2-progress";
import { assembleLiveEvidence, renderLiveEvidence, LIVE_EVIDENCE_RULES, type EvidenceEventRow } from "./evaluation-live-evidence";

// Coaching evidence integrity fix #1: an intentional early stop is recorded truthfully,
// never as a fabricated synthesis step. These test record shape/routing, not AI judgment.
const sys = (kind: string): PublicEvent => ({ event_type: "activity_transition", actor_type: "system", metadata: { team_kind: kind } });
const concluded = (mode?: string): PublicEvent => ({ event_type: "decision", actor_type: "coach", metadata: mode ? { team_kind: "concluded", conclusion_mode: mode } : { team_kind: "concluded" } });

describe("early stop conclusion rule", () => {
  it("allows an early stop directly from the working phase, with no synthesis needed", () => {
    expect(conclusionModeFor(roomPhase([sys("session_started")]), "early_stop")).toEqual({ ok: true, mode: "early_stop" });
  });
  it("normal conclusion still requires the synthesis step (unchanged)", () => {
    expect(conclusionModeFor(roomPhase([sys("session_started")]), "after_synthesis").ok).toBe(false);
    expect(conclusionModeFor(roomPhase([sys("session_started"), sys("synthesis_started")]), "after_synthesis")).toEqual({ ok: true, mode: "after_synthesis" });
  });
  it("rejects early stop before the room opens, after synthesis, or once concluded (retry cannot double-conclude)", () => {
    expect(conclusionModeFor("not_started", "early_stop").ok).toBe(false);
    expect(conclusionModeFor("synthesis", "early_stop").ok).toBe(false);
    expect(conclusionModeFor("concluded", "early_stop").ok).toBe(false);
    expect(conclusionModeFor("concluded", "after_synthesis").ok).toBe(false);
  });
  it("an early-stopped room reads as concluded and passes the Chapter 2 guard, even with an empty wall", () => {
    const events = [sys("session_started"), concluded("early_stop")];
    expect(roomPhase(events)).toBe("concluded");
    expect(roomStage("concluded", true)).toBe("concluded");
    expect(hasConcludedEvent(events as never)).toBe(true);
    expect(events.some(e => (e.metadata as { team_kind: string }).team_kind === "synthesis_started")).toBe(false);
  });
  it("older conclusions without a marker stay 'unspecified' and still count as concluded", () => {
    expect(readConclusionMode({ team_kind: "concluded" })).toBe("unspecified");
    expect(readConclusionMode({ conclusion_mode: "made_up" })).toBe("unspecified");
    expect(roomPhase([sys("session_started"), sys("synthesis_started"), concluded()])).toBe("concluded");
  });
});

const run = { id: "run", session_id: "s", candidate_id: "owner", scenario_id: "sc", runtime_type: "strategyzer_external", intervention_slug: "i", scope_revision_id: null, started_at: "2026-11-09T10:00:00Z", last_sequence: 10 };
const ev = (id: string, seq: number, actor: string, kind: string, content: string, extra: Record<string, unknown> = {}): EvidenceEventRow => ({ id, run_id: "run", sequence: seq, event_type: kind === "concluded" ? "decision" : "event", actor_type: actor, actor_id: actor, content, occurred_at: `2026-11-09T10:00:0${seq}Z`, metadata: { team_kind: kind, ...extra } });
const input = (events: EvidenceEventRow[]) => ({ sessionId: "s", ownerId: "owner", scenarioId: "sc", runs: [run], events, revisions: [], scopes: [] });

describe("early stop in evaluator and reviewer evidence", () => {
  it("labels an early stop, keeps its rationale and provenance, and contains no synthesis checkpoint", () => {
    const e = assembleLiveEvidence(input([ev("start", 1, "system", "session_started", "Started"), ev("q", 2, "coach", "utterance", "What have you seen?"), ev("end", 3, "coach", "concluded", "Stopping: we lack evidence to map further.", { conclusion_mode: "early_stop" })]));
    const c = e.runs[0].moments.find(m => m.kind === "conclusion")!;
    expect(c).toMatchObject({ id: "end", sequence: 3, timestamp: "2026-11-09T10:00:03Z", speaker: "Coach", conclusionType: "early_stop", text: "Stopping: we lack evidence to map further." });
    expect(e.runs[0].moments.some(m => m.text.includes("Synthesis checkpoint"))).toBe(false);
    expect(e.runs[0].gaps).toContain("No team-owned work recorded; this is not evidence of weak coaching.");
    expect(renderLiveEvidence(e, "working_session_facilitation")).toContain('"conclusionType":"early_stop"');
    expect(LIVE_EVIDENCE_RULES).toContain("do not credit a synthesis that did not occur");
  });
  it("normal synthesis conclusions are labelled after_synthesis; historical ones unspecified", () => {
    const base = [ev("start", 1, "system", "session_started", "Started"), ev("syn", 2, "system", "synthesis_started", "Synthesis checkpoint: the coach brings the team back together.")];
    expect(assembleLiveEvidence(input([...base, ev("end", 3, "coach", "concluded", "We have enough to decide.", { conclusion_mode: "after_synthesis" })])).runs[0].moments.find(m => m.kind === "conclusion")?.conclusionType).toBe("after_synthesis");
    expect(assembleLiveEvidence(input([...base, ev("end", 3, "coach", "concluded", "Old record rationale")])).runs[0].moments.find(m => m.kind === "conclusion")?.conclusionType).toBe("unspecified");
  });
  it("another user's run yields no evidence (ownership)", () => {
    expect(assembleLiveEvidence({ ...input([ev("start", 1, "system", "session_started", "S"), ev("end", 2, "coach", "concluded", "Stop early now please", { conclusion_mode: "early_stop" })]), ownerId: "intruder" }).runs).toHaveLength(0);
  });
});
