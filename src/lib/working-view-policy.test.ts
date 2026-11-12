import { it, expect } from "vitest";
import { scopeEvidenceForSection, CORE_BRIEF_FIELDS } from "./scope-brief";
import { COACH_FACING_LANGUAGE_RULE } from "./assessment-evidence-policy";

it("core working view is the real challenge and decision to enable", () => {
  expect([...CORE_BRIEF_FIELDS].sort()).toEqual(["coaching_challenge", "decision_to_enable"]);
});
it("blank optional brief fields are labelled as not evidence; blank core fields are not articulated", () => {
  const out = scopeEvidenceForSection("situation_framing", { coaching_challenge: "x" });
  expect(out).toContain("Decision to enable: (not articulated)");
  expect(out).toContain("Client situation: (optional; left blank — not evidence either way)");
  expect(out).not.toContain("Client situation: (not articulated)");
});
it("assessment instructions forbid penalising blank optional fields", () => {
  expect(COACH_FACING_LANGUAGE_RULE).toContain("blank optional field is never itself negative evidence");
});
