import { expect, it } from "vitest";
import { publicAssignment } from "./assignment-visibility";

it("assignment details exclude private diagnostic fields and stakeholder dynamics", () => {
  const result = publicAssignment({ id: "a", internal_notes: "SECRET-NOTES", scenarios: { id: "s", title: "Client", context: "Public", ambiguity_factors: ["SECRET-DIAGNOSIS"], system_prompt: "SECRET-PROMPT", unrealistic_aspects: ["SECRET-REALITY"], stakeholders: [{ name: "Maya", role: "Founder", posture: "SECRET-POSTURE", trust: "SECRET-TRUST" }] } });
  expect(result.scenarios?.context).toBe("Public");
  expect(result.scenarios?.stakeholders).toEqual([{ name: "Maya", role: "Founder" }]);
  for (const secret of ["SECRET-NOTES", "SECRET-DIAGNOSIS", "SECRET-PROMPT", "SECRET-REALITY", "SECRET-POSTURE", "SECRET-TRUST"]) expect(JSON.stringify(result)).not.toContain(secret);
});