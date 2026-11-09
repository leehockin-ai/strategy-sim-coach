import { describe, expect, it, vi } from "vitest";
import {
  advanceAssessment, driveAssessment, startAssessment, FatalAssessmentError, SECTION_KEYS, TOTAL_STEPS,
  type AssessmentJob, type AssessmentRunner, type AssessmentStore,
} from "./assessment-job";

vi.mock("@tanstack/react-start", () => ({ createServerFn: () => { const c: any = { middleware: () => c, inputValidator: () => c, handler: (f: unknown) => f }; return c; } }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));

function memoryStore(opts: { existing?: string | null } = {}) {
  let job: (AssessmentJob & { lease_token: string | null }) | null = null;
  let evaluationId = opts.existing ?? null;
  const creates = { n: 0 };
  const store: AssessmentStore & { job: () => typeof job; setEvaluation: (id: string) => void; creates: typeof creates } = {
    job: () => job,
    creates,
    setEvaluation: (id) => { evaluationId = id; },
    async existingEvaluationId() { return evaluationId; },
    async getJob() { return job ? structuredClone(job) : null; },
    async createJob(row) {
      creates.n += 1;
      if (!job) job = { id: "job", ...row, status: "running", steps: {}, error: null, evaluation_id: null, lease_until: null, lease_token: null, run_count: 1 };
      return structuredClone(job);
    },
    async claim(_id, token, nowIso, until) {
      if (!job || job.status !== "running") return null;
      if (job.lease_until && job.lease_until >= nowIso) return null;
      job.lease_token = token; job.lease_until = until;
      return structuredClone(job);
    },
    async save(_id, token, patch) {
      if (!job || job.lease_token !== token) return false;
      const { completed_at: _c, ...rest } = patch;
      job = { ...job, ...rest, lease_token: null, lease_until: null };
      return true;
    },
    async reopen(_id, steps) { if (job && job.status === "failed") job = { ...job, status: "running", steps, error: null, run_count: job.run_count + 1 }; },
  };
  return store;
}

function runner(over: Partial<AssessmentRunner> = {}): AssessmentRunner & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    runStep: async (step) => { calls.push(step); return { ok: step }; },
    placeholder: (step, error) => ({ placeholder: step, error }),
    finalize: async () => { calls.push("synthesis"); return "eval-1"; },
    ...over,
  };
}

const start = (store: AssessmentStore, retry = false) =>
  startAssessment(store, { sessionId: "s", ownerId: "o", retry, snapshotEvidence: async () => ({ version: "public_live_v1", runs: [] }) });
let n = 0;
const adv = (store: AssessmentStore, r: AssessmentRunner, now?: Date) => advanceAssessment(store, r, { sessionId: "s", token: `t${n++}`, now });

describe("resumable assessment job", () => {
  it("covers exactly the nine rubric sections plus two skills and synthesis", async () => {
    const actual = await vi.importActual<any>("./evaluation.functions");
    expect([...SECTION_KEYS].sort()).toEqual(actual.SECTION_RUBRIC.map((s: any) => s.key).sort());
    expect(TOTAL_STEPS).toBe(12);
  });

  it("runs in bounded batches of at most four AI steps, then synthesis once", async () => {
    const store = memoryStore(); const r = runner();
    await start(store);
    const sizes: number[] = [];
    for (let i = 0; i < 10; i++) {
      const before = r.calls.length; const s = await adv(store, r); sizes.push(r.calls.length - before);
      if (s.state === "completed") { expect(s.evaluationId).toBe("eval-1"); break; }
    }
    expect(sizes).toEqual([4, 4, 3, 1]);
    expect(r.calls.filter((c) => c === "synthesis")).toHaveLength(1);
  });

  it("double click / concurrent start creates one job and concurrent advance runs one batch", async () => {
    const store = memoryStore(); let release!: () => void;
    const gate = new Promise<void>((res) => { release = res; });
    const r = runner({ runStep: async (step) => { await gate; return step; } });
    await Promise.all([start(store), start(store)]);
    expect(store.job()?.id).toBe("job");
    const first = adv(store, r); const second = await adv(store, r);
    expect(second.state).toBe("busy");
    release(); await first;
    expect(Object.keys(store.job()!.steps)).toHaveLength(4);
  });

  it("refresh mid-run resumes from saved progress without redoing settled steps", async () => {
    const store = memoryStore(); const r1 = runner();
    await start(store); await adv(store, r1);
    const r2 = runner(); // new page load / new tab
    expect((await start(store)).done).toBe(4);
    await adv(store, r2);
    expect(r2.calls.some((c) => r1.calls.includes(c))).toBe(false);
  });

  it("an abandoned lease (closed tab) expires and another caller can continue", async () => {
    const store = memoryStore(); await start(store);
    await store.claim("job", "dead-tab", new Date("2026-11-09T10:00:00Z").toISOString(), new Date("2026-11-09T10:02:30Z").toISOString());
    expect((await adv(store, runner(), new Date("2026-11-09T10:01:00Z"))).state).toBe("busy");
    expect((await adv(store, runner(), new Date("2026-11-09T10:03:00Z"))).done).toBe(4);
  });

  it("a failing section is retried, then recorded as a flagged placeholder (former behaviour)", async () => {
    const store = memoryStore(); await start(store);
    const r = runner({ runStep: async (step) => { if (step === "section:situation_framing") throw new Error("boom"); return step; } });
    const s1 = await adv(store, r);
    expect(s1.retryAfterMs).toBeGreaterThan(0);
    expect(store.job()!.steps["section:situation_framing"]).toMatchObject({ status: "pending", attempts: 1 });
    await adv(store, r);
    expect(store.job()!.steps["section:situation_framing"]).toMatchObject({ status: "placeholder", attempts: 2 });
  });

  it("credit/permission errors stop the job; explicit retry keeps settled steps", async () => {
    const store = memoryStore(); await start(store);
    let fail = true;
    const r = runner({ runStep: async (step) => { if (fail && step === "section:coaching_strategy") throw new FatalAssessmentError("AI credits exhausted."); return step; } });
    const s = await adv(store, r);
    expect(s.state).toBe("failed"); expect(s.error).toContain("credits");
    expect((await adv(store, r)).state).toBe("failed"); // no automatic replay
    fail = false;
    const restarted = await start(store, true);
    expect(restarted.state).toBe("running"); expect(restarted.done).toBe(3);
    expect(store.job()!.run_count).toBe(2);
  });

  it("synthesis failure marks failed; retry continues to completion", async () => {
    const store = memoryStore(); await start(store);
    let fail = true;
    const r = runner({ finalize: async () => { if (fail) throw new Error("Synthesis returned non-JSON"); return "eval-2"; } });
    for (let i = 0; i < 4; i++) await adv(store, r);
    expect(store.job()!.status).toBe("failed");
    fail = false; await start(store, true);
    expect((await adv(store, r)).state).toBe("completed");
  });

  it("an existing (old or reviewed) assessment is returned without creating a job or calling AI", async () => {
    const store = memoryStore({ existing: "reviewed-eval" }); const r = runner();
    expect(await start(store)).toMatchObject({ state: "completed", evaluationId: "reviewed-eval" });
    expect(await adv(store, r)).toMatchObject({ state: "completed", evaluationId: "reviewed-eval" });
    expect(store.creates.n).toBe(0); expect(r.calls).toEqual([]);
  });

  it("an assessment saved concurrently elsewhere stops further AI work", async () => {
    const store = memoryStore(); const r = runner(); await start(store); await adv(store, r);
    store.setEvaluation("other");
    expect((await adv(store, r)).evaluationId).toBe("other");
    expect(r.calls).toHaveLength(4);
  });
});

describe("client driver", () => {
  const sleep = async () => {};
  it("drives until completed", async () => {
    const seq = [{ state: "running", done: 4, total: 12 }, { state: "running", done: 8, total: 12 }, { state: "completed", done: 12, total: 12 }] as const;
    let i = 0;
    expect((await driveAssessment(async () => seq[i++] as any, { sleep })).state).toBe("completed");
    expect(i).toBe(3);
  });
  it("stops on failure without replaying", async () => {
    const advance = vi.fn(async () => ({ state: "failed", done: 3, total: 12, error: "AI credits exhausted." }) as any);
    expect((await driveAssessment(advance, { sleep })).state).toBe("failed");
    expect(advance).toHaveBeenCalledTimes(1);
  });
  it("retries transport errors a bounded number of times then reports them", async () => {
    const advance = vi.fn(async () => { throw new Error("network"); });
    expect(await driveAssessment(advance, { sleep, maxTransportErrors: 3 })).toEqual({ state: "transport_error", error: "network" });
    expect(advance).toHaveBeenCalledTimes(3);
  });
  it("respects the call budget", async () => {
    const advance = vi.fn(async () => ({ state: "busy", done: 0, total: 12, retryAfterMs: 1 }) as any);
    await driveAssessment(advance, { sleep, maxCalls: 5 });
    expect(advance).toHaveBeenCalledTimes(5);
  });
});
