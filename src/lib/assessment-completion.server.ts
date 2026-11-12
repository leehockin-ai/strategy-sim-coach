import { NOTICE_UNCONFIGURED } from "./assessment-notice";
import { ASSESSMENT_MAIL_ENABLED, processPersistedAssessmentMail, type MailConfig } from "./assessment-mail.server";

/** Sending is intentionally disabled. The staged INSERT trigger is the eventual
 * transactional source of truth, including future assessment insertion paths.
 * Reads/retries of old assessments must never schedule a backfill. */
export async function persistedAssessmentCompletion(assessmentId: string, runtime?: { admin: unknown; config: MailConfig }) {
  if (!assessmentId) throw new Error("Assessment was not persisted");
  if (ASSESSMENT_MAIL_ENABLED && runtime) {
    const state = await processPersistedAssessmentMail(runtime.admin, assessmentId, runtime.config);
    return { state, message: state === "queued" ? "Assessment saved. Email notice queued; delivery is not confirmed." : NOTICE_UNCONFIGURED };
  }
  return { state: "unconfigured" as const, message: NOTICE_UNCONFIGURED };
}