import { describe, expect, it } from "vitest";
import { engagementBriefSchema, readEngagementBrief, legacyFraming, SCOPE_COMPETENCIES, scopeEvidenceForSection } from "./scope-brief";

describe("candidate Scope evidence", () => {
  it("does not auto-invent the problem, decision, scope, intervention or rationale", () => {
    const brief = readEngagementBrief({});
    expect(brief.coaching_challenge).toBe("");
    expect(brief.decision_to_enable).toBe("");
    expect(brief.scope).toBe("");
    expect(brief.intervention_sequence).toEqual([]);
  });
  it("allows a single intervention without requiring a sequence", () => {
    expect(engagementBriefSchema.parse({ decision_to_enable: "Sponsor decides whether to fund a pilot" }).intervention_sequence).toEqual([]);
  });
  it("preserves an optional ordered multiple-Playbook proposal and each rationale", () => {
    const sequence = [{ slug: "customer_profile_interviews", rationale: "Find the segment before design" }, { slug: "strong_value_propositions", rationale: "Only after repeated jobs are supported" }];
    expect(engagementBriefSchema.parse({ intervention_sequence: sequence }).intervention_sequence).toEqual(sequence);
  });
  it("reads historical framing without modifying it", () => {
    const historical = '{"decision":"Whether to launch","unclear":"Demand","tried":"Prototype","nothing":"Runway","success":"Paid pilots"}';
    expect(legacyFraming(historical).decision).toBe("Whether to launch");
    expect(legacyFraming("Original plain-text evidence")).toEqual({ decision: "Original plain-text evidence" });
    expect(historical).toBe('{"decision":"Whether to launch","unclear":"Demand","tried":"Prototype","nothing":"Runway","success":"Paid pilots"}');
  });
  it("retains linked stakeholder evidence and the candidate's change explanation", () => {
    const brief = engagementBriefSchema.parse({ evidence_message_ids: ["11111111-1111-4111-8111-111111111111"], revision_note: "Sponsor cannot attend, so narrowed the session to an evidence decision" });
    expect(brief.evidence_message_ids).toEqual(["11111111-1111-4111-8111-111111111111"]);
    expect(brief.revision_note).toContain("Sponsor cannot attend");
  });
  it("maps ten competencies to four existing scoring sections, not ten new calls", () => {
    expect(SCOPE_COMPETENCIES).toHaveLength(10);
    expect([...new Set(SCOPE_COMPETENCIES.map(c => c.section))].sort()).toEqual(["coaching_strategy", "intervention_fit", "situation_framing", "stakeholder_navigation"]);
    expect(SCOPE_COMPETENCIES.find(c => c.name === "Decision Clarity")?.fields).toEqual(["decision_to_enable", "decision_maker", "evidence"]);
  });
  it("keeps Scope evidence out of Apply execution scoring", () => {
    expect(scopeEvidenceForSection("intervention_execution", { decision_to_enable: "Fund pilot" })).toBe("");
  });
});