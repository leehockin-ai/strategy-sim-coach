import { describe, expect, it } from "vitest";
import { canvasForEditing, canvasSchema, SESSION_STATUSES } from "./session-compatibility";
import { stepFromStatus, chapterForStep } from "./chapters";
import { readCanvasCells, extractInputQualitySignals, type SessionForEval } from "./evaluation.io";
import { assertReviewerAccess } from "./reviewer-access";

describe("historical compatibility baseline", () => {
  const mapping = {
    intake: "framing", framing: "framing", dialogue: "stakeholder_workspace", stakeholder_workspace: "stakeholder_workspace",
    method: "coaching_approach", methodology: "coaching_approach", coaching_approach: "coaching_approach",
    application: "live_playbook", working_session: "live_playbook", live_playbook: "live_playbook",
    intervention: "next_step_judgment", next_step_judgment: "next_step_judgment",
    playbook: "engagement_orchestration", engagement_orchestration: "engagement_orchestration",
    evaluated: "engagement_orchestration", approved: "engagement_orchestration", conditional: "engagement_orchestration",
    not_approved: "engagement_orchestration", retry: "engagement_orchestration", escalated: "engagement_orchestration",
  } as const;
  for (const status of SESSION_STATUSES) it(`resumes ${status} at its existing screen`, () => {
    expect(stepFromStatus(status)).toBe(mapping[status]);
  });
  it("preserves chapter compatibility", () => {
    expect(chapterForStep(stepFromStatus("working_session"))).toBe("apply");
    expect(chapterForStep(stepFromStatus("not_approved"))).toBe("progress");
  });
  const flat = { customer_segments: "Students", jobs: ["Eat", "Save money"], __meta__customer_segments: '{"confidence":"weak","ambiguity":true}' };
  const nested = { cells: { customer_segments: { value: "Students", confidence: "weak", ambiguity: true } } };
  it("keeps flat strings, arrays and metadata readable without mutation", () => {
    const before = JSON.stringify(flat);
    expect(canvasSchema.parse(flat)).toEqual(flat);
    expect(canvasForEditing(flat)).toEqual({ cells: { customer_segments: "Students", jobs: "Eat\nSave money" }, meta: { customer_segments: { confidence: "weak", ambiguity: true } } });
    expect(readCanvasCells(flat)[0]).toEqual({ key: "customer_segments", value: "Students", confidence: "weak", unresolved: true });
    expect(JSON.stringify(flat)).toBe(before);
  });
  it("keeps nested evidence readable and saveable without mutation", () => {
    const before = JSON.stringify(nested);
    expect(canvasSchema.parse(nested)).toEqual(nested);
    expect(canvasForEditing(nested).cells.customer_segments).toBe("Students");
    expect(readCanvasCells(nested)[0]).toEqual({ key: "customer_segments", value: "Students", confidence: "weak", unresolved: true });
    expect(JSON.stringify(nested)).toBe(before);
  });
  it("preserves five-section legacy pathway evidence", () => {
    const s = { application_canvas: flat, playbook_application: { situation_summary: "s", immediate_intervention: "i", pathway: "p", risks: "r", success_criteria: "c" } } as unknown as SessionForEval;
    expect(extractInputQualitySignals(s, []).pathway_sections_filled).toBe(5);
    expect(extractInputQualitySignals(s, []).canvas_cells_total).toBe(2);
  });
});

describe("reviewer authorization", () => {
  it("rejects candidates even if they own the session", async () => {
    const client = { rpc: async () => ({ data: false, error: null }) };
    await expect(assertReviewerAccess(client as never, "candidate-owner")).rejects.toThrow("Forbidden");
  });
  it("allows an authenticated reviewer", async () => {
    const client = { rpc: async (_: string, params: { _role: string }) => ({ data: params._role === "reviewer", error: null }) };
    await expect(assertReviewerAccess(client as never, "reviewer")).resolves.toBeUndefined();
  });
  it("fails closed on a role-query error", async () => {
    const client = { rpc: async () => ({ data: true, error: new Error("unavailable") }) };
    await expect(assertReviewerAccess(client as never, "reviewer")).rejects.toThrow("Forbidden");
  });
});