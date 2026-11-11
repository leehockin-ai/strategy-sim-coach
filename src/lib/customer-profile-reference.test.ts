import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CUSTOMER_PROFILE_REFERENCE as ref, customerProfileTeamContext } from "./customer-profile-reference";
import { buildSectionInput } from "./evaluation.io";
import { SELECTION_PHASE } from "./playbook-selection";
import { SECTION_KEYS } from "./assessment-job";

const mocks = vi.hoisted(() => ({ session: {} as any, messages: [] as any[], requests: [] as any[] }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  const chain = { middleware: () => chain, inputValidator: () => chain, handler: (fn: unknown) => fn }; return chain;
} }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/lib/notifications.functions", () => ({ notify: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: (table: string) => {
  const query: any = { select: () => query, eq: () => query, order: async () => ({ data: mocks.messages }), maybeSingle: async () => ({ data: mocks.session }), single: async () => ({ data: table === "sessions" ? mocks.session : mocks.messages.at(-1) }), insert: (m: any) => { const rows = (Array.isArray(m) ? m : [m]).map((r: any) => ({ created_at: "2026-11-11T13:30:00Z", ...r, id: `m${mocks.messages.length}` })); rows.forEach((r: any, i: number) => { r.id = `m${mocks.messages.length + i}`; }); mocks.messages.push(...rows); return { select: async () => ({ data: rows }), single: async () => ({ data: rows.at(-1) }), then: (f: any) => f({ data: rows }) }; } }; return query;
} } }));
import { sendPlaybookTeamTurn } from "./simulator.functions";
import { executeEvaluationStep } from "./evaluation.functions";
const send = sendPlaybookTeamTurn as unknown as (input: any) => Promise<any>;
const clients = [
  { title: "The Student Founder", context: "Student meal-planning app; six-week pitch; no interviews.", names: ["Maya Chen", "Jordan Patel", "Sofia Ramirez"] },
  { title: "The Distant Sponsor", context: "NorthBay Bank SMB lending; absent sponsor; credit risk and budget approval.", names: ["Priya Shah", "Marcus Lin", "Dale Whitmore"] },
  { title: "The Solution Factory", context: "Helix HR analytics; six-month AI HR copilot roadmap; no evidence of demand.", names: ["Jordan Park", "Sam Okafor", "Renee Castillo"] },
  { title: "The Confident Executive", context: "Meridian Health triage; mixed three-clinic evidence; 22-clinic scale pressure.", names: ["Dr. Eleanor Voss", "Nurse Manager Tariq Hassan", "Maya Bernstein"] },
];
beforeEach(() => {
  mocks.messages = [{ id: "scope", role: "candidate", phase: "scoping", content: "Agree the decision before selecting a segment." }]; mocks.requests = [];
  vi.stubEnv("LOVABLE_API_KEY", "mock-test-key");
  vi.stubGlobal("fetch", vi.fn(async (_url, init) => {
    const body = JSON.parse(init.body); mocks.requests.push(body);
    return { ok: true, json: async () => ({ choices: [{ message: { content: body.model === "google/gemini-3-flash-preview" ? `[${mocks.session.scenarios.stakeholders[0].name}] Our proposed customer job is still an assumption, not interview evidence.` : JSON.stringify({ score: 3, verdict: "competent", confidence: "low", evidence: "Coach questioned assumptions.", skills: [] }) } }] }) };
  }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
for (const client of clients) it(`${client.title}: normal reference uses its own team, saved Scope, dialogue and normal assessment`, async () => {
  mocks.session = { id: "s", owner_id: "owner", scenarios: { ...client, stakeholders: client.names.map(name => ({ name, role: "Configured client role" })) }, engagement_brief: { outcome: "Decide whose evidence matters" }, chosen_intervention_slug: "evidence_gathering", playbook_facilitation_plan: { customer_profile_reference: { choice: "use" } }, playbook_activity_run: { homework: "not yet done" } };
  const reply = await send({ data: { sessionId: "s", activityKey: "customer_profile", reference: true, coachMessage: "Whose job are we assuming, and what evidence is missing?" }, context: { userId: "owner" } });
  expect(reply.message.stakeholder_name).toBe(client.names[0]);
  const prompt = mocks.requests[0].messages[0].content;
  for (const name of client.names) expect(prompt).toContain(name);
  expect(prompt).toContain(client.context); expect(prompt).toContain("Decide whose evidence matters"); expect(prompt).toContain("Agree the decision"); expect(prompt).toContain("not yet done"); expect(prompt).not.toContain("ShiftNest");
  expect(mocks.messages.at(-1).phase).toBe(SELECTION_PHASE);
  expect(mocks.messages.at(-2).content).toContain("[playbook_selection_v1]");
  const input: any = { s: { ...mocks.session, candidate_name: "Mock coach", scope_revisions: [] }, turns: mocks.messages, inputQualitySignals: {} };
  for (const key of SECTION_KEYS) {
    const result: any = await executeEvaluationStep("mock-test-key", `section:${key}`, input, { runs: [] });
    expect(result.score).toBe(3);
  }
  expect(mocks.requests).toHaveLength(10);
  expect(buildSectionInput("working_session_facilitation", input.s, input.turns)).toContain("never score AI team work's polish");
  expect(buildSectionInput("situation_framing", input.s, input.turns)).not.toContain(ref.url);
});
it("no reference/defer/other preserve ordinary prompts and do not imply playbook execution", () => {
  for (const plan of [null, {}, { customer_profile_reference: { choice: "defer" } }, { customer_profile_reference: { choice: "other" } }]) {
    expect(customerProfileTeamContext({ playbook_facilitation_plan: plan }, [])).toBe("");
  }
});
it("unspecified historical Scope can converse without claiming a playbook was selected", async () => {
  mocks.session = { owner_id: "owner", scenarios: { ...clients[0], stakeholders: clients[0].names.map(name => ({ name, role: "Client" })) }, playbook_facilitation_plan: {} };
  const reply = await send({ data: { sessionId: "s", activityKey: "selected_playbook", reference: true, coachMessage: "What should we explore?" }, context: { userId: "owner" } });
  expect(reply.message.stakeholder_name).toBe("Maya Chen");
  expect(mocks.requests[0].messages[0].content).toContain("without a selected playbook");
  expect(mocks.requests[0].messages[0].content).not.toContain("VERIFIED PLAYBOOK METADATA");
});
it("normal unmarked assessment never receives new reference requirements", () => {
  const s: any = { scenarios: { title: "Legacy", summary: "Existing" }, scope_revisions: [] };
  for (const key of SECTION_KEYS) expect(buildSectionInput(key, s, [])).not.toContain(ref.url);
});