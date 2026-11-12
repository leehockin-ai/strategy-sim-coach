import { assessmentNotice } from "./assessment-notice";

export const ASSESSMENT_MAIL_ENABLED = false;
// Deployment-controlled allowlist, never a browser Host/Origin or request body.
export const REPORT_ORIGINS = ["https://strategy-sim-coach.lovable.app"] as const;
export interface MailConfig {
  enabled: boolean;
  origin: string;
  send?: (name: string, recipient: string, options: { templateData: Record<string, unknown>; idempotencyKey: string }) => Promise<{ sent: true } | { sent: false; reason: "recipient_suppressed" }>;
}

/** Managed sending owns suppression, footer and delivery retries. The existing
 * function name is retained for compatibility with the staged feature outbox. */
export async function enqueueAssessmentMail(notice: ReturnType<typeof assessmentNotice>, config: MailConfig) {
  if (!config.enabled || !REPORT_ORIGINS.includes(config.origin as typeof REPORT_ORIGINS[number])) throw Object.assign(new Error("Email setup is incomplete"), { status: 403 });
  const send = config.send ?? (await import("./email-templates/send-email")).sendTemplateEmail;
  const result = await send("assessment-ready", notice.recipientEmail, {
    idempotencyKey: notice.idempotencyKey,
    templateData: notice.templateData,
  });
  if (!result.sent) throw Object.assign(new Error("Recipient is suppressed"), { status: 403 });
}

/** Runs ONLY for an already-persisted assessment. RPCs cannot manufacture notices
 * for historical reports; claim revalidates confirmed owner and current review state. */
export async function processPersistedAssessmentMail(admin: any, assessmentId: string, config: MailConfig) {
  if (!config.enabled) return "unconfigured";
  const token = crypto.randomUUID();
  const claim = await admin.rpc("claim_assessment_ready", { _assessment: assessmentId, _token: token });
  if (claim.error) return "unconfigured";
  const row = claim.data;
  if (!row) return "busy_or_done";
  let state: "queued" | "retry" | "blocked" = "queued";
  let retrySeconds = 60;
  try {
    const notice = assessmentNotice({ assessmentId, sessionId: row.session_id, ownerId: row.owner_id, recipientOwnerId: row.owner_id, recipientEmail: row.recipient_email, origin: config.origin, pendingHumanReview: row.pending_human_review }, REPORT_ORIGINS);
    await enqueueAssessmentMail(notice, config);
  } catch (error) {
    const status = error && typeof error === "object" && "status" in error ? Number(error.status) : 0;
    state = status === 429 || status >= 500 || status === 0 ? "retry" : "blocked";
    if (error && typeof error === "object" && "retrySeconds" in error) retrySeconds = Number(error.retrySeconds) || 60;
  }
  const settle = await admin.rpc("settle_assessment_ready", { _assessment: assessmentId, _token: token, _state: state, _retry_seconds: retrySeconds });
  if (settle.error || settle.data !== true) return "retry";
  return state;
}