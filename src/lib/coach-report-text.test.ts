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
    expect(coachText("You chose map_out_customer_profile_with_ai.")).toBe("You chose Map out customer profile with AI.");
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
