import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Shell } from "@/components/Shell";
import { listMySessions, archiveMySession } from "@/lib/simulator.functions";
import { groupSessions, lastActivity } from "@/lib/session-list";
import { stripPracticeDraft } from "@/lib/coach-report-text";
import { stepFromStatus, chapterForStep } from "@/lib/chapters";

export const Route = createFileRoute("/_authenticated/sessions/")({
  head: () => ({ meta: [
    { title: "My sessions · Coach Compass" },
    { name: "description", content: "Resume coaching sessions and view AI rubrics and human certification assessments." },
    { property: "og:title", content: "My sessions · Coach Compass" },
    { property: "og:description", content: "Resume coaching sessions and view AI rubrics and human certification assessments." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: MySessionsPage,
});

const CHAPTER_IN_PROGRESS_LABELS: Record<string, string> = {
  scope: "Scoping the engagement",
  apply: "Applying the Playbook",
  progress: "Progressing the engagement",
};

// Reviewer-decision statuses → "Assessment ready" (the sign-off has landed).
const DECIDED_STATUSES = new Set(["approved", "conditional", "not_approved", "retry", "escalated"]);

function when(iso: string) {
  return iso ? new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
}

function MySessionsPage() {
  const fetchMine = useServerFn(listMySessions);
  const archive = useServerFn(archiveMySession);
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const { data, isLoading } = useQuery({
    queryKey: ["my-sessions"],
    queryFn: () => fetchMine(),
  });
  const archiving = useMutation({
    mutationFn: (id: string) => archive({ data: { sessionId: id, archived: true } }),
    onSuccess: () => { toast.success("Attempt archived."); qc.invalidateQueries({ queryKey: ["my-sessions"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const rows = (data?.sessions ?? []).map((s: any) => ({ ...s, title: stripPracticeDraft(s.scenarios?.title) || "Scenario" }));
  const canArchive = rows.some((s: any) => "archived_at" in s);
  const groups = groupSessions(rows);

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
        ) : !groups.length ? (
          <div className="border border-ink p-10 text-center">
            <p className="text-sm text-muted-foreground mb-4">No sessions yet.</p>
            <Link to="/scenarios" className="bg-ink text-paper px-4 py-2 text-sm rounded-sm">
              Browse scenarios
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {groups.map((g) => {
              const open = !!expanded[g.key];
              const shown = open ? g.attempts : g.attempts.slice(0, 1);
              const earlier = g.attempts.length - 1;
              return (
                <section key={g.key} aria-label={g.title}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                    <h2 className="text-xl">{g.title}</h2>
                    <span className="text-xs text-muted-foreground">{g.attempts.length} attempt{g.attempts.length === 1 ? "" : "s"} · {g.attempts[0].scenarios?.industry}</span>
                  </div>
                  <div className="border border-ink divide-y divide-ink">
            {shown.map((s: any) => {
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
                stateLabel = CHAPTER_IN_PROGRESS_LABELS[chapterForStep(stepFromStatus(s.status))] ?? "In progress";
              }
              const linkLabel = nextActionText ?? "Resume →";
              const archivable = canArchive && !s.submission_requested_at && !hasReviewerDecision;
              return (
                <div key={s.id} className="flex flex-wrap gap-x-4 gap-y-2 px-5 py-4 hover:bg-secondary transition-colors items-center">
                  <span
                    className="text-[10px] uppercase tracking-[0.12em] border border-ink px-2 py-1"
                    style={stateColor ? { backgroundColor: stateColor } : undefined}
                  >
                    {stateLabel}
                  </span>
                  <span className="text-xs text-muted-foreground flex-1 min-w-[10rem]">Last activity {when(lastActivity(s))}</span>
                  {archivable && <button type="button" className="text-xs underline text-muted-foreground" disabled={archiving.isPending} onClick={() => archiving.mutate(s.id)}>Archive</button>}
                  <span className="text-sm">
                    {nextActionText ? (
                      <Link to="/sessions/$sessionId/report" params={{ sessionId: s.id }}>{linkLabel}</Link>
                    ) : (
                      <Link to="/sessions/$sessionId" params={{ sessionId: s.id }}>{linkLabel}</Link>
                    )}
                  </span>
                </div>
              );
            })}
                  </div>
                  {earlier > 0 && (
                    <button type="button" aria-expanded={open} className="mt-2 text-xs underline" onClick={() => setExpanded({ ...expanded, [g.key]: !open })}>
                      {open ? "Hide earlier attempts" : `Show ${earlier} earlier attempt${earlier === 1 ? "" : "s"}`}
                    </button>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </section>
    </Shell>
  );
}
