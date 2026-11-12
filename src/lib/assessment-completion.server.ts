import { NOTICE_UNCONFIGURED } from "./assessment-notice";

/** Sending is intentionally disabled. The staged INSERT trigger is the eventual
 * transactional source of truth, including future assessment insertion paths.
 * Reads/retries of old assessments must never schedule a backfill. */
export async function persistedAssessmentCompletion(assessmentId: string) {
  if (!assessmentId) throw new Error("Assessment was not persisted");
  return { state: "unconfigured" as const, message: NOTICE_UNCONFIGURED };
}