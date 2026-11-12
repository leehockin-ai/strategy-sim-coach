import { readEngagementBrief } from "./scope-brief";

export type RoomUnavailableReason = "configuration_missing" | "poc_not_allowlisted" | "content_unapproved";
export function roomEligibility(config: { poc: boolean; methodology_approved: boolean } | null, testAllowed: boolean): RoomUnavailableReason | null {
  if (!config) return "configuration_missing";
  if (config.poc && !testAllowed) return "poc_not_allowlisted";
  if (!config.poc && !config.methodology_approved) return "content_unapproved";
  return null;
}
export const unavailableRoomCopy: Record<RoomUnavailableReason, string> = {
  configuration_missing: "A client team working session isn't set up yet for this client and approach.",
  poc_not_allowlisted: "The simulated client team is currently switched on only for designated test sessions, so it isn't available in this session.",
  content_unapproved: "The client team for this client and approach hasn't been approved for use yet.",
};

export function boundScopeOutcome(revision: { revision: number; snapshot: unknown } | null | undefined) {
  const snapshot = revision?.snapshot;
  const brief = readEngagementBrief(snapshot && typeof snapshot === "object" && "engagement_brief" in snapshot ? snapshot.engagement_brief : undefined);
  return { revision: revision?.revision ?? null, success: brief.success, decision_to_enable: brief.decision_to_enable, decision_maker: brief.decision_maker };
}
/**
 * Chapter 2 renders exactly one working-session surface.
 * A playbook saved in Scope always means the normal in-app session, whatever
 * stale external setup runs or allowlist flags exist. The gated external test
 * room appears only for allowlisted legacy sessions with no Scope playbook decision.
 */
export type Chapter2Surface = "in_app" | "external_test_room";
export function chapter2Surface(input: { scopeChoice: "selected" | "none" | "defer" | "undecided"; testAllowed: boolean }): Chapter2Surface {
  // None/defer are deliberate coaching decisions; an external Playbook room would contradict them.
  return input.scopeChoice === "undecided" && input.testAllowed ? "external_test_room" : "in_app";
}

// Missing mode is historical certification, not permission to expose formative feedback.
export function formativeGuidanceAllowed(session: { custom_practice_snapshot?: unknown; practice_only?: unknown }): boolean {
  return !!session.custom_practice_snapshot || session.practice_only === true;
}

export function chapter2Layout(pathwayType: string): "shared_only" | "shared_with_approach" {
  return pathwayType === "playbook" ? "shared_only" : "shared_with_approach";
}
