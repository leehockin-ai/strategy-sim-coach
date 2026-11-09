// Chapter 2 → Chapter 3 readiness. Pure so the UI and the server guard share
// one rule. Only the modern Playbook working session is gated; legacy pathways
// and sessions already past Chapter 2 keep their historical behaviour.

export type Chapter3Readiness =
  | { allowed: true; basis: "not_gated" | "already_advanced" | "concluded" | "skipped" | "legacy_evidence" }
  | { allowed: false; basis: "needs_conclusion_or_skip" };

export const CHAPTER3_STATUSES = new Set([
  "intervention", "next_step_judgment", "engagement_orchestration", "playbook",
  "evaluated", "approved", "conditional", "not_approved", "retry", "escalated",
]);

export type ReadinessInput = {
  pathwayType: string | null | undefined;
  chosenSlug: string | null | undefined;
  currentStatus: string | null | undefined;
  concludedRun: boolean;
  skip: unknown;
  legacyCanvas: unknown;
};

export function hasRecordedSkip(skip: unknown): boolean {
  return !!skip && typeof skip === "object" && typeof (skip as { reason?: unknown }).reason === "string" && (skip as { reason: string }).reason.trim().length >= 10;
}

export function chapter3Readiness(i: ReadinessInput): Chapter3Readiness {
  if (!i.chosenSlug || (i.pathwayType ?? "playbook") !== "playbook") return { allowed: true, basis: "not_gated" };
  if (CHAPTER3_STATUSES.has((i.currentStatus ?? "").toLowerCase())) return { allowed: true, basis: "already_advanced" };
  if (i.concludedRun) return { allowed: true, basis: "concluded" };
  if (hasRecordedSkip(i.skip)) return { allowed: true, basis: "skipped" };
  if (i.legacyCanvas && typeof i.legacyCanvas === "object" && Object.keys(i.legacyCanvas).length > 0) return { allowed: true, basis: "legacy_evidence" };
  return { allowed: false, basis: "needs_conclusion_or_skip" };
}

export function hasConcludedEvent(events: Array<{ metadata: unknown }>): boolean {
  return events.some(e => !!e.metadata && typeof e.metadata === "object" && (e.metadata as { team_kind?: unknown }).team_kind === "concluded");
}

export type RoomStage = "connect" | "begin" | "facilitate" | "bring_together" | "concluded";
export function roomStage(connected: boolean, phase: string | null | undefined): RoomStage {
  if (!connected) return "connect";
  if (phase === "concluded") return "concluded";
  if (phase === "synthesis") return "bring_together";
  if (phase === "working") return "facilitate";
  return "begin";
}
