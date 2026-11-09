import { beforeEach, expect, it, vi } from "vitest";

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