import { describe, expect, it } from "vitest";
import { assessmentNotice, dispatchAssessmentNotice, recordAssessmentNotice } from "./assessment-notice";
const owner = "11111111-1111-4111-8111-111111111111";
const input = { assessmentId: "22222222-2222-4222-8222-222222222222", sessionId: "33333333-3333-4333-8333-333333333333", ownerId: owner, recipientOwnerId: owner, recipientEmail: "coach@example.invalid", origin: "https://strategy-sim-coach.lovable.app", pendingHumanReview: true };
const origins = [input.origin];
describe("central assessment-ready contract", () => {
  it.each(["student-founder-meal-app", "weak-sponsor-fintech", "solution-jumping-saas", "evidence-resistant-health", "custom-owner-practice"])("uses the same persisted event for %s without scenario-specific routing", async () => {
    const notice = assessmentNotice(input, origins);
    expect(notice.idempotencyKey).toBe(`assessment-ready:${input.assessmentId}`);
    expect(notice.templateData.reportUrl).toBe(`${input.origin}/sessions/${input.sessionId}/report`);
    expect(Object.keys(notice.templateData).sort()).toEqual(["reportUrl", "status"]);
  });
  it("concurrent inserts and explicit retries create only one durable event per assessment", async () => {
    const rows = new Map<string, unknown>();
    const store = { async insertOnce(key: string, notice: unknown) { if (rows.has(key)) return false; rows.set(key, notice); return true; } };
    const n = assessmentNotice(input, origins);
    const results = await Promise.all([recordAssessmentNotice(store, n), recordAssessmentNotice(store, n)]);
    expect(results.filter(r => 'inserted' in r && r.inserted)).toHaveLength(1);
    await recordAssessmentNotice(store, n);
    expect(rows.size).toBe(1);
  });
  it("rejects a recipient not belonging to the signed-in owner", () => {
    expect(() => assessmentNotice({ ...input, recipientOwnerId: input.sessionId }, origins)).toThrow("Unauthorized");
  });
  it.each(["https://evil.invalid", "https://strategy-sim-coach.lovable.app/redirect", "http://strategy-sim-coach.lovable.app"])("rejects untrusted report origin %s", origin => {
    expect(() => assessmentNotice({ ...input, origin }, origins)).toThrow("Untrusted");
  });
  it("never claims delivery when unconfigured", async () => {
    expect(await recordAssessmentNotice(null, assessmentNotice(input, origins))).toEqual({ state: "unconfigured", message: "Assessment saved. Email notices are not configured; no email has been sent." });
  });
  it("pending review is not represented as certification", () => {
    expect(assessmentNotice(input, origins).templateData.status).toContain("Human review is pending; this is not a certification decision.");
  });
  it("mail mock retries transient failure using the same assessment key and never claims delivery", async () => {
    const notice = assessmentNotice(input, origins);
    const calls: string[] = []; const states: string[] = [];
    const dispatcher = { claim: async () => ({ token: "lease", notice }), enqueue: async (n: typeof notice) => { calls.push(n.idempotencyKey); if (calls.length === 1) throw { status: 503 }; }, settle: async (_k: string, _t: string, state: string) => { states.push(state); } };
    expect(await dispatchAssessmentNotice(dispatcher, notice.idempotencyKey)).toBe("retry");
    expect(await dispatchAssessmentNotice(dispatcher, notice.idempotencyKey)).toBe("queued");
    expect(calls).toEqual([notice.idempotencyKey, notice.idempotencyKey]);
    expect(states).toEqual(["retry", "queued"]);
  });
  it("mail mock blocks authorization/configuration failures instead of blindly retrying", async () => {
    const notice = assessmentNotice(input, origins);
    let settled = "";
    const dispatcher = { claim: async () => ({ token: "lease", notice }), enqueue: async () => { throw { status: 403 }; }, settle: async (_k: string, _t: string, s: string) => { settled = s; } };
    expect(await dispatchAssessmentNotice(dispatcher, notice.idempotencyKey)).toBe("blocked");
    expect(settled).toBe("blocked");
  });
});