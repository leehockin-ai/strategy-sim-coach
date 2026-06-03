import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shell } from "@/components/Shell";
import { getSession, requestSubmissionForAssessment } from "@/lib/simulator.functions";
import { SECTION_RUBRIC } from "@/lib/evaluation.functions";
import { toast } from "sonner";
import React from "react";

export const Route = createFileRoute("/_authenticated/sessions/$sessionId_/report")({
  head: () => ({ meta: [{ title: "Your assessment · Strategyzer Coach Certification" }] }),
  component: AssessmentPage,
});

const VERDICT_COLOR: Record<string, string> = {
  exemplary: "var(--brand-lime)",
  strong: "var(--brand-lime)",
  competent: "var(--brand-cyan)",
  developing: "var(--brand-yellow, #f5d547)",
  insufficient: "var(--brand-red)",
};

const REVIEWER_DECISION_COLOR: Record<string, string> = {
  approved: "var(--brand-lime)",
  conditional_approval: "var(--brand-cyan)",
  retry_required: "var(--brand-yellow, #f5d547)",
  not_approved: "var(--brand-red)",
  escalate: "var(--brand-blue)",
};
const REVIEWER_DECISION_LABEL: Record<string, string> = {
  approved: "Strategyzer-certified",
  conditional_approval: "Conditional certification",
  retry_required: "Retry recommended",
  not_approved: "Not yet certified",
  escalate: "Escalated to senior reviewer",
};
const REVIEWER_DECISION_SUBTITLE: Record<string, string> = {
  approved: "You've demonstrated the coaching judgment and methodology rigor required for Strategyzer certification on this scenario.",
  conditional_approval: "You're close. A focused round of practice on the gaps below will get you to certification.",
  retry_required: "There are specific gaps a retry would address. Read the feedback below as a developmental path forward.",
  not_approved: "This submission did not meet the certification bar. The feedback below is detailed and developmental — it's the path forward.",
  escalate: "Your submission has been escalated to a senior Strategyzer reviewer. You'll see their decision and notes here when it lands.",
};

function AssessmentPage() {
  const { sessionId } = Route.useParams();
  const fetchSession = useServerFn(getSession);
  const requestSubmission = useServerFn(requestSubmissionForAssessment);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["session", sessionId],
    queryFn: () => fetchSession({ data: { sessionId } }),
  });

  const submitMut = useMutation({
    mutationFn: () => requestSubmission({ data: { sessionId } } as any),
    onSuccess: (res: any) => {
      if (res?.alreadySubmitted) {
        toast.message("Already submitted", { description: "This work is already in the Strategyzer reviewer queue." });
      } else {
        toast.success("Submitted for Strategyzer assessment", {
          description: "A reviewer will personally evaluate your work. You'll be notified when the decision is ready.",
        });
      }
      qc.invalidateQueries({ queryKey: ["session", sessionId] });
      qc.invalidateQueries({ queryKey: ["my-sessions"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not submit for assessment"),
  });

  if (isLoading || !data) {
    return (
      <Shell>
        <div className="p-10 text-sm text-muted-foreground">Loading your assessment…</div>
      </Shell>
    );
  }

  const session: any = data.session;
  const evaluation: any = data.evaluation;
  const scenario = session.scenarios;

  if (!evaluation) {
    return (
      <Shell>
        <div className="mx-auto max-w-[900px] px-6 py-16">
          <span className="chip mb-3 inline-flex">Your assessment</span>
          <h1 className="text-3xl mb-3">Not generated yet</h1>
          <p className="text-muted-foreground mb-6">
            Complete the intervention step in your session to generate the AI rubric.
          </p>
          <Link to="/sessions/$sessionId" params={{ sessionId }} className="bg-ink text-paper px-4 py-2 text-sm rounded-sm">
            Return to session
          </Link>
        </div>
      </Shell>
    );
  }

  const raw = evaluation.raw_response ?? {};
  const sections: Record<string, any> = raw.sections ?? evaluation.scores?.sections ?? {};
  const hasReviewerDecision = !!evaluation.reviewer_decision;
  const submissionRequestedAt: string | null = session.submission_requested_at ?? null;
  const isSubmittedForReview = !!submissionRequestedAt && !hasReviewerDecision;
  const isPracticeOnly = !submissionRequestedAt && !hasReviewerDecision;

  const reviewerDecision: string = evaluation.reviewer_decision ?? "";
  const reviewerName: string = evaluation.reviewer_name ?? "";
  const reviewerNotes: string = evaluation.reviewer_notes ?? "";
  const coachFeedback: string = evaluation.coach_feedback ?? raw.coach_feedback_draft ?? "";
  const reviewedAt: string | null = evaluation.reviewed_at ?? null;

  return (
    <Shell>
      {/* HERO */}
      <section className="hairline-b">
        <div className="mx-auto max-w-[1200px] px-6 md:px-10 py-14">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="chip">Your assessment</span>
            <span className="chip">{scenario.title}</span>
            {hasReviewerDecision && (
              <span className="chip" style={{ backgroundColor: "var(--brand-lime)" }}>Strategyzer-reviewed</span>
            )}
            {isSubmittedForReview && (
              <span className="chip" style={{ backgroundColor: "var(--brand-cyan)" }}>In reviewer queue</span>
            )}
            {isPracticeOnly && (
              <span className="chip" style={{ backgroundColor: "var(--secondary)" }}>AI rubric — practice</span>
            )}
          </div>

          {hasReviewerDecision ? (
            <>
              <div className="grid md:grid-cols-12 gap-10 items-end">
                <div className="md:col-span-8">
                  <h1 className="text-4xl md:text-5xl tracking-tight mb-3">{session.candidate_name}</h1>
                  <p className="text-muted-foreground">{session.candidate_email}</p>
                  <p className="mt-6 text-lg leading-relaxed max-w-2xl">
                    {REVIEWER_DECISION_SUBTITLE[reviewerDecision] ?? "Your assessment has been reviewed."}
                  </p>
                </div>
                <div className="md:col-span-4">
                  <div className="border border-ink p-6" style={{ backgroundColor: REVIEWER_DECISION_COLOR[reviewerDecision] ?? "var(--secondary)" }}>
                    <div className="text-xs uppercase tracking-[0.14em] mb-2">Strategyzer reviewer decision</div>
                    <div className="text-2xl font-medium">{REVIEWER_DECISION_LABEL[reviewerDecision] ?? reviewerDecision}</div>
                    {reviewerName && (
                      <div className="text-[11px] uppercase tracking-[0.12em] mt-4 opacity-80">
                        Reviewed by {reviewerName}
                        {reviewedAt && <> · {new Date(reviewedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</>}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {reviewerNotes && (
                <div className="mt-8 border border-ink p-6" style={{ backgroundColor: "var(--secondary)" }}>
                  <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-3">From your Strategyzer reviewer</div>
                  <p className="text-base leading-relaxed whitespace-pre-wrap">{reviewerNotes}</p>
                  {reviewerName && <p className="mt-4 text-xs text-muted-foreground">— {reviewerName}</p>}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="grid md:grid-cols-12 gap-10 items-end">
                <div className="md:col-span-8">
                  <h1 className="text-4xl md:text-5xl tracking-tight mb-3">{session.candidate_name}</h1>
                  <p className="text-muted-foreground">{session.candidate_email}</p>
                  <p className="mt-6 text-lg leading-relaxed max-w-2xl">{evaluation.overall_summary}</p>
                </div>
                <div className="md:col-span-4">
                  <div className="border border-ink p-6" style={{ backgroundColor: "var(--secondary)" }}>
                    <div className="text-xs uppercase tracking-[0.14em] mb-2">AI rubric</div>
                    <div className="text-2xl font-medium">Drafted</div>
                    <p className="text-xs mt-3 leading-relaxed opacity-80">
                      {isSubmittedForReview
                        ? "In the Strategyzer reviewer queue. A reviewer will personally evaluate your work."
                        : "A development tool. Read it freely. To convert this into a Strategyzer certification assessment, submit it below."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 border border-ink p-5" style={{ backgroundColor: "var(--brand-yellow, #f5d547)" }}>
                <div className="text-[10px] uppercase tracking-[0.14em] mb-2 font-medium">Important</div>
                <p className="text-sm leading-relaxed">
                  {isSubmittedForReview
                    ? "This is your AI-generated rubric. It's been submitted to the Strategyzer reviewer queue. Until a reviewer signs off, this is not a Strategyzer certification assessment."
                    : "This is your AI-generated rubric — a development tool to help you reflect on your work. It is not a Strategyzer certification assessment. To pursue certification on this scenario, submit your work for Strategyzer reviewer assessment below."}
                </p>
              </div>
            </>
          )}
        </div>
      </section>

      {/* COACH-FACING FEEDBACK */}
      {coachFeedback && (
        <section className="mx-auto max-w-[1200px] px-6 md:px-10 py-12 hairline-b">
          <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-2">
            {hasReviewerDecision ? "Developmental feedback" : "Draft developmental feedback (AI)"}
          </div>
          <h2 className="text-2xl mb-6">What this means for your practice</h2>
          <div className="prose prose-sm max-w-3xl">
            <MarkdownLight source={coachFeedback} />
          </div>
        </section>
      )}

      {/* PER-SECTION RUBRIC */}
      <section className="mx-auto max-w-[1200px] px-6 md:px-10 py-12">
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-2xl">Section-by-section rubric</h2>
          <span className="text-xs text-muted-foreground">Each section is scored independently.</span>
        </div>
        <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
          The evidence column quotes your actual work. Strengths and gaps are specific — use them as a checklist for what to repeat and what to change next time.
        </p>

        <div className="space-y-4">
          {SECTION_RUBRIC.map((sec) => {
            const sx = sections[sec.key] ?? evaluation.scores?.[sec.key];
            if (!sx) return null;
            const verdict = sx.verdict ?? null;
            return (
              <article key={sec.key} className="border border-ink bg-paper">
                <header
                  className="hairline-b p-5 flex flex-wrap items-center justify-between gap-4"
                  style={{ backgroundColor: "var(--secondary)" }}
                >
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{sec.step}</div>
                    <h3 className="text-lg mt-0.5">{sec.label}</h3>
                    <p className="text-xs text-muted-foreground mt-1 max-w-2xl">{sec.focus}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    {verdict && (
                      <span
                        className="text-[10px] uppercase tracking-[0.12em] border border-ink px-2 py-0.5"
                        style={{ backgroundColor: VERDICT_COLOR[verdict] ?? "transparent" }}
                      >
                        {verdict}
                      </span>
                    )}
                    <ScoreBar score={sx.score ?? 0} />
                  </div>
                </header>
                <div className="p-5 grid md:grid-cols-3 gap-6">
                  <div className="md:col-span-1">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-2">Evidence</div>
                    <p className="text-sm leading-relaxed">{sx.evidence ?? "—"}</p>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.14em] mb-2" style={{ color: "var(--brand-green, #1f7a4a)" }}>Strengths</div>
                    <ul className="space-y-1.5">
                      {(sx.strengths ?? []).map((s: string, i: number) => (
                        <li key={i} className="text-sm flex gap-2"><span className="text-muted-foreground">+</span><span>{s}</span></li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.14em] mb-2" style={{ color: "var(--brand-red)" }}>Gaps</div>
                    <ul className="space-y-1.5">
                      {(sx.gaps ?? []).map((s: string, i: number) => (
                        <li key={i} className="text-sm flex gap-2"><span className="text-muted-foreground">−</span><span>{s}</span></li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* SOFT SKILLS */}
      {Array.isArray(evaluation.soft_skills) && evaluation.soft_skills.length > 0 && (
        <section className="mx-auto max-w-[1200px] px-6 md:px-10 py-12 hairline-t">
          <h2 className="text-2xl mb-6">Soft skills · facilitation behaviour</h2>
          <SkillsGrid skills={evaluation.soft_skills} />
        </section>
      )}

      {/* METHODOLOGY SKILLS */}
      {Array.isArray(evaluation.methodology_skills) && evaluation.methodology_skills.length > 0 && (
        <section className="mx-auto max-w-[1200px] px-6 md:px-10 py-12 hairline-t">
          <h2 className="text-2xl mb-6">Strategyzer methodology · application quality</h2>
          <SkillsGrid skills={evaluation.methodology_skills} />
        </section>
      )}

      {/* CROSS-CUTTING */}
      <section className="mx-auto max-w-[1200px] px-6 md:px-10 py-12 hairline-t">
        <h2 className="text-2xl mb-6">The pattern across your work</h2>
        <div className="grid md:grid-cols-2 gap-px bg-ink border border-ink">
          <div className="bg-paper p-6">
            <h3 className="chip mb-4 inline-flex" style={{ backgroundColor: "var(--brand-lime)" }}>What you did well</h3>
            <ul className="space-y-2">
              {(evaluation.strengths ?? []).map((s: string, i: number) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="marker-num text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-paper p-6">
            <h3 className="chip mb-4 inline-flex" style={{ backgroundColor: "var(--brand-red)", color: "var(--paper)", borderColor: "var(--brand-red)" }}>Where to develop</h3>
            <ul className="space-y-2">
              {(evaluation.gaps ?? []).map((s: string, i: number) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="marker-num text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* NEXT STEPS / SUBMISSION CTA */}
      <section className="mx-auto max-w-[1200px] px-6 md:px-10 py-12 hairline-t">
        {isPracticeOnly && (
          <div className="border border-ink p-8 mb-8" style={{ backgroundColor: "var(--secondary)" }}>
            <div className="grid md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-8">
                <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-2">Ready for certification?</div>
                <h3 className="text-2xl mb-3">Submit this work for Strategyzer assessment</h3>
                <p className="text-sm leading-relaxed max-w-2xl text-muted-foreground">
                  A Strategyzer reviewer will personally evaluate your work against the certification rubric. You'll be notified when the decision is ready. Until then, this rubric remains a development tool — not a certification.
                </p>
              </div>
              <div className="md:col-span-4 md:text-right">
                <button
                  onClick={() => submitMut.mutate()}
                  disabled={submitMut.isPending}
                  className="bg-ink text-paper px-5 py-3 text-sm rounded-sm disabled:opacity-50"
                >
                  {submitMut.isPending ? "Submitting…" : "Submit for Strategyzer assessment →"}
                </button>
              </div>
            </div>
          </div>
        )}

        {isSubmittedForReview && (
          <div className="border border-ink p-6 mb-8" style={{ backgroundColor: "var(--brand-cyan)" }}>
            <div className="text-[10px] uppercase tracking-[0.14em] mb-2 font-medium">In the Strategyzer reviewer queue</div>
            <p className="text-sm leading-relaxed">
              Submitted {submissionRequestedAt && new Date(submissionRequestedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}. A Strategyzer reviewer will personally evaluate your work. The decision and notes will appear here when ready.
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Link to="/scenarios" className="border border-ink px-4 py-2 text-sm">Try another scenario</Link>
          <Link to="/sessions" className="bg-ink text-paper px-4 py-2 text-sm rounded-sm">Back to my sessions</Link>
        </div>
      </section>
    </Shell>
  );
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className="w-5 h-5 border border-ink"
          style={{ backgroundColor: n <= score ? "var(--brand-blue)" : "transparent" }}
        />
      ))}
      <span className="marker-num text-sm ml-2">{score}/5</span>
    </div>
  );
}

function SkillsGrid({ skills }: { skills: any[] }) {
  const ratingColor: Record<string, string> = {
    strength: "var(--brand-lime)",
    mixed: "var(--brand-yellow, #f5d547)",
    concern: "var(--brand-red)",
  };
  const ratingLabel: Record<string, string> = {
    strength: "Strength",
    mixed: "Mixed",
    concern: "Concern",
  };
  return (
    <div className="grid md:grid-cols-2 gap-px bg-ink border border-ink">
      {skills.map((sk: any, i: number) => (
        <div key={i} className="bg-paper p-5">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h4 className="text-base font-medium">{sk.label ?? sk.key}</h4>
            <span
              className="text-[10px] uppercase tracking-[0.12em] border border-ink px-2 py-0.5"
              style={{ backgroundColor: ratingColor[sk.rating] ?? "transparent" }}
            >
              {ratingLabel[sk.rating] ?? sk.rating}
            </span>
          </div>
          {sk.explanation && <p className="text-sm leading-relaxed">{sk.explanation}</p>}
          {sk.evidence && (
            <p className="text-xs text-muted-foreground mt-2 italic leading-relaxed">"{sk.evidence}"</p>
          )}
        </div>
      ))}
    </div>
  );
}

function MarkdownLight({ source }: { source: string }) {
  const blocks = source.split(/\n{2,}/);
  return (
    <>
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (!trimmed) return null;
        if (trimmed.startsWith("## ")) return <h3 key={i} className="text-lg font-medium mt-6 mb-2">{renderInline(trimmed.slice(3))}</h3>;
        if (trimmed.startsWith("# ")) return <h2 key={i} className="text-xl font-medium mt-6 mb-2">{renderInline(trimmed.slice(2))}</h2>;
        const lines = trimmed.split("\n");
        const isList = lines.every((l) => /^[\*\-]\s/.test(l));
        if (isList) {
          return (
            <ul key={i} className="list-disc pl-5 space-y-1 my-3">
              {lines.map((l, j) => (
                <li key={j} className="text-sm leading-relaxed">{renderInline(l.replace(/^[\*\-]\s/, ""))}</li>
              ))}
            </ul>
          );
        }
        return <p key={i} className="text-sm leading-relaxed my-3">{renderInline(trimmed)}</p>;
      })}
    </>
  );
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
    return <span key={i}>{p}</span>;
  });
}
