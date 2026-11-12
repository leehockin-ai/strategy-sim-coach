import { assessmentNotice } from "./assessment-notice";
import { GmailDeliveryError, readGmailConfig, sendGmailAssessment, type GmailConfig } from "./assessment-gmail.server";

export const ASSESSMENT_MAIL_ENABLED = false;
// Deployment-controlled allowlist, never a browser Host/Origin or request body.
export const REPORT_ORIGINS = ["https://strategy-sim-coach.lovable.app"] as const;
export interface MailConfig {
  enabled: boolean;
  origin: string;
  transport?: "managed" | "gmail";
  gmail?: GmailConfig;
  gmailFetch?: typeof fetch;
  send?: (name: string, recipient: string, options: { templateData: Record<string, unknown>; idempotencyKey: string }) => Promise<{ sent: true } | { sent: false; reason: "recipient_suppressed" }>;
}

/** Managed sending owns suppression, footer and delivery retries. The existing
 * function name is retained for compatibility with the staged feature outbox. */
export async function enqueueAssessmentMail(notice: ReturnType<typeof assessmentNotice>, config: MailConfig, beforeSend?: () => Promise<void>) {
  if (!config.enabled || !REPORT_ORIGINS.includes(config.origin as typeof REPORT_ORIGINS[number])) throw Object.assign(new Error("Email setup is incomplete"), { status: 403 });
  if (config.transport === "gmail") {
    if (!beforeSend) throw new GmailDeliveryError("blocked", 403, "durable_send_reservation_required");
    await sendGmailAssessment(notice.recipientEmail, { idempotencyKey: notice.idempotencyKey, templateData: notice.templateData }, config.gmail ?? readGmailConfig(), beforeSend, config.gmailFetch);
    return;
  }
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
  const gmail = config.transport === "gmail";
  let state: "queued" | "accepted" | "retry" | "blocked" | "ambiguous" = gmail ? "accepted" : "queued";
  let retrySeconds = 60;
  try {
    const notice = assessmentNotice({ assessmentId, sessionId: row.session_id, ownerId: row.owner_id, recipientOwnerId: row.owner_id, recipientEmail: row.recipient_email, origin: config.origin, pendingHumanReview: row.pending_human_review }, REPORT_ORIGINS);
    await enqueueAssessmentMail(notice, config, gmail ? async () => {
      const reserved = await admin.rpc("begin_assessment_gmail_send", { _assessment: assessmentId, _token: token });
      if (reserved.error || reserved.data !== true) throw new GmailDeliveryError("blocked", 403, "durable_reservation_failed");
    } : undefined);
  } catch (error) {
    const status = error && typeof error === "object" && "status" in error ? Number(error.status) : 0;
    state = error instanceof GmailDeliveryError ? error.outcome : gmail ? "blocked" : status === 429 || status >= 500 || status === 0 ? "retry" : "blocked";
    if (error && typeof error === "object" && "retrySeconds" in error) retrySeconds = Number(error.retrySeconds) || 60;
  }
  const settle = await admin.rpc("settle_assessment_ready", { _assessment: assessmentId, _token: token, _state: state, _retry_seconds: retrySeconds });
  // Gmail cannot safely repeat after acceptance/unknown ack. The staged SQL
  // leaves 'sending' terminal to automatic claims, including after crashes.
  if (settle.error || settle.data !== true) return gmail ? "ambiguous" : "retry";
  return state;
}