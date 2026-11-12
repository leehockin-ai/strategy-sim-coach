import { expect, it, vi } from "vitest";
import { writeFileSync } from "node:fs";
const memory = vi.hoisted(() => ({ session: {} as any, rows: [] as any[] }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => { const c: any = { middleware: () => c, inputValidator: () => c, handler: (f: unknown) => f }; return c; } }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/lib/notifications.functions", () => ({ notify: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: () => {
  let inserted: any = null;
  const q: any = { select: () => q, eq: () => q, order: async () => ({ data: memory.rows }), single: async () => ({ data: inserted?.[0] ?? memory.session }), maybeSingle: async () => ({ data: memory.session }),
    insert: (r: any) => { inserted = (Array.isArray(r) ? r : [r]).map((v: any, i: number) => ({ ...v, id: `m${memory.rows.length + i}` })); memory.rows.push(...inserted); return { select: () => ({ then: (resolve: any) => Promise.resolve({ data: inserted }).then(resolve), single: async () => ({ data: inserted[0] }) }) }; } }; return q;
} } }));
import { sendPlaybookTeamTurn, sendScopingTurn } from "./simulator.functions";
import { practiceScenario } from "./custom-scenario";
import { conversationWork } from "./conversation-work";
import { TEAM_INTERACTION_RULES } from "./team-interaction";
const roster = [{ name: "Maya Chen", role: "Founder", description: "Attached to launch; proud but not uniformly defensive." }, { name: "Jordan Patel", role: "Researcher", description: "Cautious, wants evidence; dislikes personal blame." }];
const draft = { title: "Fictional student meal team", brief: "Meal-planning wireframes, six-week pitch, no customer interviews yet. Maya favors launching; Jordan wants interviews. No validated segment.", team: roster, tensions: "Speed versus learning", scope: "Choose next test", outcome: "Understand an uncertain segment", constraints: "Two weeks", challenge: "Explore assumptions while preserving team agency" };
function setup() { memory.rows = []; memory.session = { id: "11111111-1111-4111-8111-111111111111", owner_id: "owner", engagement_brief: { playbook_selection: { choice: "none", reason: "Learn first" } }, scenarios: practiceScenario(draft, "isolated") }; }
const send = sendPlaybookTeamTurn as unknown as (i: any) => Promise<any>;
const scope = sendScopingTurn as unknown as (i: any) => Promise<any>;
async function normal(text: string) { return send({ data: { sessionId: memory.session.id, activityKey: "selected_playbook", coachMessage: text, reference: true }, context: { userId: "owner" } }); }
it("normal handler passes accumulated scoping/defensive history and stores one-word refusal without work", async () => {
  setup(); memory.rows = [{ id: "past", phase: "scoping", role: "stakeholder", stakeholder_name: "Jordan Patel", content: "I won't work while you blame me." }];
  const mock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: "[Jordan Patel] <<add unknowns>> No." } }] })));
  try {
    const result = await normal("Jordan, do it now.");
    expect(result.messages[0].content).toBe("No.");
    const body = JSON.parse(mock.mock.calls[0]?.[1]?.body as string);
    expect(body.messages[0].content).toContain(TEAM_INTERACTION_RULES);
    expect(body.messages.some((m: any) => m.content.includes("while you blame me"))).toBe(true);
    expect(conversationWork(memory.rows, roster.map(p => p.name)).work).toBeNull();
  } finally { mock.mockRestore(); }
});
it("scoping handler retains other-phase history and accepts attributed one-word answers", async () => {
  setup(); memory.rows = [{ id: "past", phase: "alignment:client", role: "stakeholder", stakeholder_name: "Maya Chen", content: "Stop blaming me." }];
  const mock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ speaker: "Maya Chen", reply: "No." }) } }] })));
  try {
    const result = await scope({ data: { sessionId: memory.session.id, candidateMessage: "Maya, continue." }, context: { userId: "owner" } });
    expect(result.stakeholderMessage).toMatchObject({ stakeholder_name: "Maya Chen", content: "No." });
    const body = JSON.parse(mock.mock.calls[0]?.[1]?.body as string);
    expect(body.messages[0].content).toContain(TEAM_INTERACTION_RULES);
    expect(body.messages.some((m: any) => m.content.includes("Stop blaming me"))).toBe(true);
  } finally { mock.mockRestore(); }
});
it.skipIf(!process.env.RUN_TONE_LIVE)("real isolated normal-team blame, repair and respectful challenge cases", async () => {
  const cases: any[] = [];
  setup();
  for (const message of [
    "Jordan, this is your fucking fault. You're useless. Stop making excuses and put the segment on the board now.",
    "Jordan, I don't care what you think. You caused this mess. Just shut up and do the work.",
    "Jordan, I blamed you personally and dismissed your concern. That was unfair. I'm sorry. You don't owe me immediate agreement. What would you like me to understand?",
    "Jordan, thank you. I'm willing to slow down and listen. What is one uncertainty you feel comfortable discussing, or would you rather pause?",
  ]) { const result = await normal(message); cases.push({ case: "rupture_repair", message, replies: result.messages }); }
  const ruptureBoard = conversationWork(memory.rows.slice(0,4), roster.map(p => p.name));
  setup();
  for (const message of ["Maya, this damn deadline is stressful. Which customer evidence do we actually have? I respect the work, but wireframes don't establish demand. What would change your view?", "Jordan, Maya reported hearing 'you're useless' from someone else. I am not endorsing that. What do you know and what remains uncertain?"]) {
    const result = await normal(message); cases.push({ case: "respectful_or_quote", message, replies: result.messages });
  }
  setup();
  for (const candidateMessage of ["Jordan, you caused this mess. You're useless. Do the work now.", "Jordan, I dismissed you. That was unfair. I'm sorry. What concern am I missing?"]) {
    const result = await scope({ data: { sessionId: memory.session.id, candidateMessage }, context: { userId: "owner" } });
    cases.push({ case: "scoping_rupture_repair", message: candidateMessage, replies: [result.stakeholderMessage] });
  }
  writeFileSync("/tmp/tone-live-results.json", JSON.stringify({ cases, ruptureBoard }, null, 2));
  expect(cases.every(c => c.replies.every((r: any) => roster.some(p => p.name === r.stakeholder_name)))).toBe(true);
  expect(cases).toHaveLength(8);
}, 120000);