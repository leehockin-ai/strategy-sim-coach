import { expect, it, vi } from "vitest";
import { writeFileSync } from "fs";
const mocks = vi.hoisted(() => ({ session: {} as any, messages: [] as any[] }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => { const c: any = { middleware: () => c, inputValidator: () => c, handler: (fn: unknown) => fn }; return c; } }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/lib/notifications.functions", () => ({ notify: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: (table: string) => {
  const q: any = { select: () => q, eq: () => q, order: async () => ({ data: mocks.messages }), maybeSingle: async () => ({ data: mocks.session }), single: async () => ({ data: table === "sessions" ? mocks.session : null }),
    insert: (m: any) => { const rows = (Array.isArray(m) ? m : [m]).map((r: any, i: number) => ({ ...r, id: `m${mocks.messages.length + i}` })); mocks.messages.push(...rows); return { select: async () => ({ data: rows }) }; } }; return q; } } }));
import { sendPlaybookTeamTurn } from "./simulator.functions";
import { conversationWork, starterBoard } from "./conversation-work";
import { resolveSelection } from "./playbook-selection";
const send = sendPlaybookTeamTurn as unknown as (i: any) => Promise<any>;
it.skipIf(!process.env.RUN_LIVE)("real AI: team adds then revises board notes", async () => {
  const stakeholders = [{ name: "Maya Chen", role: "Founder / Product Lead", posture: "Energetic, attached to the app." }, { name: "Jordan Patel", role: "Operations / Research", posture: "Evidence-oriented." }, { name: "Sofia Ramirez", role: "Design Lead", posture: "Empathetic." }];
  const brief = { success: "Maya ChenYes so we want to like pick", playbook_selection: { choice: "selected", reference_kind: "library_listing", library: "strategyzer_library", listing_id: "77", canonical_url: "https://platform.strategyzer.com/playbook_libraries/strategyzer_library/listings/77", title: "Competing on Business Models", project_id: "", run_id: "", reason: "", working_brief: { purpose: "", activities: "", expected_output: "" } } };
  mocks.session = { id: "00000000-0000-4000-8000-000000000001", owner_id: "u", engagement_brief: brief, scenarios: { title: "The Student Founder", context: "Three-person student team, meal-planning app for 'university students'; wireframes and feature list; no validated segment or interviews; pitch in six weeks.", stakeholders } };
  const turns = [
    "Jordan, looking at the board — what's the riskiest thing there that isn't written down yet? Put it up in your own words if it belongs there.",
    "Maya, 'university students' is very broad. Based on what you actually know, which students would you start with? If that changes your segment note, change it — and keep it honest about what's untested.",
  ];
  const log: any[] = [];
  for (const t of turns) { const r = await send({ data: { sessionId: mocks.session.id, activityKey: "selected_playbook", coachMessage: t, reference: true }, context: { userId: "u" } }); log.push(r.messages.map((m: any) => `${m.stakeholder_name}: ${m.content}`)); }
  const roster = stakeholders.map(s => s.name);
  const starter = starterBoard(mocks.session.scenarios, resolveSelection(brief));
  const board = conversationWork(mocks.messages, roster, starter);
  const reload = conversationWork(JSON.parse(JSON.stringify(mocks.messages)), roster, starter);
  writeFileSync("/tmp/e2e/live.json", JSON.stringify({ log, messages: mocks.messages, board: board.work, revision: board.revision }, null, 2));
  expect(reload).toEqual(board);
  expect(board.revision).toBeGreaterThan(1);
}, 120000);
