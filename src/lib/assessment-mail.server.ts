import { assessmentNotice } from "./assessment-notice";

export const ASSESSMENT_MAIL_ENABLED = false;
// Deployment-controlled allowlist, never a browser Host/Origin or request body.
export const REPORT_ORIGINS = ["https://strategy-sim-coach.lovable.app"] as const;
export interface MailConfig { enabled: boolean; origin: string; serviceCredential: string; transport: typeof fetch }

/** Only the supported authenticated send route enqueues mail. It owns suppression,
 * footer and provider handling; this adapter never calls a provider directly. */
export async function enqueueAssessmentMail(notice: ReturnType<typeof assessmentNotice>, config: MailConfig) {
  if (!config.enabled || !config.serviceCredential || !REPORT_ORIGINS.includes(config.origin as typeof REPORT_ORIGINS[number])) throw Object.assign(new Error("Email setup is incomplete"), { status: 403 });
  const response = await config.transport(`${config.origin}/lovable/email/transactional/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.serviceCredential}` },
    body: JSON.stringify({ templateName: "assessment-ready", recipientEmail: notice.recipientEmail, idempotencyKey: notice.idempotencyKey, templateData: notice.templateData }),
    redirect: "error",
  });
  if (!response.ok) {
    const retry = response.headers.get("Retry-After");
    const seconds = retry && /^\d+$/.test(retry) ? Number(retry) : retry ? Math.ceil((Date.parse(retry) - Date.now()) / 1000) : 60;
    throw Object.assign(new Error("Email queue did not accept the notice"), { status: response.status, retrySeconds: Number.isFinite(seconds) ? Math.max(60, seconds) : 60 });
  }
  const result = await response.json() as { status?: string; state?: string; queued?: boolean };
  // Must match the eventual scaffold response, verified before enablement.
  if (!(result.queued === true || result.status === "queued" || result.state === "queued")) throw Object.assign(new Error("Email queue acceptance was not confirmed"), { status: 503 });
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