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

      {evaluation.ai_detection && <AiDetectionPanel detection={evaluation.ai_detection} />}

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

const FIELD_LABELS: Record<string, string> = {
  framing_notes: "Framing notes",
  methodology_rationale: "Methodology rationale",
  intervention_recommendation: "Intervention recommendation",
  dialogue_messages: "Dialogue messages",
};

const VERDICT_META: Record<string, { label: string; color: string; fg?: string }> = {
  likely_human: { label: "Likely human", color: "var(--brand-lime)" },
  uncertain: { label: "Uncertain", color: "var(--brand-cyan)" },
  likely_ai: { label: "Likely AI-generated", color: "var(--brand-red)", fg: "var(--paper)" },
  insufficient_text: { label: "Insufficient text", color: "var(--secondary)" },
};

function AiDetectionPanel({ detection }: { detection: any }) {
  const overall = VERDICT_META[detection.overall_verdict] ?? VERDICT_META.uncertain;
  return (
    <section className="mx-auto max-w-[1200px] px-6 md:px-10 py-12">
      <div className="flex flex-wrap items-baseline justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl">AI-authorship check</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Heuristic estimate of whether the candidate's written responses were drafted by a generative AI model. Signal, not verdict — review before acting.
          </p>
        </div>
        <div
          className="border border-ink px-5 py-3 flex items-center gap-4"
          style={{ backgroundColor: overall.color, color: overall.fg ?? "var(--ink)" }}
        >
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] opacity-80">Overall</div>
            <div className="text-base font-medium">{overall.label}</div>
          </div>
          <div className="marker-num text-2xl">{detection.overall_likelihood}%</div>
        </div>
      </div>

      <p className="text-sm leading-relaxed mb-6 max-w-3xl">{detection.summary}</p>

      <div className="grid md:grid-cols-2 gap-px bg-ink border border-ink">
        {Object.entries(detection.fields ?? {}).map(([key, raw]) => {
          const f = raw as { likelihood: number; verdict: string; signals: string };
          const v = VERDICT_META[f.verdict] ?? VERDICT_META.uncertain;
          return (
            <div key={key} className="bg-paper p-5">
              <div className="flex items-baseline justify-between mb-3">
                <h3 className="text-sm font-medium">{FIELD_LABELS[key] ?? key}</h3>
                <span
                  className="text-[10px] uppercase tracking-[0.12em] border border-ink px-2 py-0.5"
                  style={{ backgroundColor: v.color, color: v.fg ?? "var(--ink)" }}
                >
                  {v.label}
                </span>
              </div>
              <LikelihoodBar value={f.likelihood} />
              <p className="text-xs text-muted-foreground leading-relaxed mt-3">{f.signals}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function LikelihoodBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 border border-ink relative overflow-hidden">
        <div
          className="absolute inset-y-0 left-0"
          style={{
            width: `${value}%`,
            backgroundColor:
              value >= 70 ? "var(--brand-red)" : value >= 40 ? "var(--brand-cyan)" : "var(--brand-lime)",
          }}
        />
      </div>
      <span className="marker-num text-sm w-12 text-right">{value}%</span>
    </div>
  );
}
