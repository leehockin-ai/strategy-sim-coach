import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Coach Compass — An instrument for coaching judgment" },
      {
        name: "description",
        content:
          "Coach Compass places you inside real-world business scenarios and evaluates how you think, intervene, and navigate stakeholders — against the Strategyzer competency rubric.",
      },
      { property: "og:title", content: "Coach Compass — An instrument for coaching judgment" },
      {
        property: "og:description",
        content:
          "Assessed reasoning against the same rubric Strategyzer applies to its own coaches. Nine dimensions. Three chapters. Playbook facilitation at the core.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OverviewPage,
});

function OverviewPage() {
  return (
    <Shell>
      <Hero />
      <Chapters />
      <PlaybookBlock />
      <Rubric />
      <Assessment />
      <HardClose />
    </Shell>
  );
}

/* -------------------------------- HERO -------------------------------- */

function Hero() {
  return (
    <section>
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 pt-20 md:pt-24 pb-16 md:pb-20">
        <div className="mb-10">
          <span className="chip">Coach Compass · MVP</span>
        </div>
        <div className="grid md:grid-cols-[1fr_400px] gap-16 md:gap-20 items-center">
          <div>
            <h1 className="text-[clamp(2.75rem,6.5vw,5.25rem)] leading-[0.98] tracking-tight font-medium">
              An instrument for coaching{" "}
              <span style={{ color: "var(--brand-blue)" }}>judgment</span>.
            </h1>
            <p className="mt-8 max-w-[620px] text-[19px] leading-[1.55] text-ink">
              Coach Compass places you inside real-world business scenarios and evaluates how you
              think, intervene, and navigate stakeholders. The instrument assesses your reasoning
              against the Strategyzer competency rubric — the same criteria we apply to our own
              coaches and esteemed partners.
            </p>
            <p className="mt-8 max-w-[620px] text-sm leading-[1.55] text-muted-foreground border-l-2 border-ink pl-4">
              Backed by the Strategyzer methodology and coaching approach we've been using with
              clients for over a decade.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                to="/scenarios"
                className="inline-flex items-center gap-2 bg-ink text-paper px-6 py-3.5 text-[15px] font-medium rounded-sm hover:opacity-90"
              >
                Start a scenario <span aria-hidden>→</span>
              </Link>
              <Link
                to="/reviewer"
                className="inline-flex items-center gap-2 border border-ink px-6 py-3.5 text-[15px] font-medium rounded-sm hover:bg-secondary"
              >
                Reviewer dashboard
              </Link>
            </div>
          </div>
          <div className="border border-ink">
            <div className="grid grid-cols-2 gap-px bg-ink">
              <HeroCell color="var(--brand-blue)" fg="var(--paper)" label="Scope" />
              <HeroCell color="var(--brand-lime)" fg="var(--ink)" label="Apply" />
              <HeroCell color="var(--brand-red)" fg="var(--paper)" label="Progress" />
              <HeroCell color="var(--brand-cyan)" fg="var(--ink)" label="Assess" />
            </div>
            <div className="border-t border-ink px-5 py-4 text-[13px] text-muted-foreground leading-[1.5]">
              Nine competency dimensions. Multiple coaching paths can be valid. The reasoning is
              what's assessed.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroCell({ color, fg, label }: { color: string; fg: string; label: string }) {
  return (
    <div
      className="aspect-square flex items-end p-5 text-[11px] uppercase tracking-[0.12em] font-medium"
      style={{ backgroundColor: color, color: fg }}
    >
      {label}
    </div>
  );
}

/* ------------------------------ CHAPTERS ------------------------------ */

const CHAPTERS = [
  {
    n: "Chapter 1",
    t: "Scope the engagement",
    d: "Understand the client and their context. Talk with the stakeholders. Frame the real challenge and identify the decision this work needs to enable. Commit to an intervention that fits — usually a Strategyzer Playbook, and when the team isn't yet ready for methodology work, a preparatory coaching move first.",
  },
  {
    n: "Chapter 2",
    t: "Apply the intervention",
    d: "Facilitate what you committed to. Produce meaningful output. Know when enough has been achieved.",
  },
  {
    n: "Chapter 3",
    t: "Progress the engagement",
    d: "Interpret what emerged. Decide what the client can now know, decide, or not yet decide. Recommend the smallest responsible next move.",
  },
];

function Chapters() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-20 md:py-24">
        <Eyebrow>How a session runs</Eyebrow>
        <SectionH2>
          Three chapters,
          <br />
          one engagement.
        </SectionH2>
        <div className="mt-10 grid md:grid-cols-3 border border-ink">
          {CHAPTERS.map((c, i) => (
            <div
              key={c.n}
              className={`p-8 md:p-10 min-h-[340px] flex flex-col ${
                i < CHAPTERS.length - 1 ? "md:border-r border-ink" : ""
              }`}
            >
              <div className="marker-num text-[13px] tracking-[0.1em] text-muted-foreground mb-4">
                {c.n}
              </div>
              <h3 className="text-[26px] leading-[1.1] tracking-tight font-medium mb-5">{c.t}</h3>
              <p className="text-[15px] leading-[1.6] text-muted-foreground flex-grow">{c.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------- PLAYBOOK (DARK) --------------------------- */

const PLAYBOOKS = [
  { name: "Competing on Business Models", phase: "Design" },
  { name: "Strong Value Propositions", phase: "Design" },
  { name: "Customer Profile Interviews", phase: "Discovery" },
  { name: "Idea Generation", phase: "Discovery" },
  { name: "Value Scenes", phase: "Design" },
  { name: "Focus on the Right Customer", phase: "Discovery" },
  { name: "How Strong Is Your Business Model", phase: "Design" },
  { name: "How Market Ready Is Your Project", phase: "Test" },
];

function PlaybookBlock() {
  return (
    <section
      className="border-y border-border"
      style={{ backgroundColor: "var(--ink)", color: "var(--paper)" }}
    >
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-20 md:py-24">
        <div
          className="marker-num text-xs uppercase tracking-[0.1em] mb-5"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          Playbook facilitation
        </div>
        <h2 className="text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.02] tracking-tight font-medium mb-8">
          The <span style={{ color: "var(--brand-cyan)" }}>Playbook</span> is the substance
          <br />
          of Strategyzer coaching.
        </h2>
        <div className="grid md:grid-cols-[1.2fr_1fr] gap-12 md:gap-20 items-start mt-10">
          <div className="space-y-5 max-w-[640px]">
            <p className="text-[17px] leading-[1.65]" style={{ color: "rgba(255,255,255,0.85)" }}>
              A <strong className="font-medium text-paper">Strategyzer Playbook</strong> is a
              guided, multi-activity workflow that takes a team from a business challenge to a
              validated outcome. It combines e-learning, facilitation activities, and workspace
              tools — designed to be run over one or several sessions with the team.
            </p>
            <p className="text-[17px] leading-[1.65]" style={{ color: "rgba(255,255,255,0.85)" }}>
              Coach Compass covers the full Strategyzer Playbook library. When you commit to a
              Playbook in a scenario, you'll plan how you'd sequence the activities, facilitate one
              live with the team, and interpret what emerged before recommending next steps.
            </p>
            <p className="text-[17px] leading-[1.65]" style={{ color: "rgba(255,255,255,0.85)" }}>
              The instrument doesn't test whether you picked <em>the</em> Playbook a reviewer would
              have. It tests whether the Playbook you picked fits the problem you diagnosed — and
              whether you can facilitate it with methodology rigor.
            </p>
          </div>
          <div
            className="p-8"
            style={{
              border: "1px solid rgba(255,255,255,0.2)",
              backgroundColor: "rgba(255,255,255,0.03)",
            }}
          >
            <div
              className="marker-num text-[11px] uppercase tracking-[0.12em] mb-5"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              Playbooks in the library
            </div>
            <ul>
              {PLAYBOOKS.map((p, i) => (
                <li
                  key={p.name}
                  className="flex justify-between items-baseline py-2.5 text-[15px]"
                  style={{
                    color: "rgba(255,255,255,0.85)",
                    borderBottom:
                      i < PLAYBOOKS.length - 1 ? "1px solid rgba(255,255,255,0.1)" : "none",
                  }}
                >
                  <span>{p.name}</span>
                  <span
                    className="marker-num text-[10px] uppercase tracking-[0.12em]"
                    style={{ color: "rgba(255,255,255,0.45)" }}
                  >
                    {p.phase}
                  </span>
                </li>
              ))}
            </ul>
            <div
              className="mt-5 pt-5 text-[13px] leading-[1.5]"
              style={{
                borderTop: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.55)",
              }}
            >
              Plus additional Playbooks in the Strategyzer library, and more coming.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------- RUBRIC ------------------------------ */

const DIMENSIONS = [
  { n: "01", t: "Situation framing", d: "Root cause versus symptom. Reducing ambiguity before intervening." },
  { n: "02", t: "Coaching strategy", d: "Which intervention, why, and in what sequence." },
  { n: "03", t: "Stakeholder navigation", d: "Sponsors, skeptics, executive pressure — bringing the right voices in." },
  { n: "04", t: "Working session facilitation", d: "Guiding without dominating. Transferring ownership to the team." },
  { n: "05", t: "Intervention discipline", d: "Avoiding theater. Stopping when enough has been achieved." },
  { n: "06", t: "Engagement pathway", d: "What happens next — and what shouldn't happen yet." },
  { n: "07", t: "Methodological soundness", d: "Strategyzer methodology applied with fidelity to the work." },
  { n: "08", t: "Intervention fit", d: "Does the chosen intervention match the diagnosed problem?" },
  { n: "09", t: "Intervention execution", d: "Rigor and coaching posture in delivery, regardless of intervention chosen." },
];

const LOOK_FOR = [
  "Clarifies before prescribing",
  "Reframes assumptions as testable hypotheses",
  "Redirects ownership to the team",
  "Simplifies next steps",
  "Identifies evidence gaps",
  "Matches intervention to diagnosis",
];

const DISQUALIFIES = [
  "Solution-jumping without context",
  "Overfacilitating, dominating dialogue",
  "Prescribing playbooks reflexively",
  "Expanding scope unnecessarily",
  "Consulting theater over progress",
  "Forcing an intervention the team isn't ready for",
];

function Rubric() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-20 md:py-24">
        <Eyebrow>The rubric</Eyebrow>
        <SectionH2>
          Nine competency
          <br />
          dimensions.
        </SectionH2>
        <p className="mt-6 max-w-[720px] text-[17px] leading-[1.6] text-muted-foreground mb-14">
          Every session is scored against the same criteria Strategyzer applies to its own coaches
          and esteemed partners. Reviewers see the full breakdown. You see the developmental
          narrative that emerges from it.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 border border-ink">
          {DIMENSIONS.map((d, i) => {
            const col = i % 3;
            const row = Math.floor(i / 3);
            return (
              <div
                key={d.n}
                className={[
                  "p-7 min-h-[200px]",
                  col < 2 ? "md:border-r border-ink" : "",
                  row < 2 ? "border-b border-ink" : "",
                ].join(" ")}
              >
                <div className="marker-num text-xs tracking-[0.1em] text-muted-foreground mb-3.5">
                  {d.n}
                </div>
                <h3 className="text-[20px] leading-[1.2] font-medium mb-3">{d.t}</h3>
                <p className="text-sm leading-[1.5] text-muted-foreground">{d.d}</p>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 border border-t-0 border-ink">
          <PhilosophyCol title="What we look for" color="var(--brand-lime)" items={LOOK_FOR} bordered />
          <PhilosophyCol title="What disqualifies" color="var(--brand-red)" items={DISQUALIFIES} />
        </div>
      </div>
    </section>
  );
}

function PhilosophyCol({
  title,
  color,
  items,
  bordered,
}: {
  title: string;
  color: string;
  items: string[];
  bordered?: boolean;
}) {
  return (
    <div className={`p-8 ${bordered ? "md:border-r border-ink" : ""}`}>
      <h4 className="text-xs uppercase tracking-[0.12em] font-medium mb-5 flex items-center gap-2.5">
        <span
          className="inline-block w-3 h-3 border border-ink"
          style={{ backgroundColor: color }}
        />
        {title}
      </h4>
      <ul className="space-y-1.5">
        {items.map((i) => (
          <li key={i} className="text-sm leading-[1.4] flex gap-2.5">
            <span className="text-muted-foreground">—</span>
            <span>{i}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------------------- ASSESSMENT ------------------------------ */

function Assessment() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-20 md:py-24">
        <Eyebrow>How the reading is produced</Eyebrow>
        <SectionH2>
          The AI drafts.
          <br />
          A Strategyzer reviewer signs.
        </SectionH2>
        <p className="mt-6 max-w-[720px] text-[17px] leading-[1.6] text-muted-foreground mb-14">
          Every completed session generates an AI-drafted rubric report — yours to read, reflect
          on, and revisit. When you submit for review, a Strategyzer reviewer reads your work
          personally, calibrates against the AI rubric, and signs off with their name and their
          notes.
        </p>
        <div className="grid md:grid-cols-2 gap-8 md:gap-14 items-start">
          <AssessmentCard
            label="First — automatic"
            title="AI rubric"
            body="A development tool. Nine dimensions scored against your actual work. Available immediately when you complete a session."
            bg="#FFF9E6"
          />
          <AssessmentCard
            label="When you submit for review"
            title="Strategyzer-signed reading"
            body="A Strategyzer reviewer personally evaluates your session and signs off with their name, notes, and decision."
            bg="#EDF7E4"
          />
        </div>
      </div>
    </section>
  );
}

function AssessmentCard({
  label,
  title,
  body,
  bg,
}: {
  label: string;
  title: string;
  body: string;
  bg: string;
}) {
  return (
    <div className="p-8 border border-ink" style={{ backgroundColor: bg }}>
      <div className="marker-num text-[11px] uppercase tracking-[0.12em] text-muted-foreground mb-3">
        {label}
      </div>
      <h3 className="text-[24px] leading-tight tracking-tight font-medium mb-4">{title}</h3>
      <p className="text-[15px] leading-[1.6] text-muted-foreground">{body}</p>
    </div>
  );
}

/* ----------------------------- HARD CLOSE ----------------------------- */

function HardClose() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-20 md:py-24 flex flex-col md:flex-row items-start md:items-center justify-between gap-10">
        <h2 className="text-[clamp(1.75rem,3.5vw,2.75rem)] leading-[1.1] tracking-tight font-medium max-w-[720px]">
          Bring your coaching judgment into the room.
        </h2>
        <Link
          to="/scenarios"
          className="inline-flex items-center gap-2 bg-ink text-paper px-8 py-4 text-base font-medium rounded-sm hover:opacity-90 whitespace-nowrap"
        >
          Start a scenario <span aria-hidden>→</span>
        </Link>
      </div>
    </section>
  );
}

/* ------------------------------ SHARED -------------------------------- */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="marker-num text-xs uppercase tracking-[0.1em] text-muted-foreground mb-5">
      {children}
    </div>
  );
}

function SectionH2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[clamp(2.25rem,5vw,3.25rem)] leading-[1.02] tracking-tight font-medium">
      {children}
    </h2>
  );
}
