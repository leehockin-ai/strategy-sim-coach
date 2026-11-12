import { Link } from "@tanstack/react-router";
import { useAssessmentJob } from "@/hooks/use-assessment-job";

/** Report empty state: generate, show progress, resume after refresh, retry after failure. */
export function AssessmentGenerator({ sessionId, canGenerate }: { sessionId: string; canGenerate: boolean }) {
  const { status, isLoading, starting, startError, generate } = useAssessmentJob(sessionId, { autoResume: true });
  const state = status?.state ?? "not_started";
  const done = status && "done" in status ? status.done ?? 0 : 0;
  const total = status && "total" in status ? status.total ?? 12 : 12;
  const pct = Math.round((done / Math.max(1, total)) * 100);
  const working = starting || state === "running" || state === "busy";
  const error = startError ?? (state === "failed" || state === "transport_error" ? (status as any)?.error : null);

  return (
    <div className="mx-auto max-w-[900px] px-6 py-16">
      <span className="chip mb-3 inline-flex">Your assessment</span>
      {state === "completed" ? (
        <>
          <h1 className="text-3xl mb-3">Your assessment is ready</h1>
          <Link to="/sessions/$sessionId/report" params={{ sessionId }} className="underline">Open your signed-in report</Link>
        </>
      ) : working ? (
        <>
          <h1 className="text-3xl mb-3">Generating your assessment…</h1>
          <p className="text-muted-foreground mb-6">
            Nine rubric sections and two skills reviews are scored separately, then combined. This usually takes one to three
            minutes. You can leave this page — progress is saved and picks up when you come back.
          </p>
          <div className="border border-ink h-3 w-full max-w-md" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Assessment progress">
            <div className="h-full bg-ink transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground mt-2">
            {done} / {total} steps complete{state === "busy" ? " · continuing in another window" : ""}
          </div>
        </>
      ) : (
        <>
          <h1 className="text-3xl mb-3">{state === "failed" || error ? "Assessment paused" : "Not generated yet"}</h1>
          {error ? (
            <p className="text-sm border border-ink p-3 mb-6" style={{ backgroundColor: "var(--secondary)" }} role="alert">
              {error} {done > 0 && `Completed steps (${done} / ${total}) are kept; retrying continues from there.`}
            </p>
          ) : (
            <p className="text-muted-foreground mb-6">
              {canGenerate
                ? "You've finished Chapter 3 · Advance. Generate your AI assessment to see your rubric and developmental feedback."
                : "Finish the three chapters — Scope, Facilitate and Advance — then generate your assessment here or at the end of Chapter 3."}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            {(canGenerate || state === "failed") && (
              <button
                onClick={() => generate(state === "failed")}
                disabled={isLoading || starting}
                className="bg-ink text-paper px-5 py-2 text-sm rounded-sm disabled:opacity-50"
              >
                {state === "failed" || error ? "Retry assessment" : "Generate my assessment"}
              </button>
            )}
            <Link to="/sessions/$sessionId" params={{ sessionId }} className="border border-ink px-4 py-2 text-sm rounded-sm">
              Return to session
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
