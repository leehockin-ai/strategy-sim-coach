import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Shell } from "@/components/Shell";
import { listScenarios } from "@/lib/scenarios.functions";
import { createSession } from "@/lib/simulator.functions";
import { VoiceInput, appendTranscript } from "@/components/VoiceInput";

export const Route = createFileRoute("/_authenticated/scenarios")({
  head: () => ({
    meta: [
      { title: "Scenarios · Strategyzer Coach Certification Simulator" },
      { name: "description", content: "Browse certification scenarios and start a structured coaching session." },
    ],
  }),
  component: ScenariosPage,
});

function ScenariosPage() {
  const fetchScenarios = useServerFn(listScenarios);
  const { data, isLoading } = useQuery({
    queryKey: ["scenarios"],
    queryFn: () => fetchScenarios(),
  });

  return (
    <Shell>
      <section className="hairline-b">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-16">
          <span className="chip mb-4 inline-flex">Scenario library</span>
          <h1 className="text-4xl md:text-5xl tracking-tight">Pick a coaching situation</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Each scenario is a realistic, ambiguous business context with a stakeholder cast.
            There is no single correct path. Your decisions are scored against the rubric.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 md:px-10 py-12">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading scenarios…</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-ink border border-ink">
            {data?.scenarios.map((s: any, idx: number) => (
              <ScenarioCard key={s.id} scenario={s} index={idx} />
            ))}
          </div>
        )}
      </section>
    </Shell>
  );
}

const SWATCH_COLORS = [
  "var(--brand-blue)",
  "var(--brand-red)",
  "var(--brand-purple)",
  "var(--brand-cyan)",
  "var(--brand-lime)",
];

function ScenarioCard({ scenario, index }: { scenario: any; index: number }) {
  const [open, setOpen] = useState(false);
  const color = SWATCH_COLORS[index % SWATCH_COLORS.length];

  return (
    <>
      <article className="bg-paper p-6 flex flex-col min-h-[340px]">
        <div className="flex items-start justify-between mb-6">
          <span className="marker-num text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
          <span className="chip">{scenario.difficulty}</span>
        </div>
        <div className="w-16 h-16 border border-ink mb-6" style={{ backgroundColor: color }} />
        <h3 className="text-xl mb-1">{scenario.title}</h3>
        <p className="text-xs text-muted-foreground uppercase tracking-[0.12em] mb-3">{scenario.industry}</p>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6 flex-1">{scenario.summary}</p>
        <div className="flex flex-wrap gap-1.5 mb-6">
          {(scenario.ambiguity_factors as string[]).slice(0, 3).map((a) => (
            <span key={a} className="text-[11px] px-2 py-0.5 bg-secondary">{a}</span>
          ))}
        </div>
        <button
          onClick={() => setOpen(true)}
          className="self-start inline-flex items-center gap-2 bg-ink text-paper px-4 py-2 text-sm font-medium rounded-sm hover:opacity-90"
        >
          Start session <span aria-hidden>→</span>
        </button>
      </article>
      {open && <StartDialog scenario={scenario} onClose={() => setOpen(false)} />}
    </>
  );
}

function StartDialog({ scenario, onClose }: { scenario: any; onClose: () => void }) {
  const navigate = useNavigate();
  const create = useServerFn(createSession);
  const [name, setName] = useState(() => typeof window !== "undefined" ? localStorage.getItem("candidate_name") ?? "" : "");
  const [email, setEmail] = useState(() => typeof window !== "undefined" ? localStorage.getItem("candidate_email") ?? "" : "");

  const mut = useMutation({
    mutationFn: async () => {
      const res = await create({ data: { scenarioId: scenario.id, candidateName: name, candidateEmail: email } });
      return res.session;
    },
    onSuccess: (session) => {
      localStorage.setItem("candidate_name", name);
      localStorage.setItem("candidate_email", email);
      navigate({ to: "/sessions/$sessionId", params: { sessionId: session.id } });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not start session"),
  });

  return (
    <div className="fixed inset-0 bg-ink/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-paper border border-ink max-w-lg w-full p-8" onClick={(e) => e.stopPropagation()}>
        <span className="chip mb-3 inline-flex">{scenario.industry}</span>
        <h2 className="text-2xl mb-2">{scenario.title}</h2>
        <p className="text-sm text-muted-foreground mb-6">{scenario.summary}</p>

        <form
          onSubmit={(e) => { e.preventDefault(); if (!name || !email) return; mut.mutate(); }}
          className="space-y-4"
        >
          <div>
            <label className="text-xs uppercase tracking-[0.12em] mb-1 block">Candidate name</label>
            <div className="relative">
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-ink bg-paper px-3 py-2 pr-10 text-sm focus:outline-none focus:bg-secondary"
              />
              <div className="absolute top-1/2 -translate-y-1/2 right-1.5">
                <VoiceInput onTranscript={(c) => setName((p) => appendTranscript(p, c))} />
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.12em] mb-1 block">Email (for reviewer summary)</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-ink bg-paper px-3 py-2 text-sm focus:outline-none focus:bg-secondary"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-ink text-sm rounded-sm">Cancel</button>
            <button
              type="submit"
              disabled={mut.isPending}
              className="px-4 py-2 bg-ink text-paper text-sm rounded-sm disabled:opacity-50"
            >
              {mut.isPending ? "Starting…" : "Enter scenario →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
