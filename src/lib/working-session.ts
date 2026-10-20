import { readEngagementBrief } from "./scope-brief";

export type RoomUnavailableReason = "configuration_missing" | "poc_not_allowlisted" | "content_unapproved";
export function roomEligibility(config: { poc: boolean; methodology_approved: boolean } | null, testAllowed: boolean): RoomUnavailableReason | null {
  if (!config) return "configuration_missing";
  if (config.poc && !testAllowed) return "poc_not_allowlisted";
  if (!config.poc && !config.methodology_approved) return "content_unapproved";
  return null;
}
export const unavailableRoomCopy: Record<RoomUnavailableReason, string> = {
  configuration_missing: "A client team working session is not configured for this environment and approach in this test release.",
  poc_not_allowlisted: "This client team is available only in designated TEST / NON-PRODUCTION sessions. This session is not designated for that proof of concept.",
  content_unapproved: "The client team content for this environment and approach has not been approved for use.",
};

export function boundScopeOutcome(revision: { revision: number; snapshot: unknown } | null | undefined) {
  const snapshot = revision?.snapshot;
  const brief = readEngagementBrief(snapshot && typeof snapshot === "object" && "engagement_brief" in snapshot ? snapshot.engagement_brief : undefined);
  return { revision: revision?.revision ?? null, success: brief.success, decision_to_enable: brief.decision_to_enable, decision_maker: brief.decision_maker };
}