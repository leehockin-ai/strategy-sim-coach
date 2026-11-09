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