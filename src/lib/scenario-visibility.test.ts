import { describe, expect, it } from "vitest";
import { publicScenario, publicStakeholder, publicStakeholders } from "./scenario-visibility";

describe("scenario visibility (public client context vs private assessment truth)", () => {
  it("strips private assessment truth from a scenario row", () => {
    const row = {
      id: "s1",
      slug: "demo",
      title: "Demo",
      industry: "SaaS",
      difficulty: "intermediate",
      summary: "Public summary",
      context: "Public context",
      success_definition: "What the team believes",
      success_pressure: "Board pressure",
      stakeholders: [{ name: "Alex", role: "CEO", posture: "Privately skeptical" }],
      // Private assessment truth — must never reach candidates:
      system_prompt: "You are Alex. Resist the coach...",
      ambiguity_factors: ["Solution committed before problem validated"],
      unrealistic_aspects: ["Timeline is unsupported"],
    };
    const out = publicScenario(row) as Record<string, unknown>;
    expect(out.system_prompt).toBeUndefined();
    expect(out.ambiguity_factors).toBeUndefined();
    expect(out.unrealistic_aspects).toBeUndefined();
    expect(out.title).toBe("Demo");
    expect(out.success_definition).toBe("What the team believes");
    const stakeholders = out.stakeholders as Array<Record<string, unknown>>;
    expect(stakeholders).toHaveLength(1);
    expect(stakeholders[0].name).toBe("Alex");
    expect(stakeholders[0].role).toBe("CEO");
    expect(stakeholders[0].posture).toBeUndefined();
  });

  it("keeps optional public description and portrait when configured", () => {
    const s = publicStakeholder({ name: "Maya", role: "Founder", visible: "Leads product", portrait: "https://x/p.png", personality: "dominant" });
    expect(s).toEqual({ name: "Maya", role: "Founder", description: "Leads product", portrait: "https://x/p.png" });
  });

  it("drops stakeholders without a name and non-object entries", () => {
    expect(publicStakeholder(null)).toBeNull();
    expect(publicStakeholder({ role: "CEO" })).toBeNull();
    expect(publicStakeholders("nope")).toEqual([]);
    expect(publicStakeholders([{ name: "A" }, 42, { name: " " }])).toEqual([{ name: "A" }]);
  });

  it("returns null for null/undefined scenarios", () => {
    expect(publicScenario(null)).toBeNull();
    expect(publicScenario(undefined)).toBeNull();
  });
});
