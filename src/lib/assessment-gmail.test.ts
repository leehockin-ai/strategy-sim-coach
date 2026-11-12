import { describe, expect, it, vi } from "vitest";
import { sendGmailAssessment, GMAIL_SCOPE, GMAIL_SENDER } from "./assessment-gmail.server";
import { assessmentNotice } from "./assessment-notice";
import { enqueueAssessmentMail, processPersistedAssessmentMail, REPORT_ORIGINS } from "./assessment-mail.server";
import { persistedAssessmentCompletion } from "./assessment-completion.server";
const owner = "11111111-1111-4111-8111-111111111111", assessmentId = "22222222-2222-4222-8222-222222222222", sessionId = "33333333-3333-4333-8333-333333333333";
const notice = assessmentNotice({ assessmentId, sessionId, ownerId: owner, recipientOwnerId: owner, recipientEmail: "coach@example.test", origin: REPORT_ORIGINS[0], pendingHumanReview: true }, REPORT_ORIGINS);
const config = { enabled: true, clientId: "synthetic-client", clientSecret: "synthetic-secret", refreshToken: "synthetic-refresh" };
const options = { templateData: notice.templateData, idempotencyKey: notice.idempotencyKey };
const token = () => Response.json({ access_token: "synthetic-access", token_type: "Bearer", scope: GMAIL_SCOPE });
function mockFetch(responses: (Response | Error)[]) {
  return vi.fn<typeof fetch>(async () => { const next = responses.shift(); if (next instanceof Error) throw next; if (!next) throw new Error("Unexpected network call"); return next; });
}
describe("isolated Gmail HTTP transport: no real fetch", () => {
  it("refreshes offline and sends the exact registered minimal template from the dedicated mailbox", async () => {
    const request = mockFetch([token(), Response.json({ id: "synthetic-receipt" })]);
    const before = vi.fn(async () => { expect(request).toHaveBeenCalledTimes(1); });
    expect(await sendGmailAssessment(notice.recipientEmail, options, config, before, request)).toEqual({ sent: true });
    const refreshBody = request.mock.calls[0][1]?.body as URLSearchParams;
    expect(refreshBody.get("grant_type")).toBe("refresh_token");
    expect(refreshBody.get("refresh_token")).toBe("synthetic-refresh");
    expect(before).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[1][0]).toBe(`https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(GMAIL_SENDER)}/messages/send`);
    const raw = JSON.parse(String(request.mock.calls[1][1]?.body)).raw;
    const mime = Buffer.from(raw, "base64url").toString("utf8");
    expect(mime).toContain("From: Coach Compass <coachcompass.notifications@gmail.com>");
    expect(mime).toContain("To: coach@example.test");
    const parts = [...mime.matchAll(/Content-Transfer-Encoding: base64\r\n\r\n([A-Za-z0-9+/=\r\n]+)(?=--assessment_)/g)].map(m => Buffer.from(m[1].replace(/\s/g, ""), "base64").toString("utf8"));
    expect(parts).toHaveLength(2);
    expect(parts[0]).toContain(notice.templateData.reportUrl);
    expect(parts[1]).toContain("Human review is pending; this is not a certification decision.");
    expect(parts.join("")).not.toMatch(/synthetic-secret|synthetic-refresh|synthetic-access/);
    expect(request.mock.calls[1][1]?.headers).not.toHaveProperty("Idempotency-Key");
  });
  it("is disabled by default and completion does not touch Gmail or the database", async () => {
    const request = mockFetch([]), before = vi.fn(), rpc = vi.fn();
    await expect(sendGmailAssessment(notice.recipientEmail, options, { ...config, enabled: false }, before, request)).rejects.toMatchObject({ outcome: "blocked" });
    expect((await persistedAssessmentCompletion(assessmentId, { admin: { rpc }, config: { enabled: true, origin: REPORT_ORIGINS[0], transport: "gmail", gmail: config, gmailFetch: request } })).state).toBe("unconfigured");
    expect(request).not.toHaveBeenCalled(); expect(rpc).not.toHaveBeenCalled(); expect(before).not.toHaveBeenCalled();
  });
  it("cannot bypass the durable reservation via the mail helper", async () => {
    const request = mockFetch([]);
    await expect(enqueueAssessmentMail(notice, { enabled: true, origin: REPORT_ORIGINS[0], transport: "gmail", gmail: config, gmailFetch: request })).rejects.toMatchObject({ providerCode: "durable_send_reservation_required" });
    expect(request).not.toHaveBeenCalled();
  });
  it.each([400, 401, 403])("blocks refresh rejection %i before any send", async status => {
    const request = mockFetch([Response.json({ error: "invalid_grant" }, { status })]), before = vi.fn();
    await expect(sendGmailAssessment(notice.recipientEmail, options, config, before, request)).rejects.toMatchObject({ outcome: "blocked", status });
    expect(request).toHaveBeenCalledTimes(1); expect(before).not.toHaveBeenCalled();
  });
  it("refresh network failure is retryable because no send happened", async () => {
    const request = mockFetch([new Error("network")]), before = vi.fn();
    await expect(sendGmailAssessment(notice.recipientEmail, options, config, before, request)).rejects.toMatchObject({ outcome: "retry" });
    expect(before).not.toHaveBeenCalled();
  });
  it("missing send scope blocks before reservation", async () => {
    const before = vi.fn();
    await expect(sendGmailAssessment(notice.recipientEmail, options, config, before, mockFetch([Response.json({ access_token: "synthetic", token_type: "Bearer", scope: "openid" })]))).rejects.toMatchObject({ outcome: "blocked" });
    expect(before).not.toHaveBeenCalled();
  });
  it.each([400, 401, 403, 404, 429, 500, 503])("classifies send HTTP %i without blind HTTP retries", async status => {
    const request = mockFetch([token(), Response.json({ error: { code: status } }, { status })]);
    await expect(sendGmailAssessment(notice.recipientEmail, options, config, async () => {}, request)).rejects.toMatchObject({ outcome: status >= 500 ? "ambiguous" : status === 429 ? "retry" : "blocked", status });
    expect(request).toHaveBeenCalledTimes(2);
  });
  it.each([new Error("timeout"), Response.json({}), new Response("bad json", { status: 200 })])("marks lost or malformed receipts ambiguous, never resends", async result => {
    const request = mockFetch([token(), result]);
    await expect(sendGmailAssessment(notice.recipientEmail, options, config, async () => {}, request)).rejects.toMatchObject({ outcome: "ambiguous" });
    expect(request).toHaveBeenCalledTimes(2);
  });
  it("failed durable reservation prevents the send POST", async () => {
    const request = mockFetch([token()]);
    await expect(sendGmailAssessment(notice.recipientEmail, options, config, async () => { throw new Error("CAS failed"); }, request)).rejects.toThrow("CAS failed");
    expect(request).toHaveBeenCalledTimes(1);
  });
  it.each(["https://evil.example/sessions/33333333-3333-4333-8333-333333333333/report", `${notice.templateData.reportUrl}?redirect=evil`])("rejects unsafe report links before network", async reportUrl => {
    const request = mockFetch([]);
    await expect(sendGmailAssessment(notice.recipientEmail, { ...options, templateData: { ...options.templateData, reportUrl } }, config, async () => {}, request)).rejects.toMatchObject({ outcome: "blocked" });
    expect(request).not.toHaveBeenCalled();
  });
  it("rejects header injection before refresh", async () => {
    const request = mockFetch([]);
    await expect(sendGmailAssessment("coach@example.test\r\nBcc: evil@example.test", options, config, async () => {}, request)).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });
  it.each([false, true])("persisted assessment uses atomic reservation and holds unknown ack (settle failure=%s)", async failSettle => {
    const request = mockFetch([token(), failSettle ? Response.json({ id: "receipt" }) : new Error("lost")]);
    const rpc = vi.fn(async (name: string) => name === "claim_assessment_ready" ? { data: { session_id: sessionId, owner_id: owner, recipient_email: notice.recipientEmail, pending_human_review: true } } : { data: failSettle && name === "settle_assessment_ready" ? false : true });
    expect(await processPersistedAssessmentMail({ rpc }, assessmentId, { enabled: true, origin: REPORT_ORIGINS[0], transport: "gmail", gmail: config, gmailFetch: request })).toBe("ambiguous");
    expect(rpc.mock.calls.map(c => c[0])).toEqual(["claim_assessment_ready", "begin_assessment_gmail_send", "settle_assessment_ready"]);
    expect(request).toHaveBeenCalledTimes(2);
  });
});