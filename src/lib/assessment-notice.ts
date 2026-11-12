import { z } from "zod";

export const NOTICE_UNCONFIGURED = "Assessment saved. Email notices are not configured; no email has been sent.";
export const noticeInput = z.object({
  assessmentId: z.string().uuid(), sessionId: z.string().uuid(), ownerId: z.string().uuid(),
  recipientOwnerId: z.string().uuid(), recipientEmail: z.string().email(),
  origin: z.string().url(), pendingHumanReview: z.boolean(),
}).strict();

/** No scenario filter: the persisted assessment is the single triggering event. */
export function assessmentNotice(input: z.input<typeof noticeInput>, trustedOrigins: readonly string[]) {
  const d = noticeInput.parse(input);
  if (d.ownerId !== d.recipientOwnerId) throw new Error("Unauthorized notice recipient");
  const url = new URL(d.origin);
  if (url.protocol !== "https:" || url.origin !== d.origin || !trustedOrigins.includes(url.origin)) throw new Error("Untrusted report origin");
  return {
    idempotencyKey: `assessment-ready:${d.assessmentId}`,
    recipientEmail: d.recipientEmail,
    subject: "Your Coach Compass assessment is ready",
    templateData: {
      reportUrl: `${url.origin}/sessions/${d.sessionId}/report`,
      status: d.pendingHumanReview ? "Your AI assessment is ready. Human review is pending; this is not a certification decision." : "Your assessment is ready. See the signed-in report for its review status.",
    },
  };
}

export interface NoticeOutbox {
  /** Durable INSERT ON CONFLICT (assessment_id) DO NOTHING. */
  insertOnce(key: string, notice: ReturnType<typeof assessmentNotice>): Promise<boolean>;
}
export async function recordAssessmentNotice(store: NoticeOutbox | null, notice: ReturnType<typeof assessmentNotice>) {
  if (!store) return { state: "unconfigured" as const, message: NOTICE_UNCONFIGURED };
  const inserted = await store.insertOnce(notice.idempotencyKey, notice);
  return { state: "queued" as const, inserted, message: "Assessment saved. Email notice queued; delivery is not confirmed." };
}

/** Durable dispatcher contract: lease/CAS and transport idempotency both matter.
 * A crash after enqueue but before ack repeats the same key, never a new email.
 * Infrastructure retry is separate from assessment retry. No live adapter wired. */
export interface NoticeDispatcher {
  claim(key: string): Promise<{ token: string; notice: ReturnType<typeof assessmentNotice> } | null>;
  enqueue(notice: ReturnType<typeof assessmentNotice>): Promise<void>;
  settle(key: string, token: string, state: "queued" | "retry" | "blocked"): Promise<void>;
}
export async function dispatchAssessmentNotice(dispatcher: NoticeDispatcher, key: string) {
  const row = await dispatcher.claim(key);
  if (!row) return "busy_or_done";
  try {
    await dispatcher.enqueue(row.notice);
    await dispatcher.settle(key, row.token, "queued");
    return "queued";
  } catch (e) {
    const status = e && typeof e === "object" && "status" in e ? Number(e.status) : 0;
    const state = status === 429 || status >= 500 ? "retry" : "blocked";
    await dispatcher.settle(key, row.token, state);
    return state;
  }
}