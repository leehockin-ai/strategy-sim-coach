import { createServerOnlyFn } from "@tanstack/react-start";
import React from "react";
import { render } from "@react-email/render";
import { z } from "zod";
import { TEMPLATES } from "./email-templates/registry";

export const GMAIL_SENDER = "coachcompass.notifications@gmail.com";
export const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.send";
export interface GmailConfig { enabled: boolean; clientId?: string; clientSecret?: string; refreshToken?: string }
export const readGmailConfig = createServerOnlyFn((): GmailConfig => ({
  // A second gate; this never overrides ASSESSMENT_MAIL_ENABLED=false.
  enabled: process.env["ASSESSMENT_GMAIL_ENABLED"] === "true",
  clientId: process.env["ASSESSMENT_GMAIL_CLIENT_ID"],
  clientSecret: process.env["ASSESSMENT_GMAIL_CLIENT_SECRET"],
  refreshToken: process.env["ASSESSMENT_GMAIL_REFRESH_TOKEN"],
}));

export class GmailDeliveryError extends Error {
  constructor(public outcome: "retry" | "blocked" | "ambiguous", public status: number, public providerCode: string) {
    super(`Gmail ${outcome} [${status}]: ${providerCode}`);
  }
}
const b64 = (s: string) => btoa(Array.from(new TextEncoder().encode(s), b => String.fromCharCode(b)).join(""));
const header = (s: string) => `=?UTF-8?B?${b64(s)}?=`;
const wrap = (s: string) => b64(s).match(/.{1,76}/g)?.join("\r\n") ?? "";

/** No endpoint/client/UI can supply a From address, arbitrary template or body.
 * The caller must supply an owner-verified notice AND an atomic durable sending
 * reservation. Message-ID is correlation only: Gmail does not deduplicate it. */
export async function sendGmailAssessment(
  recipient: string,
  options: { templateData: Record<string, unknown>; idempotencyKey: string },
  config: GmailConfig,
  beforeSend: () => Promise<void>,
  request: typeof fetch = fetch,
) {
  if (!config.enabled || !config.clientId || !config.clientSecret || !config.refreshToken) throw new GmailDeliveryError("blocked", 403, "setup_incomplete");
  z.string().email().refine(v => !/[\r\n]/.test(v)).parse(recipient);
  const id = z.string().regex(/^assessment-ready:[0-9a-f-]{36}$/i).parse(options.idempotencyKey).slice("assessment-ready:".length);
  z.string().uuid().parse(id);
  const data = z.object({ reportUrl: z.string().url(), status: z.enum([
    "Your AI assessment is ready. Human review is pending; this is not a certification decision.",
    "Your assessment is ready. See the signed-in report for its review status.",
  ]) }).strict().parse(options.templateData);
  const url = new URL(data.reportUrl);
  if (url.origin !== "https://strategy-sim-coach.lovable.app" || url.search || url.hash || !/^\/sessions\/[0-9a-f-]{36}\/report$/i.test(url.pathname)) throw new GmailDeliveryError("blocked", 403, "untrusted_report_link");
  const template = TEMPLATES["assessment-ready"];
  const element = React.createElement(template.component, data);
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  const subject = typeof template.subject === "function" ? template.subject(data) : template.subject;
  const boundary = `assessment_${id}`;
  const mime = [
    `From: Coach Compass <${GMAIL_SENDER}>`, `To: ${recipient}`, `Subject: ${header(subject)}`,
    `Message-ID: <assessment-ready.${id}@gmail.com>`, "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`, "",
    `--${boundary}`, 'Content-Type: text/plain; charset="UTF-8"', "Content-Transfer-Encoding: base64", "", wrap(text),
    `--${boundary}`, 'Content-Type: text/html; charset="UTF-8"', "Content-Transfer-Encoding: base64", "", wrap(html),
    `--${boundary}--`, "",
  ].join("\r\n");
  // Refresh is safe to retry: no message has been submitted yet. Tokens remain
  // request-local, never logged, stored in browser state or returned to callers.
  let tokenResponse: Response;
  try {
    tokenResponse = await request("https://oauth2.googleapis.com/token", {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(15000),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "refresh_token", client_id: config.clientId, client_secret: config.clientSecret, refresh_token: config.refreshToken }),
    });
  } catch { throw new GmailDeliveryError("retry", 0, "refresh_unavailable"); }
  if (!tokenResponse.ok) throw new GmailDeliveryError(tokenResponse.status === 429 || tokenResponse.status >= 500 ? "retry" : "blocked", tokenResponse.status, "refresh_rejected");
  let token: { access_token: string; token_type: string; scope?: string };
  try {
    token = z.object({ access_token: z.string().min(1), token_type: z.string(), scope: z.string().optional() }).parse(await tokenResponse.json());
    if (token.token_type.toLowerCase() !== "bearer" || (token.scope && !token.scope.split(" ").includes(GMAIL_SCOPE))) throw new Error("scope");
  } catch { throw new GmailDeliveryError("blocked", 403, "invalid_token_or_scope"); }
  await beforeSend(); // CAS processing -> sending MUST succeed before POST.
  let response: Response;
  try {
    // Using the exact mailbox instead of 'me' prevents a different authorized
    // account from accidentally becoming this sender; Gmail enforces userId.
    response = await request(`https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(GMAIL_SENDER)}/messages/send`, {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw: b64(mime).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") }),
    });
  } catch { throw new GmailDeliveryError("ambiguous", 0, "send_outcome_unknown"); }
  // No body logging: provider text may contain addresses or reflected input.
  // Preserve status plus a bounded code, never credentials/report data.
  if (!response.ok) {
    const rejected = [400, 401, 403, 404, 429].includes(response.status);
    throw new GmailDeliveryError(rejected ? (response.status === 429 ? "retry" : "blocked") : "ambiguous", response.status, "send_rejected_or_unknown");
  }
  try {
    z.object({ id: z.string().min(1) }).parse(await response.json());
  } catch { throw new GmailDeliveryError("ambiguous", response.status, "missing_acceptance_receipt"); }
  return { sent: true as const }; // API acceptance, NOT confirmed delivery.
}