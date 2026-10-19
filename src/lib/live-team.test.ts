import { describe, expect, it } from "vitest";
import { initialRoom, publicTeamConfig, roomPhase, sanitizeTurn, type TeamConfig } from "./live-team";

const st = { engagement: "medium", trust: "medium", defensiveness: "low", willingness_to_contribute: "low" } as const;
const config: TeamConfig = {
  id: "c", version: 1, title: "Map your first Customer Profile (with AI)", exercise_label: "Team exercise", expected_duration_minutes: 15, instructions: "i", activity_steps: [], poc: true, methodology_approved: false,
  participants: [
    { name: "Maya", role: "Founder", visible: "v", tendency: "dominant", personality: "SECRET-PERSONALITY", beliefs: ["SECRET-BELIEF"], initial: { ...st } },
    { name: "Jordan", role: "Ops", visible: "v", tendency: "quiet", personality: "p", beliefs: [], initial: { ...st } },
  ],
  truth: { shared: [], evidence: [{ id: "poll", holder: "Jordan", kind: "unvolunteered_evidence", claim: "", reality: "SECRET-REALITY", reveal_when: "invited" }], assumptions: [], misconceptions: [], uncertainties: [], tangents: [] },
};

describe("live client team", () => {
  it("public config exposes no private participant or evidence data", () => {
    const s = JSON.stringify(publicTeamConfig(config));
    for (const secret of ["SECRET-PERSONALITY", "SECRET-BELIEF", "SECRET-REALITY", "dominant"]) expect(s).not.toContain(secret);
    expect(publicTeamConfig(config).expectedDurationMinutes).toBe(15);
  });
  it("evidence cannot surface unless its holder speaks this turn", () => {
    const room = initialRoom(config, {});
    const t = sanitizeTurn({ responses: [{ participant: "Maya", text: "Sure" }], surfaced: [{ evidence_id: "poll", by: "Jordan" }] }, config, room);
    expect(t.surfaced).toHaveLength(0);
    expect(t.next.surfaced).toEqual([]);
  });
  it("evidence surfaces once when the holder speaks, and stays surfaced", () => {
    const room = initialRoom(config, {});
    const t = sanitizeTurn({ responses: [{ participant: "Jordan", text: "I ran a poll" }], surfaced: [{ evidence_id: "poll", by: "Jordan" }] }, config, room);
    expect(t.next.surfaced).toEqual(["poll"]);
    const again = sanitizeTurn({ responses: [{ participant: "Jordan", text: "again" }], surfaced: [{ evidence_id: "poll", by: "Jordan" }] }, config, t.next);
    expect(again.surfaced).toHaveLength(0);
    expect(again.next.surfaced).toEqual(["poll"]);
  });
  it("model cannot invent participants or exceed three speakers", () => {
    const t = sanitizeTurn({ responses: [{ participant: "Coach AI", text: "Try open questions" }, { participant: "Maya", text: "a" }, { participant: "Maya", text: "b" }, { participant: "Jordan", text: "c" }, { participant: "Maya", text: "d" }] }, config, initialRoom(config, {}));
    expect(t.responses.map(r => r.participant)).not.toContain("Coach AI");
    expect(t.responses.length).toBe(3);
  });
  it("invalid state values keep the prior state; scope trust carries forward", () => {
    const room = initialRoom(config, { Maya: { trust: "high" } });
    expect(room.participants.Maya.trust).toBe("high");
    const t = sanitizeTurn({ responses: [{ participant: "Maya", text: "x" }], state: { Maya: { engagement: "ecstatic" as never } } }, config, room);
    expect(t.next.participants.Maya.engagement).toBe("medium");
  });
  it("phase follows session events", () => {
    expect(roomPhase([])).toBe("not_started");
    expect(roomPhase([{ event_type: "system_event", actor_type: "system", metadata: { team_kind: "session_started" } }])).toBe("working");
    expect(roomPhase([{ event_type: "system_event", actor_type: "system", metadata: { team_kind: "session_started" } }, { event_type: "decision", actor_type: "coach", metadata: { team_kind: "concluded" } }])).toBe("concluded");
  });
});
