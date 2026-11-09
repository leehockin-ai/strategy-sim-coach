// Resumable assessment generation engine (pure; storage and AI calls are injected).
// Each advance call runs one bounded batch so no single request carries the whole
// ~70s+ generation, and progress survives refreshes, double clicks and closed tabs.

export const SECTION_KEYS = [
  "situation_framing", "coaching_strategy", "stakeholder_navigation", "working_session_facilitation",
  "methodological_soundness", "intervention_discipline", "engagement_pathway",
  "intervention_fit", "intervention_execution",
] as const; // must mirror SECTION_RUBRIC keys (asserted in tests)

export const SKILL_STEPS = ["skills:soft", "skills:methodology"] as const;
export const SYNTHESIS_STEP = "synthesis";
export const MAX_STEP_ATTEMPTS = 2;
export const BATCH_SIZE = 4;
export const LEASE_MS = 150_000;

export type StepState =
  | { status: "done" | "placeholder"; attempts: number; result: unknown }
  | { status: "pending"; attempts: number; error?: string };

export type AssessmentJob = {
  id: string;
  session_id: string;
  owner_id: string;
  status: "running" | "failed" | "completed";
  steps: Record<string, StepState>;
  live_evidence: unknown;
  error: string | null;
  evaluation_id: string | null;
  lease_until: string | null;
  run_count: number;
};

export type AssessmentStatus = {
  state: "not_started" | "running" | "busy" | "failed" | "completed";
  done: number;
  total: number;
  error?: string | null;
  evaluationId?: string | null;
  retryAfterMs?: number;
};

export interface AssessmentStore {
  existingEvaluationId(sessionId: string): Promise<string | null>;
  getJob(sessionId: string): Promise<AssessmentJob | null>;
  /** Insert-if-absent; returns the existing row on conflict. */
  createJob(row: { session_id: string; owner_id: string; live_evidence: unknown }): Promise<AssessmentJob>;
  /** Atomic: only succeeds when status=running and no unexpired lease exists. */
  claim(jobId: string, token: string, nowIso: string, leaseUntilIso: string): Promise<AssessmentJob | null>;
  /** Writes only when the lease token still matches; clears the lease. */
  save(jobId: string, token: string, patch: Partial<Pick<AssessmentJob, "status" | "steps" | "error" | "evaluation_id">> & { completed_at?: string }): Promise<boolean>;
  /** Failed -> running again, keeping completed steps (explicit user retry). */
  reopen(jobId: string, steps: Record<string, StepState>): Promise<void>;
}

export interface AssessmentRunner {
  runStep(step: string, job: AssessmentJob): Promise<unknown>;
  placeholder(step: string, error: string): unknown;
  /** Synthesis + first-assessment insert; returns the saved (or concurrently saved) evaluation id. */
  finalize(job: AssessmentJob): Promise<string>;
}

/** Errors that should stop the job instead of being retried or replaced by placeholders. */
export class FatalAssessmentError extends Error {}

export const ALL_STEPS: string[] = [...SECTION_KEYS.map((k) => `section:${k}`), ...SKILL_STEPS];
export const TOTAL_STEPS = ALL_STEPS.length + 1;

export function isSettled(s: StepState | undefined) {
  return !!s && (s.status === "done" || s.status === "placeholder");
}

export function planBatch(job: Pick<AssessmentJob, "steps">): string[] {
  const pending = ALL_STEPS.filter((k) => !isSettled(job.steps[k]));
  return pending.length ? pending.slice(0, BATCH_SIZE) : [SYNTHESIS_STEP];
}

export function toStatus(job: AssessmentJob | null, state?: AssessmentStatus["state"]): AssessmentStatus {
  if (!job) return { state: state ?? "not_started", done: 0, total: TOTAL_STEPS };
  const done = ALL_STEPS.filter((k) => isSettled(job.steps[k])).length + (job.status === "completed" ? 1 : 0);
  return { state: state ?? job.status, done, total: TOTAL_STEPS, error: job.error, evaluationId: job.evaluation_id };
}

function safeMessage(e: unknown) {
  const m = e instanceof Error ? e.message : String(e);
  return m.slice(0, 300);
}

export async function startAssessment(
  store: AssessmentStore,
  input: { sessionId: string; ownerId: string; retry?: boolean; snapshotEvidence: () => Promise<unknown> },
): Promise<AssessmentStatus> {
  const existing = await store.existingEvaluationId(input.sessionId);
  if (existing) return { state: "completed", done: TOTAL_STEPS, total: TOTAL_STEPS, evaluationId: existing };
  let job = await store.getJob(input.sessionId);
  if (!job) {
    job = await store.createJob({ session_id: input.sessionId, owner_id: input.ownerId, live_evidence: await input.snapshotEvidence() });
  } else if (job.status === "failed" && input.retry) {
    // Failed steps get fresh attempts; settled steps are kept.
    const steps: Record<string, StepState> = {};
    for (const [k, v] of Object.entries(job.steps)) if (isSettled(v)) steps[k] = v;
    await store.reopen(job.id, steps);
    job = { ...job, status: "running", steps, error: null };
  }
  return toStatus(job);
}

export async function advanceAssessment(
  store: AssessmentStore,
  runner: AssessmentRunner,
  input: { sessionId: string; token: string; now?: Date },
): Promise<AssessmentStatus> {
  const existing = await store.existingEvaluationId(input.sessionId);
  if (existing) return { state: "completed", done: TOTAL_STEPS, total: TOTAL_STEPS, evaluationId: existing };
  const current = await store.getJob(input.sessionId);
  if (!current) return toStatus(null);
  if (current.status !== "running") return toStatus(current);
  const now = input.now ?? new Date();
  const job = await store.claim(current.id, input.token, now.toISOString(), new Date(now.getTime() + LEASE_MS).toISOString());
  if (!job) return { ...toStatus(current, "busy"), retryAfterMs: 5000 };

  const batch = planBatch(job);
  if (batch[0] === SYNTHESIS_STEP) {
    try {
      const evaluationId = await runner.finalize(job);
      const done = { ...job, status: "completed" as const, evaluation_id: evaluationId, error: null };
      await store.save(job.id, input.token, { status: "completed", evaluation_id: evaluationId, error: null, completed_at: now.toISOString() });
      return toStatus(done);
    } catch (e) {
      const error = safeMessage(e);
      await store.save(job.id, input.token, { status: "failed", error });
      return toStatus({ ...job, status: "failed", error });
    }
  }

  const settled = await Promise.allSettled(batch.map((step) => runner.runStep(step, job)));
  const steps = { ...job.steps };
  let fatal: string | null = null;
  let retrying = false;
  settled.forEach((r, i) => {
    const step = batch[i];
    const attempts = (steps[step]?.attempts ?? 0) + 1;
    if (r.status === "fulfilled") { steps[step] = { status: "done", attempts, result: r.value }; return; }
    const error = safeMessage(r.reason);
    if (r.reason instanceof FatalAssessmentError) { fatal = error; steps[step] = { status: "pending", attempts: attempts - 1, error }; return; }
    if (attempts >= MAX_STEP_ATTEMPTS) steps[step] = { status: "placeholder", attempts, result: runner.placeholder(step, error) };
    else { steps[step] = { status: "pending", attempts, error }; retrying = true; }
  });
  const next: AssessmentJob = fatal ? { ...job, steps, status: "failed", error: fatal } : { ...job, steps };
  await store.save(job.id, input.token, fatal ? { steps, status: "failed", error: fatal } : { steps });
  return { ...toStatus(next), ...(retrying ? { retryAfterMs: 4000 } : {}) };
}
