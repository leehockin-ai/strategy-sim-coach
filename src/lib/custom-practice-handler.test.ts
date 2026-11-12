import { expect, it, vi } from "vitest";
const memory = vi.hoisted(() => ({ session: {} as any, messages: [] as any[] }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => { const chain: any = { middleware: () => chain, inputValidator: () => chain, handler: (fn: unknown) => fn }; return chain; } }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/lib/notifications.functions", () => ({ notify: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: () => {
  const q: any = { select: () => q, eq: () => q, order: async () => ({ data: memory.messages }), single: async () => ({ data: memory.session }), maybeSingle: async () => ({ data: memory.session }),
    insert: (rows: any[]) => { const saved = rows.map((r, i) => ({ ...r, id: `m${memory.messages.length + i}` })); memory.messages.push(...saved); return { select: async () => ({ data: saved }) }; } }; return q;
} } }));
import { sendPlaybookTeamTurn } from "./simulator.functions";
import { startCustomPractice } from "./custom-scenario.functions";
import { practiceDraftSchema, practiceScenario } from "./custom-scenario";
import { writeFileSync } from "node:fs";
import { readFileSync } from "node:fs";

const draft = { title: "Fictional commuter meals", brief: "A fictional meal-planning team has wireframes but no segment interviews.", team: [{ name: "Alex Park", role: "Founder", description: "Provisional practice identity" }, { name: "Sam Lee", role: "Researcher", description: "Provisional practice identity" }], tensions: "Speed versus learning", scope: "One segment", outcome: "Choose an interview test", constraints: "Two weeks", challenge: "Surface uncertainty without forcing agreement" };
function setup() { memory.messages = []; memory.session = { id: "11111111-1111-4111-8111-111111111111", owner_id: "owner", engagement_brief: { playbook_selection: { choice: "none", reason: "Learn first" } }, custom_practice_snapshot: draft, scenarios: null }; }
const send = sendPlaybookTeamTurn as unknown as (input: any) => Promise<any>;
it("reuses normal team turn with isolated private scenario, preserving attribution and rejects other owners", async () => {
  setup();
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: "[Sam Lee] <<add assumptions>> We assume commuter students want this, but we have not interviewed them." } }] })));
  try {
    const result = await send({ data: { sessionId: memory.session.id, activityKey: "selected_playbook", coachMessage: "Sam, what should we test first?", reference: true }, context: { userId: "owner" } });
    expect(result.messages[0].stakeholder_name).toBe("Sam Lee");
    expect(memory.messages).toHaveLength(2);
    const body = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);
    expect(body.messages[0].content).toContain("Fictional commuter meals");
    expect(body.messages[0].content).toContain("without a selected playbook");
    await expect(send({ data: { sessionId: memory.session.id }, context: { userId: "other" } })).rejects.toThrow("Forbidden");
    expect(memory.messages).toHaveLength(2);
  } finally { fetchMock.mockRestore(); }
});
it("hosted Start refuses to write until private storage exists", async () => {
  const start = startCustomPractice as unknown as (i: any) => Promise<unknown>;
  await expect(start({ data: { requestId: "11111111-1111-4111-8111-111111111112", draft }, context: { userId: "owner", supabase: { rpc: async () => ({ error: { code: "PGRST202" } }) } } })).rejects.toThrow("owner-private storage");
});
it.skipIf(!process.env.RUN_CUSTOM_LIVE)("real AI sample turn through unchanged handler and isolated storage", async () => {
  setup();
  const inputDraftPath = process.env.CUSTOM_DRAFT_PATH;
  if (inputDraftPath) memory.session.custom_practice_snapshot = practiceDraftSchema.parse(JSON.parse(readFileSync(inputDraftPath, "utf8")));
  const result = await send({ data: { sessionId: memory.session.id, activityKey: "selected_playbook", coachMessage: "Team, what do we actually know about commuter students, and what remains an assumption?", reference: true }, context: { userId: "owner" } });
  expect(result.messages.length).toBeGreaterThan(0);
  expect(result.messages.every((m: any) => memory.session.custom_practice_snapshot.team.some((t: any) => t.name === m.stakeholder_name))).toBe(true);
  writeFileSync("/tmp/browser/custom-practice/turn.json", JSON.stringify({ session: memory.session, messages: memory.messages }));
}, 120000);