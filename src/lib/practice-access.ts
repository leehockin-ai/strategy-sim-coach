import { z } from "zod";
import { practiceDraftSchema, practiceScenario } from "./custom-scenario";

export const practiceStartSchema = z.object({ requestId: z.string().uuid(), draft: practiceDraftSchema }).strict();
export const PRIVATE_PRACTICE_VERSION = 1;

/** No catalog fallback: a private snapshot must validate before any consumer uses it. */
export function hydratePracticeSession<T extends Record<string, any>>(session: T): T {
  if (!session.custom_practice_snapshot) return session;
  const draft = practiceDraftSchema.parse(session.custom_practice_snapshot);
  return { ...session, scenarios: practiceScenario(draft, session.id), practice_only: true };
}

export function certificationEligible(session: Record<string, any>) {
  return !session.custom_practice_snapshot;
}

export function assertCertificationSession(session: Record<string, any> | null | undefined) {
  if (!session || !certificationEligible(session)) throw new Error("Custom practice cannot enter Strategyzer certification or human review.");
}

export function assertPrivateSessionReader(session: Record<string, any>, userId: string) {
  if (session.custom_practice_snapshot && session.owner_id !== userId) throw new Error("Private practice not found");
}