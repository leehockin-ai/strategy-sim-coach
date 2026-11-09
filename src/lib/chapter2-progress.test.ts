import { describe, expect, it } from "vitest";
import { chapter3Readiness, hasConcludedEvent, hasRecordedSkip, roomStage } from "./chapter2-progress";

const base = { pathwayType: "playbook", chosenSlug: "customer_profile", currentStatus: "working_session", concludedRun: false, skip: null, legacyCanvas: null };

describe("Chapter 2 → Chapter 3 readiness", () => {
  it("blocks a Playbook session that has neither concluded nor recorded a reason", () => {
    expect(chapter3Readiness(base)).toEqual({ allowed: false, basis: "needs_conclusion_or_skip" });
  });
  it("allows once the working session is concluded", () => {
    expect(chapter3Readiness({ ...base, concludedRun: true })).toEqual({ allowed: true, basis: "concluded" });
  });
  it("allows an explicit skip with a recorded reason of at least 10 characters", () => {
    expect(chapter3Readiness({ ...base, skip: { reason: "Room unavailable in this session" } }).allowed).toBe(true);
    expect(chapter3Readiness({ ...base, skip: { reason: "too short" } }).allowed).toBe(false);
    expect(hasRecordedSkip({ reason: "          " })).toBe(false);
  });
  it("does not treat being unavailable (no run) as permission to continue", () => {
    expect(chapter3Readiness({ ...base, concludedRun: false, skip: null }).allowed).toBe(false);
  });
  it("keeps legacy sessions working: non-Playbook pathways, earlier canvas evidence, already advanced", () => {
    expect(chapter3Readiness({ ...base, pathwayType: "evidence_gathering" }).basis).toBe("not_gated");
    expect(chapter3Readiness({ ...base, chosenSlug: null }).basis).toBe("not_gated");
    expect(chapter3Readiness({ ...base, legacyCanvas: { cells: {} } }).basis).toBe("legacy_evidence");
    expect(chapter3Readiness({ ...base, currentStatus: "intervention" }).basis).toBe("already_advanced");
    expect(chapter3Readiness({ ...base, currentStatus: "evaluated" }).basis).toBe("already_advanced");
  });
  it("treats an unknown intervention slug as a Playbook (gated), matching Chapter 2 rendering", () => {
    expect(chapter3Readiness({ ...base, pathwayType: undefined }).allowed).toBe(false);
  });
  it("detects conclusion only from a concluded team event", () => {
    expect(hasConcludedEvent([{ metadata: { team_kind: "synthesis_started" } }, { metadata: null }])).toBe(false);
    expect(hasConcludedEvent([{ metadata: { team_kind: "concluded" } }])).toBe(true);
  });
});

describe("working session stages", () => {
  it("maps room phases to start / facilitate / bring together / conclude", () => {
    expect(roomStage(false, "working")).toBe("connect");
    expect(roomStage(true, "not_started")).toBe("begin");
    expect(roomStage(true, "working")).toBe("facilitate");
    expect(roomStage(true, "synthesis")).toBe("bring_together");
    expect(roomStage(true, "concluded")).toBe("concluded");
  });
});
