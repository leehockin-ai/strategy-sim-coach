import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Strategyzer Coach Certification Simulator" },
      { name: "description", content: "Assess coaching judgment in realistic business scenarios — not framework memorization." },
    ],
  }),
  component: IndexPage,
});

const DIMENSIONS = [
  { n: "01", t: "Problem framing", d: "Root cause vs symptom. Reduce ambiguity." },
  { n: "02", t: "Methodology judgment", d: "Right playbook, right moment, right scope." },
  { n: "03", t: "Facilitation posture", d: "Guide. Don't dominate. Transfer ownership." },
  { n: "04", t: "Evidence thinking", d: "Distinguish assumption from evidence." },
  { n: "05", t: "Intervention discipline", d: "Avoid theater. Stop when enough." },
  { n: "06", t: "Stakeholder navigation", d: "Sponsors, skeptics, executive pressure." },
];

function IndexPage() {
  return (
    <Shell>
      <Hero />
      <Rubric />
      <Flow />
      <Philosophy />
    </Shell>
  );
}

function Hero() {
  return (
    <section className="hairline-b grid-bg">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-20 md:py-28">
        <div className="grid md:grid-cols-12 gap-10 items-end">
          <div className="md:col-span-8">
            <div className="flex items-center gap-3 mb-8">
              <span className="chip chip-filled">Level 1 · MVP</span>
              <span className="chip">Coach assessment</span>
            </div>
            <h1 className="text-[clamp(2.5rem,6vw,5.5rem)] leading-[0.95] tracking-tight font-medium">
              Certify coaching <span style={{ color: "var(--brand-blue)" }}>judgment</span>,<br />
              not framework <span style={{ color: "var(--brand-red)" }}>recall</span>.
            </h1>
            <p className="mt-8 max-w-xl text-base md:text-lg text-muted-foreground">
              A structured simulator that places candidates inside ambiguous, real-world business
              situations and evaluates how they think, intervene, and navigate stakeholders —
              against the Strategyzer competency rubric.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                to="/scenarios"
                className="inline-flex items-center gap-2 bg-ink text-paper px-5 py-3 text-sm font-medium rounded-sm hover:opacity-90"
              >
                Start a scenario
                <span aria-hidden>→</span>
              </Link>
              <Link
                to="/reviewer"
                className="inline-flex items-center gap-2 border border-ink px-5 py-3 text-sm font-medium rounded-sm hover:bg-secondary"
              >
                Reviewer dashboard
              </Link>
            </div>
          </div>
          <div className="md:col-span-4">
            <div className="grid grid-cols-2 gap-2">
              <Tile color="var(--brand-blue)" label="Framing" />
              <Tile color="var(--brand-lime)" label="Evidence" />
              <Tile color="var(--brand-red)" label="Intervention" />
              <Tile color="var(--brand-cyan)" label="Stakeholders" />
            </div>
            <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
              Multiple coaching paths can be valid. Decisions are evaluated against
              observable behavior — not a single "correct" answer.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Tile({ color, label }: { color: string; label: string }) {
  return (
    <div className="aspect-square border border-ink flex items-end p-3" style={{ backgroundColor: color }}>
      <span className="text-[11px] uppercase tracking-[0.14em] font-medium text-ink">{label}</span>
    </div>
  );
}

function Rubric() {
  return (
    <section className="hairline-b">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-16 md:py-20">
        <div className="flex items-baseline justify-between mb-10">
          <h2 className="text-3xl md:text-4xl tracking-tight">Six competency dimensions</h2>
          <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground marker-num">Rubric · v1</span>
        </div>
        <div className="grid md:grid-cols-3 gap-px bg-ink border border-ink">
          {DIMENSIONS.map((d) => (
            <div key={d.n} className="bg-paper p-6 min-h-[180px] flex flex-col justify-between">
              <span className="marker-num text-xs text-muted-foreground">{d.n}</span>
              <div>
                <h3 className="text-lg mb-2">{d.t}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{d.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Flow() {
  const steps = [
    { n: "01", t: "Intake", d: "Receive a business scenario, stakeholder cast, and constraints." },
    { n: "02", t: "Framing", d: "Write your initial framing, assumptions, and focus areas." },
    { n: "03", t: "Method", d: "Pick a playbook approach and explain why." },
    { n: "04", t: "Dialogue", d: "Talk to simulated stakeholders. Sponsors, skeptics, operators." },
    { n: "05", t: "Intervention", d: "Recommend a next step. Decide: continue, pivot, escalate, stop." },
    { n: "06", t: "Application", d: "Run real Strategyzer playbook activities with the team — map ecosystem and customer profile." },
    { n: "07", t: "Review", d: "AI-drafted rubric report, reviewed and signed off by a human." },
  ];
  return (
    <section className="hairline-b" style={{ backgroundColor: "var(--brand-blue)" }}>
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-16 md:py-20 text-paper">
        <h2 className="text-3xl md:text-4xl tracking-tight mb-12">How a session runs</h2>
        <div className="grid md:grid-cols-7 gap-px">

          {steps.map((s, i) => (
            <div key={s.n} className="border-t border-paper pt-4">
              <div className="flex items-baseline justify-between mb-3">
                <span className="marker-num text-xs opacity-70">{s.n}</span>
                <span className="text-xs opacity-50">step</span>
              </div>
              <h3 className="text-lg mb-2 text-paper">{s.t}</h3>
              <p className="text-sm opacity-80 leading-relaxed">{s.d}</p>
              {i < steps.length - 1 && (
                <div className="mt-4 h-px bg-paper opacity-30 md:hidden" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Philosophy() {
  return (
    <section>
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-16 md:py-24 grid md:grid-cols-12 gap-10">
        <div className="md:col-span-5">
          <span className="chip mb-6 inline-flex">Philosophy</span>
          <h2 className="text-3xl md:text-4xl tracking-tight leading-tight">
            We evaluate <span style={{ color: "var(--brand-purple)" }}>how</span> coaches think.
            Not whether the fictional business succeeds.
          </h2>
        </div>
        <div className="md:col-span-7 grid sm:grid-cols-2 gap-10">
          <Pillar
            color="var(--brand-lime)"
            title="What we look for"
            items={[
              "Clarifies before prescribing",
              "Reframes assumptions as testable hypotheses",
              "Redirects ownership to the team",
              "Simplifies next steps",
              "Identifies evidence gaps",
            ]}
          />
          <Pillar
            color="var(--brand-red)"
            title="What disqualifies"
            items={[
              "Solution-jumping without context",
              "Overfacilitating, dominating dialogue",
              "Prescribing playbooks reflexively",
              "Expanding scope unnecessarily",
              "Consulting theater over progress",
            ]}
          />
        </div>
      </div>
    </section>
  );
}

function Pillar({ color, title, items }: { color: string; title: string; items: string[] }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <span className="w-3 h-3 inline-block border border-ink" style={{ backgroundColor: color }} />
        <h3 className="text-sm uppercase tracking-[0.14em]">{title}</h3>
      </div>
      <ul className="space-y-2">
        {items.map((i) => (
          <li key={i} className="text-sm flex gap-3">
            <span className="marker-num text-muted-foreground">—</span>
            <span>{i}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
