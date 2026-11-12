/** Three independent future policy hooks. No paywall, pricing or billing exists. */
export type EntitlementBoundary = "custom_practice_launch" | "full_ai_assessment" | "formal_certification_assessment";
export async function assertEntitlement(userId: string, boundary: EntitlementBoundary) {
  if (!userId) throw new Error("Sign in to continue");
  // Preserve today's authenticated access policy; role/ownership checks remain at callers.
  return { allowed: true as const, boundary, policy: "current_authenticated_access" as const };
}