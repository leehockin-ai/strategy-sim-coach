import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Shell } from "@/components/Shell";
import { getSession } from "@/lib/simulator.functions";
import { SECTION_RUBRIC } from "@/lib/evaluation.functions";

export const Route = createFileRoute("/_authenticated/sessions/$sessionId/report")({
  head: () => ({ meta: [{ title: "Evaluation report · Strategyzer Coach Certification" }] }),
  component: ReportPage,
});

const VERDICT_COLOR: Record<string, string> = {
  exemplary: "var(--brand-lime)",
  strong: "var(--brand-lime)",
  competent: "var(--brand-cyan)",
  developing: "var(--brand-yellow, #f5d547)",
  insufficient: "var(--brand-red)",
};

const REC_COLOR: Record<string, string> = {
  certify: "var(--brand-lime)",
  conditional: "var(--brand-cyan)",
  not_yet: "var(--brand-red)",
};
const REC_LABEL: Record<string, string> = {
  certify: "Recommend certify",
  conditional: "Conditional pass",
  not_yet: "Not yet",
};

function ReportPage() {
  const { sessionId } = Route.useParams();
  const fetchSession = useServerFn(getSession);
  const { data, isLoading } = useQuery({
    queryKey: ["session", sessionId],
    queryFn: () => fetchSession({ data: { sessionId } }),
  });

  if (isLoading || !data) {
    return <Shell><div className="p-10 text-sm text-muted-foreground">Loading evaluation…</div></Shell>;
  }

  const session: any = data.session;
  const evaluation: any = data.evaluation;
  const scenario = session.scenarios;

  if (!evaluation) {
    return (
      <Shell>
        <div className="mx-auto max-w-[900px] px-6 py-16">
          <h1 className="text-3xl mb-3">No evaluation yet</h1>
          <p className="text-muted-foreground mb-6">Complete the intervention step to generate an evaluation.</p>
          <Link to="/sessions/$sessionId" params={{ sessionId }} className="bg-ink text-paper px-4 py-2 text-sm rounded-sm">Return to session</Link>
        </div>
      </Shell>
    );
  }

  const raw = evaluation.raw_response ?? {};
  const sections: Record<string, any> = raw.sections ?? evaluation.scores?.sections ?? {};

  return (
    <Shell>
      {/* HERO */}
      <section className="hairline-b">
        <div className="mx-auto max-w-[1200px] px-6 md:px-10 py-14">
          <div className="flex items-center gap-3 mb-4">
            <span className="chip">Evaluation report</span>
            <span className="chip">{scenario.title}</span>
          </div>
          <div className="grid md:grid-cols-12 gap-10 items-end">
            <div className="md:col-span-8">
              <h1 className="text-4xl md:text-5xl tracking-tight mb-3">{session.candidate_name}</h1>
              <p className="text-muted-foreground">{session.candidate_email}</p>
              <p className="mt-6 text-lg leading-relaxed max-w-2xl">{evaluation.overall_summary}</p>
            </div>
            <div className="md:col-span-4">
              <div className="border border-ink p-6" style={{ backgroundColor: REC_COLOR[evaluation.recommendation] }}>
                <div className="text-xs uppercase tracking-[0.14em] mb-2">AI recommendation</div>
                <div className="text-2xl font-medium">{REC_LABEL[evaluation.recommendation]}</div>
                {raw.recommendation_rationale && (
                  <div className="text-xs mt-3 leading-relaxed opacity-90">{raw.recommendation_rationale}</div>
                )}
                <div className="text-[10px] uppercase tracking-[0.12em] mt-4 opacity-70">Pending human reviewer sign-off</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PER-SECTION RUBRIC */}
      <section className="mx-auto max-w-[1200px] px-6 md:px-10 py-14">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="text-2xl">Section-by-section rubric</h2>
          <span className="text-xs text-muted-foreground">Each checkpoint is scored against its own focus.</span>
        </div>

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

      {/* FINAL ASSESSMENT */}
      <section className="mx-auto max-w-[1200px] px-6 md:px-10 py-14 hairline-t">
        <h2 className="text-2xl mb-6">Final assessment</h2>
        <div className="grid md:grid-cols-2 gap-px bg-ink border border-ink">
          <div className="bg-paper p-6">
            <h3 className="chip mb-4 inline-flex" style={{ backgroundColor: "var(--brand-lime)" }}>Cross-cutting strengths</h3>
            <ul className="space-y-2">
              {(evaluation.strengths ?? []).map((s: string, i: number) => (
                <li key={i} className="flex gap-3 text-sm"><span className="marker-num text-muted-foreground">{String(i + 1).padStart(2, "0")}</span><span>{s}</span></li>
              ))}
            </ul>
          </div>
          <div className="bg-paper p-6">
            <h3 className="chip mb-4 inline-flex" style={{ backgroundColor: "var(--brand-red)", color: "var(--paper)", borderColor: "var(--brand-red)" }}>Development areas</h3>
            <ul className="space-y-2">
              {(evaluation.gaps ?? []).map((s: string, i: number) => (
                <li key={i} className="flex gap-3 text-sm"><span className="marker-num text-muted-foreground">{String(i + 1).padStart(2, "0")}</span><span>{s}</span></li>
              ))}
            </ul>
          </div>
        </div>

        {raw.calibration_notes && (
          <div className="mt-6 border border-ink p-5" style={{ backgroundColor: "var(--secondary)" }}>
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-2">Reviewer calibration notes</div>
            <p className="text-sm leading-relaxed">{raw.calibration_notes}</p>
          </div>
        )}
      </section>

      <section className="mx-auto max-w-[1200px] px-6 md:px-10 py-12 hairline">
        <div className="pt-8 flex flex-wrap gap-3">
          <Link to="/scenarios" className="border border-ink px-4 py-2 text-sm">Try another scenario</Link>
          <Link to="/reviewer" className="bg-ink text-paper px-4 py-2 text-sm rounded-sm">Send to reviewer →</Link>
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
