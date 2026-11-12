import { NOTICE_UNCONFIGURED } from "./assessment-notice";
import { ASSESSMENT_MAIL_ENABLED, processPersistedAssessmentMail, type MailConfig } from "./assessment-mail.server";

/** Sending is intentionally disabled. The staged INSERT trigger is the eventual
 * transactional source of truth, including future assessment insertion paths.
 * Reads/retries of old assessments must never schedule a backfill. */
export async function persistedAssessmentCompletion(assessmentId: string, runtime?: { admin: unknown; config: MailConfig }) {
  if (!assessmentId) throw new Error("Assessment was not persisted");
  if (ASSESSMENT_MAIL_ENABLED && runtime) {
    const state = await processPersistedAssessmentMail(runtime.admin, assessmentId, runtime.config);
    const message = state === "queued" ? "Assessment saved. Email notice queued; delivery is not confirmed."
      : state === "accepted" ? "Assessment saved. Gmail accepted the email notice; delivery is not confirmed."
      : state === "ambiguous" ? "Assessment saved. The email outcome is unknown; automatic resend is paused to avoid duplicates."
      : state === "retry" ? "Assessment saved. The email notice could not be accepted; a safe retry is pending."
      : state === "blocked" ? "Assessment saved. The email notice is blocked; no automatic resend will occur."
      : state === "busy_or_done" ? "Assessment saved. The email notice is already being handled; delivery is not confirmed."
      : NOTICE_UNCONFIGURED;
    return { state, message };
  }
  return { state: "unconfigured" as const, message: NOTICE_UNCONFIGURED };
}