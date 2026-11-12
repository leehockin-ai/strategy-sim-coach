import { describe, it, expect } from "vitest";
import { coachText, coachDisplayTitle, COACH_SECTION_DESCRIPTION } from "./coach-report-text";
import { SECTION_RUBRIC } from "./evaluation.functions";

describe("coach-facing report text", () => {
  it("removes field names with null values", () => {
    expect(coachText("Commitments missing (dialogue_commitments: null).")).not.toMatch(/dialogue_commitments|null/);
  });
  it("removes UUIDs and sequence numbers", () => {
    const out = coachText("At sequence 18 (moment 3c88464d-bc57-4e7f-94f9-12f0fc0d74c2) you asked a question.");
    expect(out).not.toMatch(/[0-9a-f]{8}-|sequence|18/);
  });
  it("shows playbook display names instead of slugs", () => {
    expect(coachText("You chose map_out_customer_profile_with_ai.")).toBe("You chose Map out your customer profile with AI.");
    expect(coachText("Try how_market_ready next.")).toBe("Try How Market-Ready Are You? next.");
    expect(coachText("Try made_up_playbook.")).toBe("Try Made up playbook.");
  });
  it("addresses the coach as you", () => {
    expect(coachText("The candidate was clear and the candidate's brief was strong.")).toBe("You were clear and your brief was strong.");
  });
  it("replaces test session titles with the scenario name", () => {
    expect(coachDisplayTitle("TEST/NON-PRODUCTION — Lee Hockin — corrections verification", "The Student Founder")).toBe("The Student Founder");
    expect(coachDisplayTitle("Phase 4 validation run", "The Solution Factory")).toBe("The Solution Factory");
    expect(coachDisplayTitle("Lee Hockin", "The Student Founder")).toBe("Lee Hockin");
  });
  it("has a plain description for every rubric section", () => {
    for (const s of SECTION_RUBRIC) expect(COACH_SECTION_DESCRIPTION[s.key]).toMatch(/you/i);
  });
});

import { coachSummary, stripPracticeDraft } from "./coach-report-text";
describe("short coach summary", () => {
  it("uses generated parts when present", () => {
    expect(coachSummary({ raw_response: { overall_reading: "A.", keep_doing: "K", change_next_time: "C" } })).toEqual({ overall: "A.", keep: "K", change: "C" });
  });
  it("derives parts for existing reports: first 3 sentences, first strength, first gap", () => {
    const s = coachSummary({ overall_summary: "One. Two. Three. Four. Five.", strengths: ["s1", "s2"], gaps: ["g1"] });
    expect(s).toEqual({ overall: "One. Two. Three.", keep: "s1", change: "g1" });
  });
  it("drops the Practice Draft prefix from titles", () => {
    expect(stripPracticeDraft("Practice Draft: Harbor Bakery")).toBe("Harbor Bakery");
  });
});
