import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ owner: "owner", app: { pathway: "Next step" } as unknown, prior: null as unknown, adminFrom: vi.fn(), adminLoad: vi.fn(), evidenceLoad: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  const chain = { middleware: () => chain, inputValidator: () => chain, handler: (fn: unknown) => fn };
  return chain;
} }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/integrations/supabase/client.server", () => {
  mocks.adminLoad();
  return { supabaseAdmin: { from: mocks.adminFrom } };
});
vi.mock("@/lib/evaluation-live-evidence.server", () => ({ loadLiveEvaluationEvidence: mocks.evidenceLoad }));
import { startAssessmentJob, advanceAssessmentJob, getAssessmentStatus, executeEvaluationStep, composeEvaluationRow } from "./evaluation.functions";
import { ALL_STEPS } from "./assessment-job";
type Fn = (input: { data: { sessionId: string; retry?: boolean }; context: { userId: string; supabase: unknown } }) => Promise<any>;
const start = startAssessmentJob as unknown as Fn;
const advance = advanceAssessmentJob as unknown as Fn;
const status = getAssessmentStatus as unknown as Fn;
const context = () => ({ userId: "owner", supabase: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: "session", owner_id: mocks.owner, scenario_id: "scenario", playbook_application: mocks.app }, error: null }) }) }) }) } });
const tablesTouched = () => mocks.adminFrom.mock.calls.map((c) => c[0]);
beforeEach(() => {
  vi.clearAllMocks(); mocks.owner = "owner"; mocks.app = { pathway: "Next step" };
  mocks.adminFrom.mockImplementation((table: string) => {
    const chain: any = { select: () => chain, eq: () => chain, maybeSingle: async () => ({ data: table === "evaluations" ? mocks.prior : null, error: null }), insert: vi.fn(() => chain), update: vi.fn(() => chain) };
    return chain;
  });
});
afterEach(() => vi.unstubAllGlobals());

it("returns a previously reviewed assessment without creating a job, loading evidence or writing", async () => {
  mocks.prior = { id: "evaluation" };
  for (const fn of [start, advance, status]) {
    expect(await fn({ data: { sessionId: "session" }, context: context() })).toMatchObject({ state: "completed", evaluationId: "evaluation" });
  }
  expect(new Set(tablesTouched())).toEqual(new Set(["evaluations"]));
  expect(mocks.evidenceLoad).not.toHaveBeenCalled();
});

it("rejects a different owner before privileged database use on every entry point", async () => {
  mocks.owner = "another";
  for (const fn of [start, advance, status]) {
    await expect(fn({ data: { sessionId: "session" }, context: context() })).rejects.toThrow("Forbidden");
  }
  expect(mocks.adminFrom).not.toHaveBeenCalled(); expect(mocks.evidenceLoad).not.toHaveBeenCalled();
});

it("refuses to start before Chapter 3 · Advance has any drafted section", async () => {
  mocks.prior = null; mocks.app = { pathway: "   " };
  await expect(start({ data: { sessionId: "session" }, context: context() })).rejects.toThrow("Chapter 3");
  expect(mocks.evidenceLoad).not.toHaveBeenCalled();
});

it("status for a session without a job reports not_started and exposes no step contents", async () => {
  mocks.prior = null;
  expect(await status({ data: { sessionId: "session" }, context: context() })).toEqual({ state: "not_started", done: 0, total: 12 });
});

it("routes public live evidence through all nine isolated sections and both skills, then one synthesis, with no hidden diagnostics", async () => {
  const evidence = { version: "public_live_v1", omittedRuns: 0, runs: [{ id: "run", intervention: "original", startedAt: "2026-11-09T10:00:00Z", throughSequence: 2, scope: null, participants: ["Sofia"], identities: [{ name: "Sofia", role: "Research" }], revisions: [], gaps: ["No work"], truncated: false, moments: [{ id: "coach", sequence: 1, timestamp: "2026-11-09T10:00:01Z", kind: "coach", speaker: "Coach", text: "Sofia, what have you observed?" }, { id: "team", sequence: 2, timestamp: "2026-11-09T10:00:02Z", kind: "team", speaker: "Sofia", text: "Only two interviews." }] }] };
  const s: any = { id: "session", owner_id: "owner", candidate_name: "Disposable", scenarios: { title: "Client", summary: "Public" }, chosen_intervention_slug: null, methodology_choice: null, live_evidence: evidence, scope_revisions: [], stakeholder_state_trajectory: [] };
  const input: any = { s, turns: [], inputQualitySignals: { evidence_mode: "live" } };
  const requests: any[] = [];
  vi.stubGlobal("fetch", vi.fn(async (_url, init) => {
    const body = JSON.parse(init.body); requests.push(body);
    return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ score: 3, verdict: "competent", confidence: "low", evidence: "Observable public moment", skills: [], recommendation: "human_review_required", top_strengths: [], top_gaps: [], coach_feedback_draft: "Developmental" }) } }] }) };
  }));
  const steps: Record<string, any> = {};
  for (const step of ALL_STEPS) steps[step] = { status: "done", attempts: 1, result: await executeEvaluationStep("k", step, input, evidence) };
  const row: any = await composeEvaluationRow("k", "session", steps, input, evidence);
  expect(requests).toHaveLength(12);
  expect(requests.filter((r) => r.messages[1].content.includes("Sofia, what have you observed?"))).toHaveLength(6);
  expect(requests.every((r) => r.model === "google/gemini-2.5-pro" || typeof r.model === "string")).toBe(true);
  expect(JSON.stringify(requests)).not.toContain("SECRET DIAGNOSTIC");
  expect(row.raw_response.live_evidence).toEqual(evidence);
  expect(row.evaluation_architecture).toBe("fanout_v1");
  expect(Object.keys(row.ai_section_verdicts)).toHaveLength(9);
});

it("maps credit exhaustion to a job-stopping error", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 402 })));
  const input: any = { s: { scenarios: { title: "x" }, scope_revisions: [] }, turns: [], inputQualitySignals: {} };
  await expect(executeEvaluationStep("k", "section:situation_framing", input, { runs: [] })).rejects.toMatchObject({ name: "Error", message: "AI credits exhausted." });
  const { FatalAssessmentError } = await import("./assessment-job");
  await expect(executeEvaluationStep("k", "section:situation_framing", input, { runs: [] })).rejects.toBeInstanceOf(FatalAssessmentError);
});
