import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { buildSelection, parseListingUrl, playbookSelectionSchema, resolveSelection, selectedPlaybookTeamContext, selectedPlaybookAssessmentContext, SELECTION_PHASE } from "./playbook-selection";
import { engagementBriefSchema, readEngagementBrief } from "./scope-brief";
import { buildSectionInput } from "./evaluation.io";
import { SECTION_KEYS } from "./assessment-job";

const mocks = vi.hoisted(() => ({ session: {} as any, messages: [] as any[], requests: [] as any[] }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => { const c: any = { middleware: () => c, inputValidator: () => c, handler: (fn: unknown) => fn }; return c; } }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/lib/notifications.functions", () => ({ notify: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: (table: string) => {
  const q: any = { select: () => q, eq: () => q, order: async () => ({ data: mocks.messages }), maybeSingle: async () => ({ data: mocks.session }), single: async () => ({ data: table === "sessions" ? mocks.session : mocks.messages.at(-1) }), insert: (m: any) => { const rows = (Array.isArray(m) ? m : [m]).map((r: any) => ({ created_at: "2026-11-11T14:00:00Z", ...r, id: `m${mocks.messages.length}` })); rows.forEach((r: any, i: number) => { r.id = `m${mocks.messages.length + i}`; }); mocks.messages.push(...rows); return { select: async () => ({ data: rows }), single: async () => ({ data: rows.at(-1) }), then: (f: any) => f({ data: rows }) }; } }; return q;
} } }));
import { sendPlaybookTeamTurn } from "./simulator.functions";
const send = sendPlaybookTeamTurn as unknown as (i: any) => Promise<any>;

const CP = "https://platform.strategyzer.com/playbook_libraries/strategyzer_library/listings/18";
const OTHER = "https://platform.strategyzer.com/playbook_libraries/strategyzer_library/listings/42";
const scenarios = [["The Student Founder", "Maya Chen"], ["The Distant Sponsor", "Priya Shah"], ["The Solution Factory", "Jordan Park"], ["The Confident Executive", "Dr. Eleanor Voss"]];
const brief = (sel: any) => engagementBriefSchema.parse({ success: "Decide which segment to test", playbook_selection: sel });

beforeEach(() => {
  mocks.messages = []; mocks.requests = [];
  vi.stubEnv("LOVABLE_API_KEY", "mock");
  vi.stubGlobal("fetch", vi.fn(async (_u, init) => { const b = JSON.parse(init.body); mocks.requests.push(b); return { ok: true, json: async () => ({ choices: [{ message: { content: `[${mocks.session.scenarios.stakeholders[0].name}] That's still a guess.` } }] }) }; }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it("validates exact Library listing URL shape and origin", () => {
  expect(parseListingUrl(CP + "/")?.listingId).toBe("18");
  for (const bad of ["http://platform.strategyzer.com/playbook_libraries/x/listings/1", "https://evil.com/playbook_libraries/x/listings/1", "https://platform.strategyzer.com.evil.com/playbook_libraries/x/listings/1", CP + "?x=1", "https://platform.strategyzer.com/playbook_libraries/x/listings/abc"]) expect(parseListingUrl(bad)).toBeNull();
  expect(playbookSelectionSchema.safeParse(buildSelection({ choice: "selected", url: "https://evil.com/x", title: "T" })).success).toBe(false);
  expect(playbookSelectionSchema.safeParse(buildSelection({ choice: "selected", url: OTHER, title: "" })).success).toBe(false);
});

it("save/restore through the versioned brief preserves ID, canonical URL, title and provenance", () => {
  const saved = readEngagementBrief(JSON.parse(JSON.stringify(brief(buildSelection({ choice: "selected", url: OTHER + "/", title: "Test business ideas", working_brief: { purpose: "Pick riskiest assumption" } })))));
  expect(saved.playbook_selection).toMatchObject({ listing_id: "42", canonical_url: OTHER, title: "Test business ideas" });
  const r = resolveSelection(saved);
  expect(r.kind === "selected" && r.provenance).toBe("coach_working_brief");
  // Historical brief without selection stays untouched and undecided.
  expect(readEngagementBrief({ success: "old" }).playbook_selection).toBeUndefined();
  expect(resolveSelection({ success: "old" }).kind).toBe("undecided");
});

it("two different playbooks give distinct facilitation context; no Customer Profile fallback", () => {
  const cp = selectedPlaybookTeamContext({ engagement_brief: brief(buildSelection({ choice: "selected", url: CP, title: "Map out your customer profile with AI" })) }, []);
  expect(cp).toContain("VERIFIED PLAYBOOK METADATA"); expect(cp).toContain("AI-assisted mapping");
  const other = selectedPlaybookTeamContext({ engagement_brief: brief(buildSelection({ choice: "selected", url: OTHER, title: "Test business ideas" })) }, []);
  expect(other).toContain("Test business ideas"); expect(other).toContain("NOT loaded");
  expect(other).not.toMatch(/Customer Profile|citizenM|jobs, pains/);
  const briefed = selectedPlaybookTeamContext({ engagement_brief: brief(buildSelection({ choice: "selected", url: OTHER, title: "Test business ideas", working_brief: { expected_output: "Ranked assumptions" } })) }, []);
  expect(briefed).toContain("coach supplied this WORKING BRIEF"); expect(briefed).toContain("Ranked assumptions");
});

it("none, defer and undecided produce no playbook context; reason reaches strategy assessment only", () => {
  for (const choice of ["none", "defer", "undecided"] as const) {
    const b = brief(buildSelection({ choice, reason: "Team must agree the decision first" }));
    expect(selectedPlaybookTeamContext({ engagement_brief: b }, [])).toBe("");
    if (choice !== "undecided") expect(selectedPlaybookAssessmentContext([], "coaching_strategy", b)).toContain("Team must agree the decision first");
    expect(selectedPlaybookAssessmentContext([], "working_session_facilitation", b)).toBe("");
  }
});

it("scope revisions freeze each choice independently", () => {
  const r1 = brief(buildSelection({ choice: "selected", url: CP, title: "Map out your customer profile with AI" }));
  const r2 = { ...r1, playbook_selection: buildSelection({ choice: "defer", reason: "Evidence first" }) };
  expect(resolveSelection(r1).kind).toBe("selected"); expect(resolveSelection(r2).kind).toBe("defer");
});

for (const [title, lead] of scenarios) it(`${title}: Chapter 2 inherits the saved Scope playbook and assessment sees it as context`, async () => {
  mocks.session = { id: "s", owner_id: "o", scenarios: { title, context: `${title} context`, stakeholders: [{ name: lead, role: "r", posture: "p" }] }, engagement_brief: brief(buildSelection({ choice: "selected", url: OTHER, title: "Test business ideas" })) };
  const reply = await send({ data: { sessionId: "s", activityKey: "selected_playbook", reference: true, coachMessage: "Which assumption is riskiest?" }, context: { userId: "o" } });
  expect(reply.message.stakeholder_name).toBe(lead); expect(reply.message.phase).toBe(SELECTION_PHASE);
  const prompt = mocks.requests[0].messages[0].content;
  expect(prompt).toContain("Test business ideas"); expect(prompt).toContain(lead); expect(prompt).not.toContain("citizenM");
  const s: any = { ...mocks.session, candidate_name: "c", scope_revisions: [] };
  expect(buildSectionInput("working_session_facilitation", s, mocks.messages)).toContain("Test business ideas");
  for (const key of SECTION_KEYS) expect(() => buildSectionInput(key, s, mocks.messages)).not.toThrow();
});

it("refuses team turn when Scope has none/defer, without recording a coach message", async () => {
  mocks.session = { id: "s", owner_id: "o", engagement_brief: brief(buildSelection({ choice: "none" })) };
  await expect(send({ data: { sessionId: "s", activityKey: "selected_playbook", reference: true, coachMessage: "go" }, context: { userId: "o" } })).rejects.toThrow("Choose a playbook in Scope");
  expect(mocks.messages).toHaveLength(0);
});

it("historical Chapter 2 Customer Profile opt-in stays readable as legacy verified context", () => {
  const r = resolveSelection({}, { customer_profile_reference: { choice: "use" } });
  expect(r.kind === "selected" && r.source).toBe("legacy_customer_profile_opt_in");
});

it("multi-speaker team reply saves one row per speaker and a rejected reply saves nothing (no duplicate coach turn on retry)", async () => {
  const { buildSelection } = await import("./playbook-selection");
  mocks.session = { id: "s", owner_id: "owner", scenarios: { title: "The Student Founder", context: "x", stakeholders: [{ name: "Maya Chen", role: "Founder" }, { name: "Jordan Patel", role: "CTO" }, { name: "Sofia Ramirez", role: "Ops" }] }, engagement_brief: { playbook_selection: buildSelection({ choice: "selected", url: "https://platform.strategyzer.com/playbook_libraries/strategyzer_library/listings/18", title: "Map out your customer profile with AI" }) } };
  mocks.messages = [];
  let content = "[Sofia] Hi.\n[Bob] Me too.";
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ choices: [{ message: { content } }] }) })));
  await expect(send({ data: { sessionId: "s", activityKey: "selected_playbook", reference: true, coachMessage: "Who said it?" }, context: { userId: "owner" } })).rejects.toThrow("nothing was saved");
  expect(mocks.messages).toHaveLength(0);
  content = "[Maya] It's a guess.\n[Jordan] Nobody said it.";
  const r = await send({ data: { sessionId: "s", activityKey: "selected_playbook", reference: true, coachMessage: "Who said it?" }, context: { userId: "owner" } });
  expect(mocks.messages.map((m: any) => [m.role, m.stakeholder_name])).toEqual([["candidate", "(team)"], ["stakeholder", "Maya Chen"], ["stakeholder", "Jordan Patel"]]);
  expect(mocks.messages.map((m: any) => m.content)).toEqual(["[playbook_selection_v1] Who said it?", "It's a guess.", "Nobody said it."]);
  expect(new Set(mocks.messages.map((m: any) => m.created_at)).size).toBe(3);
  expect(r.messages).toHaveLength(2);
});
