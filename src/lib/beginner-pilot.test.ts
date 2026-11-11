import { describe, expect, it } from "vitest";
import {
  beginMeetingOne,
  beginMeetingTwo,
  claimCheckpoint,
  completeCheckpoint,
  event,
  handoff,
  newPilot,
  PILOT_NINE_DIMENSIONS,
  pilotAssessmentContext,
  saveScope,
  stopPilot,
  validateClientUpdate,
} from "./beginner-pilot";
function required<T>(v: T | null | undefined): T {
  if (v == null) throw new Error("Missing fixture");
  return v;
}
const ready = () => {
  let s = newPilot("owner");
  s = saveScope(
    s,
    { success: "Choose one segment" },
    "defer",
    "Coach first before using the tool.",
  );
  s = beginMeetingOne(s);
  const reply = event(
    "one",
    "team",
    "Sam Okafor",
    "I will ask three rotating workers what happens before a shift.",
  );
  s = { ...s, events: [...s.events, reply] };
  return { s: handoff(s, "The team has agreed what evidence to gather."), reply };
};
const update = (source: string, basis: "team_agreed" | "team_initiated" = "team_agreed") => ({
  summary: "Mixed early signals",
  actions: [
    {
      participant: "Sam Okafor",
      description: "Talked to workers",
      agreementSourceIds: basis === "team_agreed" ? [source] : [],
      basis,
    },
  ],
  evidence: [
    {
      id: "e1",
      participant: "Sam Okafor",
      report: "Two of three planned differently",
      limitation: "Three convenience contacts",
      kind: "contradictory" as const,
    },
  ],
  changes: [
    {
      operation: "revise" as const,
      targetId: "focus",
      category: "customer" as const,
      proposal: "Rotating workers",
      participant: "Sam Okafor",
      evidenceIds: ["e1"],
      reason: "Segment unclear",
    },
  ],
  openQuestions: ["Do households coordinate?"],
});
describe("ShiftNest beginner pilot", () => {
  it("blocked checkpoint never retries AI on reload", () => {
    const { s } = ready();
    const checkpoint = required(s.checkpoint);
    expect(() =>
      claimCheckpoint(
        {
          ...s,
          checkpoint: { ...checkpoint, blocked: true, status: "failed", error: "AI access denied" },
        },
        "retry",
        1,
      ),
    ).toThrow("AI access denied");
  });
  it("binds handoff to the exact saved Scope revision", () => {
    const { s } = ready();
    expect(s.checkpoint?.input.scopeId).toBe(s.scopes[0].id);
    expect(s.checkpoint?.input.approach).toBe("defer");
  });
  it("accepts team agreement only from that participant's saved speech", () => {
    const { s, reply } = ready();
    expect(validateClientUpdate(update(reply.id), required(s.checkpoint)).actions[0].basis).toBe(
      "team_agreed",
    );
    expect(() =>
      validateClientUpdate(update(required(s.events.at(-1)).id), required(s.checkpoint)),
    ).toThrow(/participant's saved speech/);
  });
  it("rejects unsupported simulated evidence references", () => {
    const { s, reply } = ready();
    const bad = update(reply.id);
    bad.changes[0].evidenceIds = ["missing"];
    expect(() => validateClientUpdate(bad, required(s.checkpoint))).toThrow(/Unsupported/);
  });
  it("allows one active generation claim and returns a completed checkpoint unchanged", () => {
    const { s, reply } = ready();
    const running = claimCheckpoint(s, "a", 1);
    expect(() => claimCheckpoint(running, "b", 2)).toThrow(/already/);
    const done = completeCheckpoint(running, "a", update(reply.id));
    expect(claimCheckpoint(done, "c", 3)).toBe(done);
  });
  it("requires the candidate to see the exact update before meeting two", () => {
    const { s, reply } = ready();
    const done = completeCheckpoint(claimCheckpoint(s, "a", 1), "a", update(reply.id));
    expect(() => beginMeetingTwo(done)).toThrow();
    expect(
      beginMeetingTwo({
        ...done,
        checkpoint: { ...required(done.checkpoint), seenAt: "2026-11-11T13:00:00Z" },
      }).phase,
    ).toBe("two");
  });
  it("records justified intentional stop without creating a handoff", () => {
    let s = saveScope(newPilot("owner"), {}, "playbook", "Use the preview only if useful.");
    s = stopPilot(beginMeetingOne(s), "The team lacks evidence to map yet.");
    expect(s.phase).toBe("stopped");
    expect(s.checkpoint).toBeNull();
  });
  it("keeps the nine dimensions and protects against homework polish scoring", () => {
    const { s } = ready();
    expect(PILOT_NINE_DIMENSIONS).toHaveLength(9);
    expect(pilotAssessmentContext(s, "working_session_facilitation")).toContain(
      "Never score its polish",
    );
  });
});
