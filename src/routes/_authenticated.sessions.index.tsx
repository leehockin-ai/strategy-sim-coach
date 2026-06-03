import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Shell } from "@/components/Shell";
import { listMySessions } from "@/lib/simulator.functions";

export const Route = createFileRoute("/_authenticated/sessions/")({
  head: () => ({ meta: [{ title: "My sessions · Strategyzer Coach Certification" }] }),
  component: MySessionsPage,
});

const IN_PROGRESS_LABELS: Record<string, string> = {
  intake: "Intake",
  framing: "Framing",
  method: "Method",
  methodology: "Method",
  dialogue: "Dialogue",
  working_session: "Working session",
  intervention: "Intervention",
};

// Reviewer-decision statuses → "Assessment ready" (the sign-off has landed).
const DECIDED_STATUSES = new Set(["approved", "conditional", "not_approved", "retry", "escalated"]);

function MySessionsPage() {
  const fetchMine = useServerFn(listMySessions);
  const { data, isLoading } = useQuery({
    queryKey: ["my-sessions"],
    queryFn: () => fetchMine(),
  });

  return (
    <Shell>
      <section className="hairline-b">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-16 flex items-end justify-between flex-wrap gap-4">
          <div>
            <span className="chip mb-3 inline-flex">Your work</span>
            <h1 className="text-4xl md:text-5xl tracking-tight">My sessions</h1>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Resume a session in progress, read your AI rubric, or revisit Strategyzer-assessed work.
            </p>
          </div>
          <Link to="/scenarios" className="bg-ink text-paper px-4 py-2.5 text-sm rounded-sm">
            Start a new scenario →
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 md:px-10 py-10">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : !data?.sessions?.length ? (
          <div className="border border-ink p-10 text-center">
            <p className="text-sm text-muted-foreground mb-4">No sessions yet.</p>
            <Link to="/scenarios" className="bg-ink text-paper px-4 py-2 text-sm rounded-sm">
              Browse scenarios
            </Link>
          </div>
        ) : (
          <div className="border border-ink divide-y divide-ink">
            {data.sessions.map((s: any) => {
              // evaluations has a one-to-one FK on session_id, so PostgREST
              // returns it as a single object (or null), not an array.
              const ev = Array.isArray(s.evaluations) ? s.evaluations[0] : s.evaluations;
              const hasAIRubric = !!ev;
              const hasReviewerDecision = !!ev?.reviewer_decision || DECIDED_STATUSES.has(s.status);
              const isSubmittedForReview = !!s.submission_requested_at && !hasReviewerDecision;

              let stateLabel = "In progress";
              let stateColor = "";
              let nextActionText: string | null = null;
              if (hasReviewerDecision) {
                stateLabel = "Strategyzer-assessed";
                stateColor = "var(--brand-lime)";
                nextActionText = "View assessment →";
              } else if (isSubmittedForReview) {
                stateLabel = "In reviewer queue";
                stateColor = "var(--brand-cyan)";
                nextActionText = "View AI rubric →";
              } else if (hasAIRubric) {
                stateLabel = "AI rubric ready";
                stateColor = "var(--secondary)";
                nextActionText = "Read AI rubric →";
              } else {
                stateLabel = IN_PROGRESS_LABELS[s.status] ?? "In progress";
              }

              const linkLabel = nextActionText ?? "Resume →";
              const reportTo = "/sessions/$sessionId/report" as const;
              const liveTo = "/sessions/$sessionId" as const;

              return (
                <div
                  key={s.id}
                  className="grid grid-cols-12 gap-4 px-6 py-5 hover:bg-secondary transition-colors items-center"
                >
                  <span className="marker-num text-xs text-muted-foreground col-span-1">
                    {new Date(s.created_at).toLocaleDateString(undefined, { month: "short", day: "2-digit" })}
                  </span>
                  <div className="col-span-6">
                    <div className="text-sm font-medium">{s.scenarios?.title ?? "Scenario"}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{s.scenarios?.industry}</div>
                  </div>
                  <span
                    className="col-span-3 text-[10px] uppercase tracking-[0.12em] border border-ink px-2 py-1 inline-flex justify-center"
                    style={stateColor ? { backgroundColor: stateColor } : undefined}
                  >
                    {stateLabel}
                  </span>
                  <span className="col-span-2 text-right text-sm">
                    {nextActionText ? (
                      <Link to={reportTo} params={{ sessionId: s.id }}>
                        {linkLabel}
                      </Link>
                    ) : (
                      <Link to={liveTo} params={{ sessionId: s.id }}>
                        {linkLabel}
                      </Link>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </Shell>
  );
}
