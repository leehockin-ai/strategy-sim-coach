import { expect, it } from "vitest";
import { freezeAssessmentEvidence, THREE_CHAPTER_EVIDENCE_FROM, THREE_CHAPTER_EVIDENCE_POLICY } from "./assessment-evidence-policy";
import { buildSectionInput, extractInputQualitySignals, type SessionForEval } from "./evaluation.io";

const evidence = { version: "public_live_v1" as const, runs: [], omittedRuns: 0 };
const session = (modern = true): SessionForEval => ({ candidate_name: "Test", scenarios: { title: "Client", summary: "Public" }, live_evidence: modern ? freezeAssessmentEvidence(evidence, THREE_CHAPTER_EVIDENCE_FROM) : evidence } as SessionForEval);

it("only newly created sessions get the frozen applicability policy; historical/unknown sessions remain legacy", () => {
  expect(freezeAssessmentEvidence(evidence, "2026-11-09T16:17:59Z")).toBe(evidence);
  expect(freezeAssessmentEvidence(evidence, undefined)).toBe(evidence);
  expect(freezeAssessmentEvidence(evidence, THREE_CHAPTER_EVIDENCE_FROM).assessmentPolicy).toBe(THREE_CHAPTER_EVIDENCE_POLICY);
  expect(evidence).not.toHaveProperty("assessmentPolicy");
});
it("absent optional notes are not negative evidence in new assessment inputs", () => {
  const s = session(); s.dialogue_commitments = null;
  expect(extractInputQualitySignals(s, []).standalone_commitments_optional).toBe(true);
  expect(extractInputQualitySignals(s, []).dialogue_commitments_chars).toBe(0);
  for (const key of ["stakeholder_navigation", "methodological_soundness", "intervention_fit"] as const) {
    const input = buildSectionInput(key, s, []);
    expect(input).toContain("optional standalone notes not supplied");
    expect(input).not.toContain("(none captured)");
  }
});
it("actual agreed next steps are preserved, while candidate plans remain labelled as interpretations", () => {
  const s = session(); s.dialogue_commitments = "Sofia agreed to interview three postgrads on Tuesday.";
  s.intervention_recommendation = "Ask Sofia to test willingness to pay.";
  const turns = [{ role: "stakeholder", stakeholder_name: "Sofia", content: "I will interview three postgrads on Tuesday.", phase: "scoping", created_at: "2026-11-10T10:00:00Z" }];
  const input = buildSectionInput("stakeholder_navigation", s, turns);
  expect(input).toContain(s.dialogue_commitments);
  expect(input).toContain(turns[0].content);
  expect(input).toContain(s.intervention_recommendation);
  expect(input).toContain("not proof of client agreement");
  expect(buildSectionInput("intervention_fit", s, turns)).not.toContain(s.intervention_recommendation);
});
it("genuinely weak next steps remain assessable; no automatic credit or invented agreement", () => {
  const s = session(); s.intervention_recommendation = "Do more research sometime.";
  expect(buildSectionInput("intervention_discipline", s, [])).toContain(s.intervention_recommendation);
  expect(buildSectionInput("stakeholder_navigation", s, [])).toContain("Genuinely absent, vague, imposed or unsupported next steps remain valid gaps");
  expect(buildSectionInput("stakeholder_navigation", s, [])).toContain("must not itself cause negative feedback or free credit");
});
it("old sessions/jobs retain original empty-field input and quality applicability", () => {
  const s = session(false);
  expect(buildSectionInput("stakeholder_navigation", s, [])).toContain("(none captured)");
  expect(buildSectionInput("intervention_fit", s, [])).toContain("(none captured)");
  expect(extractInputQualitySignals(s, []).standalone_commitments_optional).toBe(false);
});