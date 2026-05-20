import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Shell } from "@/components/Shell";
import { getSession } from "@/lib/simulator.functions";
import { RUBRIC_DIMENSIONS } from "@/lib/evaluation.functions";

export const Route = createFileRoute("/sessions/$sessionId/report")({
  head: () => ({ meta: [{ title: "Evaluation report · Strategyzer Coach Certification" }] }),
  component: ReportPage,
});

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

  const recColor: Record<string, string> = {
    certify: "var(--brand-lime)",
    conditional: "var(--brand-cyan)",
    not_yet: "var(--brand-red)",
  };
  const recLabel: Record<string, string> = {
    certify: "Recommend certify",
    conditional: "Conditional",
    not_yet: "Not yet",
  };

  return (
    <Shell>
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
              <div className="border border-ink p-6" style={{ backgroundColor: recColor[evaluation.recommendation] }}>
                <div className="text-xs uppercase tracking-[0.14em] mb-2">AI recommendation</div>
                <div className="text-2xl font-medium">{recLabel[evaluation.recommendation]}</div>
                <div className="text-xs mt-4 opacity-80">Pending human reviewer sign-off.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-6 md:px-10 py-12">
        <h2 className="text-2xl mb-6">Rubric scoring</h2>
        <div className="grid md:grid-cols-2 gap-px bg-ink border border-ink">
          {RUBRIC_DIMENSIONS.map((d) => {
            const s = evaluation.scores?.[d.key];
            return (
              <div key={d.key} className="bg-paper p-6">
                <div className="flex items-baseline justify-between mb-3">
                  <h3 className="text-lg">{d.label}</h3>
                  <ScoreBar score={s?.score ?? 0} />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{s?.evidence ?? "No evidence captured."}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-6 md:px-10 py-12 grid md:grid-cols-2 gap-10">
        <div>
          <h3 className="chip mb-4 inline-flex" style={{ backgroundColor: "var(--brand-lime)" }}>Strengths</h3>
          <ul className="space-y-2">
            {(evaluation.strengths ?? []).map((s: string, i: number) => (
              <li key={i} className="flex gap-3 text-sm"><span className="marker-num text-muted-foreground">{String(i + 1).padStart(2, "0")}</span><span>{s}</span></li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="chip mb-4 inline-flex" style={{ backgroundColor: "var(--brand-red)", color: "var(--paper)", borderColor: "var(--brand-red)" }}>Gaps</h3>
          <ul className="space-y-2">
            {(evaluation.gaps ?? []).map((s: string, i: number) => (
              <li key={i} className="flex gap-3 text-sm"><span className="marker-num text-muted-foreground">{String(i + 1).padStart(2, "0")}</span><span>{s}</span></li>
            ))}
          </ul>
        </div>
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
