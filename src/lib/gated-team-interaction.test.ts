import { expect, it, vi } from "vitest";
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => { const c: any = { middleware: () => c, inputValidator: () => c, handler: (fn: unknown) => fn }; return c; } }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
import { buildPrompt } from "./live-team.functions";
import { initialRoom, type TeamConfig } from "./live-team";
import { TEAM_INTERACTION_RULES } from "./team-interaction";
it("gated generation receives the same contextual rules and correctly labels group history", () => {
  const state = { trust: "medium", engagement: "medium", defensiveness: "low", willingness_to_contribute: "medium" } as const;
  const config: TeamConfig = { id: "isolated", version: 1, title: "Practice", exercise_label: "Practice", expected_duration_minutes: 15, instructions: "", activity_steps: [], poc: true, methodology_approved: false, participants: [{ name: "Jordan", role: "Researcher", visible: "", tendency: "quiet", personality: "cautious", beliefs: [], initial: state }], truth: { shared: [], evidence: [], assumptions: [], misconceptions: [], uncertainties: [], tangents: [] } };
  const prompt = buildPrompt(config, initialRoom(config, {}), { byName: { Jordan: ["Coach to (group): Jordan, this is your fault.", "Jordan: Stop blaming me."] }, prior: {}, commitments: "" }, "Coach: I dismissed you. I'm sorry.\nJordan: I need a moment.", "working");
  expect(prompt).toContain(TEAM_INTERACTION_RULES);
  expect(prompt).toContain("group or 1:1; preserve speaker identities");
  expect(prompt).toContain("Jordan: I need a moment.");
  expect(prompt).not.toContain("Has NOT spoken with this coach");
});