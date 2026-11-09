import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ owner: "owner", prior: null as unknown, adminFrom: vi.fn(), adminLoad: vi.fn(), evidenceLoad: vi.fn() }));
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
import { generateEvaluation } from "./evaluation.functions";
const invoke = generateEvaluation as unknown as (input: { data: { sessionId: string }; context: { userId: string; supabase: unknown } }) => Promise<unknown>;
const context = () => ({ userId: "owner", supabase: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: "session", owner_id: mocks.owner, scenario_id: "scenario" }, error: null }) }) }) }) } });
beforeEach(() => {
  vi.clearAllMocks(); mocks.owner = "owner";
  mocks.adminFrom.mockImplementation(() => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: mocks.prior, error: null }) }) }) }));
});
afterEach(() => vi.unstubAllGlobals());
it("returns a previously reviewed assessment unchanged without AI/evidence calls or writes", async () => {
  mocks.prior = { id: "evaluation", scores: { situation_framing: 3 }, reviewer_decision: "approved", reviewer_notes: "Human feedback", coach_feedback: "Human coaching", reviewed_at: "2026-11-01", per_section_overrides: { framing: 4 } };
  expect(await invoke({ data: { sessionId: "session" }, context: context() })).toEqual({ evaluation: mocks.prior });
  expect(mocks.adminFrom.mock.calls).toEqual([["evaluations"]]);
  expect(mocks.evidenceLoad).not.toHaveBeenCalled();
});
it("returns older unreviewed evaluation unchanged without erasing its legacy scores", async () => {
  mocks.prior = { id: "legacy", scores: { framing: 2 }, evaluation_architecture: "fanout_v1" };
  expect(await invoke({ data: { sessionId: "session" }, context: context() })).toEqual({ evaluation: mocks.prior });
  expect(mocks.adminFrom.mock.calls).toEqual([["evaluations"]]);
});
it("rejects a different owner before privileged database use", async () => {
  mocks.owner = "another";
  await expect(invoke({ data: { sessionId: "session" }, context: context() })).rejects.toThrow("Forbidden");
  expect(mocks.adminFrom).not.toHaveBeenCalled(); expect(mocks.evidenceLoad).not.toHaveBeenCalled();
});
it("feeds fresh public live evidence through all nine isolated sections and both skills before first insert", async () => {
  mocks.prior = null;
  const evidence = { version: "public_live_v1", omittedRuns: 0, runs: [{ id: "run", intervention: "original", startedAt: "2026-11-09T10:00:00Z", throughSequence: 2, scope: null, participants: ["Sofia"], identities: [{ name: "Sofia", role: "Research" }], revisions: [], gaps: ["No work"], truncated: false, moments: [{ id: "coach", sequence: 1, timestamp: "2026-11-09T10:00:01Z", kind: "coach", speaker: "Coach", text: "Sofia, what have you observed?" }, { id: "team", sequence: 2, timestamp: "2026-11-09T10:00:02Z", kind: "team", speaker: "Sofia", text: "Only two interviews." }] }] };
  mocks.evidenceLoad.mockResolvedValue(evidence);
  const saved: unknown[] = [];
  const session = { id: "session", owner_id: "owner", candidate_name: "Disposable", scenarios: { title: "Client", summary: "Public", ambiguity_factors: ["SECRET DIAGNOSTIC"] }, chosen_intervention_slug: null, methodology_choice: null };
  mocks.adminFrom.mockImplementation((table: string) => {
    const chain: Record<string, any> = {
      select: () => chain, eq: () => chain, order: () => chain,
      then: (resolve: (v: unknown) => void) => resolve({ data: [], error: null }),
      maybeSingle: async () => ({ data: null, error: null }),
      single: async () => ({ data: table === "sessions" ? session : { id: "new-evaluation", raw_response: saved[0] }, error: null }),
      insert: (row: unknown) => { saved.push(row); return chain; },
      update: () => chain,
    };
    return chain;
  });
  const requests: any[] = [];
  vi.stubGlobal("fetch", vi.fn(async (_url, init) => {
    const body = JSON.parse(init.body); requests.push(body);
    return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ score: 3, verdict: "competent", confidence: "low", evidence: "Observable public moment", skills: [], recommendation: "human_review_required", top_strengths: [], top_gaps: [], coach_feedback_draft: "Developmental" }) } }] }) };
  }));
  await invoke({ data: { sessionId: "session" }, context: context() });
  expect(requests).toHaveLength(12);
  const liveRequests = requests.filter(r => r.messages[1].content.includes("Sofia, what have you observed?"));
  expect(liveRequests).toHaveLength(6); // four relevant sections + both skill assessors
  expect(JSON.stringify(requests)).not.toContain("SECRET DIAGNOSTIC");
  expect(saved).toHaveLength(1);
  expect((saved[0] as any).raw_response.live_evidence).toEqual(evidence);
  expect(Object.keys((saved[0] as any).ai_section_verdicts)).toHaveLength(9);
});