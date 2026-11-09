import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { advanceAssessmentJob, getAssessmentStatus, startAssessmentJob } from "@/lib/evaluation.functions";
import { driveAssessment, type AssessmentStatus } from "@/lib/assessment-job";

export type AssessmentUiState = AssessmentStatus | { state: "transport_error"; error: string; done?: number; total?: number };

/** Resumable assessment generation: starts once, drives bounded batches, resumes after refresh. */
export function useAssessmentJob(sessionId: string, opts: { autoResume?: boolean } = {}) {
  const qc = useQueryClient();
  const start = useServerFn(startAssessmentJob);
  const advance = useServerFn(advanceAssessmentJob);
  const status = useServerFn(getAssessmentStatus);
  const driving = useRef(false);
  const cancelled = useRef(false);
  const [live, setLive] = useState<AssessmentUiState | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const statusQuery = useQuery({
    queryKey: ["assessment-status", sessionId],
    queryFn: () => status({ data: { sessionId } }),
  });

  const finish = useCallback((s: AssessmentUiState) => {
    setLive(s);
    if (s.state === "completed") {
      qc.invalidateQueries({ queryKey: ["session", sessionId] });
      qc.invalidateQueries({ queryKey: ["my-sessions"] });
    }
    qc.invalidateQueries({ queryKey: ["assessment-status", sessionId] });
  }, [qc, sessionId]);

  const drive = useCallback(async () => {
    if (driving.current) return;
    driving.current = true;
    try {
      const result = await driveAssessment(() => advance({ data: { sessionId } }) as Promise<AssessmentStatus>, {
        onStatus: setLive,
        isCancelled: () => cancelled.current,
      });
      if (!cancelled.current) finish(result as AssessmentUiState);
    } finally {
      driving.current = false;
    }
  }, [advance, finish, sessionId]);

  const generate = useCallback(async (retry = false) => {
    if (starting || driving.current) return;
    setStarting(true);
    setStartError(null);
    try {
      const s = (await start({ data: { sessionId, retry } })) as AssessmentStatus;
      setLive(s);
      if (s.state === "completed") finish(s);
      else void drive();
    } catch (e) {
      setStartError(e instanceof Error ? e.message : "Could not start your assessment");
    } finally {
      setStarting(false);
    }
  }, [drive, finish, sessionId, start, starting]);

  // Resume an in-progress job after refresh / navigation (the job was user-started earlier).
  useEffect(() => {
    if (!opts.autoResume) return;
    if (statusQuery.data?.state === "running" && !driving.current) void drive();
  }, [opts.autoResume, statusQuery.data?.state, drive]);

  useEffect(() => () => { cancelled.current = true; }, []);

  const current: AssessmentUiState | null = live ?? (statusQuery.data as AssessmentStatus | undefined) ?? null;
  return { status: current, isLoading: statusQuery.isLoading, starting, startError, generate, isDriving: driving.current };
}
