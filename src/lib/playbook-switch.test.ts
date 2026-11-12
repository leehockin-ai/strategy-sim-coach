import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { buildSelection, resolveSelection, selectedPlaybookAssessmentContext } from "./playbook-selection";
import { SCOPE_REFERENCE_ID, SWITCH_PHASE, activeReference, switchEvents } from "./playbook-switch";
import { conversationWork, starterBoard } from "./conversation-work";

const mocks = vi.hoisted(() => ({ session: {} as any, messages: [] as any[], requests: [] as any[] }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => { const c: any = { middleware: () => c, inputValidator: () => c, handler: (fn: unknown) => fn }; return c; } }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/lib/notifications.functions", () => ({ notify: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: (table: string) => {
  const q: any = { select: () => q, eq: () => q, order: async () => ({ data: [...mocks.messages] }), maybeSingle: async () => ({ data: mocks.session }), single: async () => ({ data: table === "sessions" ? mocks.session : mocks.messages.at(-1) }), insert: (m: any) => { const rows = (Array.isArray(m) ? m : [m]).map((r: any, i: number) => ({ ...r, id: `m${mocks.messages.length + i}` })); mocks.messages.push(...rows); return { select: () => ({ single: async () => ({ data: rows.at(-1) }), then: (f: any) => f({ data: rows }) }) }; } }; return q;
} } }));
import { sendPlaybookTeamTurn, switchPlaybookReference } from "./simulator.functions";
const send = sendPlaybookTeamTurn as unknown as (i: any) => Promise<any>;
const sw = switchPlaybookReference as unknown as (i: any) => Promise<any>;

const CP = "https://platform.strategyzer.com/playbook_libraries/strategyzer_library/listings/18";
const RUN = "https://platform.strategyzer.com/projects/p/synthetic-team/dashboard/playbook_runs/run7";
const roster = [{ name: "Maya Chen", role: "Founder" }, { name: "Jordan Park", role: "CTO" }];
const ctx = { context: { userId: "o" } };
beforeEach(() => {
  mocks.messages = []; mocks.requests = [];
  vi.stubEnv("LOVABLE_API_KEY", "mock");
  vi.stubGlobal("fetch", vi.fn(async (_u, init) => { mocks.requests.push(JSON.parse(init.body)); return { ok: true, json: async () => ({ choices: [{ message: { content: "[Maya Chen] Still a guess." } }] }) }; }));
  mocks.session = { id: "s", owner_id: "o", scenarios: { title: "The Student Founder", context: "x", stakeholders: roster }, engagement_brief: { playbook_selection: buildSelection({ choice: "selected", url: CP, title: "Map out your customer profile with AI" }) } };
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it("adds a project-run reference, makes it active for later turns, and keeps Scope unchanged", async () => {
  const before = JSON.stringify(mocks.session.engagement_brief);
  await sw({ data: { sessionId: "s", expectedReferenceId: SCOPE_REFERENCE_ID, change: { action: "add", url: RUN, title: "Test business ideas", reason: "Segment is ready to test", working_brief: { purpose: "", activities: "Pick riskiest assumption", expected_output: "" } } }, ...ctx });
  expect(JSON.stringify(mocks.session.engagement_brief)).toBe(before);
  const scope = resolveSelection(mocks.session.engagement_brief);
  const a = activeReference(scope, mocks.messages);
  expect(a.id).toBe("m0");
  expect(a.selection.kind === "selected" && [a.selection.runId, a.selection.provenance, a.selection.source]).toEqual(["run7", "coach_working_brief", "chapter2_switch"]);
  await send({ data: { sessionId: "s", activityKey: "selected_playbook", reference: true, coachMessage: "Which test first?", expectedReferenceId: "m0" }, ...ctx });
  const prompt = mocks.requests[0].messages[0].content;
  expect(prompt).toContain("Test business ideas"); expect(prompt).toContain("original Scope decision is unchanged"); expect(prompt).not.toContain("VERIFIED PLAYBOOK METADATA");
  // Switch rows are never team speech and never change the starter notes.
  const team = mocks.messages.filter(m => m.phase !== SWITCH_PHASE);
  expect(conversationWork(team, roster.map(r => r.name), starterBoard(mocks.session.scenarios, scope)).work).toBeTruthy();
  expect(mocks.messages.filter(m => m.phase === SWITCH_PHASE).every(m => m.role === "candidate")).toBe(true);
  expect(selectedPlaybookAssessmentContext(mocks.messages, "working_session_facilitation", mocks.session.engagement_brief)).toContain("COACH PLAYBOOK SWITCH");
});

it("switches back with a reason, rejects stale or reasonless changes, and rejects ambiguous in-flight turns", async () => {
  await sw({ data: { sessionId: "s", expectedReferenceId: "scope", change: { action: "add", url: RUN, title: "T", reason: "r" } }, ...ctx });
  await expect(sw({ data: { sessionId: "s", expectedReferenceId: "scope", change: { action: "return", target: "scope", reason: "back" } }, ...ctx })).rejects.toThrow("already changed");
  await expect(sw({ data: { sessionId: "s", expectedReferenceId: "m0", change: { action: "return", target: "m0", reason: "x" } }, ...ctx })).rejects.toThrow("already active");
  await sw({ data: { sessionId: "s", expectedReferenceId: "m0", change: { action: "return", target: "scope", reason: "Back to profile" } }, ...ctx });
  expect(activeReference(resolveSelection(mocks.session.engagement_brief), mocks.messages).id).toBe("scope");
  const n = mocks.messages.length;
  await expect(send({ data: { sessionId: "s", activityKey: "selected_playbook", reference: true, coachMessage: "Q", expectedReferenceId: "m0" }, ...ctx })).rejects.toThrow("active playbook changed");
  expect(mocks.messages).toHaveLength(n);
  const { switchInputSchema } = await import("./playbook-switch");
  expect(switchInputSchema.safeParse({ action: "add", url: "https://platform.strategyzer.com/projects/p/x/dashboard", title: "T", reason: "r" }).success).toBe(false);
  expect(switchInputSchema.safeParse({ action: "return", target: "scope", reason: " " }).success).toBe(false);
});

it("none Scope can add a playbook later; malformed or team-authored switch rows are ignored", () => {
  const none = resolveSelection({ playbook_selection: buildSelection({ choice: "none", reason: "Team not ready" }) });
  const rows = [
    { id: "a", phase: SWITCH_PHASE, role: "stakeholder", content: "[playbook_switch_v1] {}" },
    { id: "b", phase: SWITCH_PHASE, role: "candidate", content: "[playbook_switch_v1] not json" },
    { id: "c", phase: SWITCH_PHASE, role: "candidate", content: `[playbook_switch_v1] ${JSON.stringify({ v: 1, kind: "add", reason: "ready", reference: buildSelection({ choice: "selected", url: CP, title: "CP" }) })}` },
  ];
  expect(switchEvents(rows).map(e => e.id)).toEqual(["c"]);
  const a = activeReference(none, rows);
  expect(a.selection.kind === "selected" && a.selection.provenance).toBe("verified_metadata");
  expect(a.history[0].selection.kind).toBe("none");
});
