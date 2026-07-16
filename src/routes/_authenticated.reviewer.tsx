import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Shell } from "@/components/Shell";
import { listReviewSessions, setReviewerDecision, SECTION_RUBRIC } from "@/lib/evaluation.functions";
import { getSessionForReviewer } from "@/lib/simulator.functions";
import { VoiceInput, appendTranscript } from "@/components/VoiceInput";
import { useMyRoles } from "@/hooks/use-my-roles";

export const Route = createFileRoute("/_authenticated/reviewer")({
  head: () => ({ meta: [{ title: "Reviewer · Strategyzer Coach Certification" }] }),
  component: ReviewerGate,
});

function ReviewerGate() {
  const { isReviewer, isLoading } = useMyRoles();
  if (isLoading) {
    return (
      <Shell>
        <section className="mx-auto max-w-[1400px] px-6 md:px-10 py-16 text-sm text-muted-foreground">
          Checking access…
        </section>
      </Shell>
    );
  }
  if (!isReviewer) {
    return (
      <Shell>
        <section className="mx-auto max-w-[1400px] px-6 md:px-10 py-16">
          <span className="chip mb-4 inline-flex">Restricted</span>
          <h1 className="text-3xl tracking-tight mb-2">Reviewer access only</h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            This area is limited to certification reviewers. If you believe you should have access,
            ask an administrator to grant you the reviewer role.
          </p>
        </section>
      </Shell>
    );
  }
  return <ReviewerPage />;
}


// ────────────────────────────── color tokens ─────────────────────────────

const REC_COLOR: Record<string, string> = {
  pass: "var(--brand-lime)",
  conditional_pass: "var(--brand-cyan)",
  human_review_required: "var(--brand-yellow, #f5d547)",
  retry_recommended: "var(--brand-yellow, #f5d547)",
  not_yet_certified: "var(--brand-red)",
  // legacy
  certify: "var(--brand-lime)",
  conditional: "var(--brand-cyan)",
  not_yet: "var(--brand-red)",
};
const REC_LABEL: Record<string, string> = {
  pass: "Pass",
  conditional_pass: "Conditional pass",
  human_review_required: "Human review required",
  retry_recommended: "Retry recommended",
  not_yet_certified: "Not yet certified",
  certify: "Pass",
  conditional: "Conditional pass",
  not_yet: "Not yet certified",
};

const DECISION_COLOR: Record<string, string> = {
  approved: "var(--brand-lime)",
  conditional_approval: "var(--brand-cyan)",
  retry_required: "var(--brand-yellow, #f5d547)",
  not_approved: "var(--brand-red)",
  escalate: "var(--brand-blue, #6366f1)",
};
const DECISION_LABEL: Record<string, string> = {
  approved: "Approved",
  conditional_approval: "Conditional approval",
  retry_required: "Retry required",
  not_approved: "Not approved",
  escalate: "Escalate to senior reviewer",
};

const RATING_COLOR: Record<string, string> = {
  strength: "var(--brand-lime)",
  mixed: "var(--brand-yellow, #f5d547)",
  concern: "var(--brand-red)",
};

// ────────────────────────────── page ─────────────────────────────────────

function ReviewerPage() {
  const fetchSessions = useServerFn(listReviewSessions);
  const { data, refetch } = useQuery({ queryKey: ["review-sessions"], queryFn: () => fetchSessions() });
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("submitted");

  const sessions: any[] = data?.sessions ?? [];
  const filtered = sessions.filter((s) => {
    if (filter === "all") return true;
    // "Submitted" = candidate explicitly requested Strategyzer assessment.
    // Default reviewer view — only real certification submissions.
    if (filter === "submitted") {
      return !!s.submission_requested_at;
    }
    if (filter === "needs_review") {
      const ev = s.evaluations?.[0];
      return ev && !ev.reviewer_decision && !!s.submission_requested_at;
    }
    if (filter === "decided") return !!s.evaluations?.[0]?.reviewer_decision;
    return s.evaluations?.[0]?.reviewer_decision === filter;
  });

  return (
    <Shell>
      <section className="hairline-b">
        <div className="mx-auto max-w-[1500px] px-6 md:px-10 py-14">
          <span className="chip mb-4 inline-flex">Reviewer dashboard</span>
          <h1 className="text-4xl md:text-5xl tracking-tight">Certification submissions</h1>
          <p className="mt-4 text-muted-foreground max-w-2xl">
            AI produces a rubric-based recommendation. You give the final say. Open any session to review
            candidate inputs, soft-skill and methodology signals, and approve, conditionally pass,
            request a retry, or escalate.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-6 md:px-10 py-8">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {[
            { k: "submitted", l: "Submitted" },
            { k: "needs_review", l: "Needs review" },
            { k: "decided", l: "Reviewed" },
            { k: "approved", l: "Approved" },
            { k: "conditional_approval", l: "Conditional" },
            { k: "retry_required", l: "Retry" },
            { k: "not_approved", l: "Not approved" },
            { k: "escalate", l: "Escalated" },
            { k: "all", l: "All (incl. practice)" },
          ].map((f) => (
            <button
              key={f.k}
              onClick={() => setFilter(f.k)}
              className={`text-[11px] uppercase tracking-[0.12em] px-3 py-1.5 border border-ink ${filter === f.k ? "bg-ink text-paper" : "bg-paper"}`}
            >
              {f.l}
            </button>
          ))}
          <span className="ml-auto text-xs text-muted-foreground">{filtered.length} of {sessions.length} sessions</span>
        </div>

        <div className="border border-ink">
          <div className="grid grid-cols-12 hairline-b text-[11px] uppercase tracking-[0.12em] p-3 bg-secondary">
            <div className="col-span-3">Candidate</div>
            <div className="col-span-3">Scenario</div>
            <div className="col-span-1">Level</div>
            <div className="col-span-1">Date</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-1">AI rec</div>
            <div className="col-span-1">Reviewer</div>
            <div className="col-span-1">Decision</div>
          </div>
          {filtered.map((s: any) => {
            const ev = s.evaluations?.[0];
            return (
              <button
                key={s.id}
                onClick={() => setOpenId(s.id)}
                className="grid grid-cols-12 w-full hairline-b text-left p-3 hover:bg-secondary text-sm items-center"
              >
                <div className="col-span-3">
                  <div className="font-medium">{s.candidate_name}</div>
                  <div className="text-xs text-muted-foreground">{s.candidate_email}</div>
                </div>
                <div className="col-span-3 text-sm">{s.scenarios?.title}</div>
                <div className="col-span-1 text-xs uppercase tracking-[0.1em]">{s.scenarios?.difficulty ?? "—"}</div>
                <div className="col-span-1 text-xs text-muted-foreground">
                  {s.completed_at ? new Date(s.completed_at).toLocaleDateString() : new Date(s.created_at).toLocaleDateString()}
                </div>
                <div className="col-span-1"><StatusPill status={s.status} /></div>
                <div className="col-span-1">
                  {ev?.recommendation ? <RecPill rec={ev.recommendation} /> : <span className="text-xs text-muted-foreground">—</span>}
                </div>
                <div className="col-span-1 text-xs">{ev?.reviewer_name ?? <span className="text-muted-foreground">—</span>}</div>
                <div className="col-span-1">
                  {ev?.reviewer_decision ? <DecisionPill dec={ev.reviewer_decision} /> : <span className="text-xs text-muted-foreground">pending</span>}
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="p-10 text-sm text-muted-foreground text-center">No sessions match this filter.</div>
          )}
        </div>
      </section>

      {openId && <ReviewerDrawer sessionId={openId} onClose={() => { setOpenId(null); refetch(); }} />}
    </Shell>
  );
}

// ────────────────────────────── pills ─────────────────────────────────

function StatusPill({ status }: { status: string }) {
  return (
    <span className="text-[10px] uppercase tracking-[0.12em] px-2 py-0.5 border border-ink">
      {status?.replace(/_/g, " ") ?? "—"}
    </span>
  );
}
function RecPill({ rec }: { rec: string }) {
  return (
    <span className="text-[10px] uppercase tracking-[0.12em] px-2 py-0.5 border border-ink whitespace-nowrap" style={{ backgroundColor: REC_COLOR[rec] ?? "transparent" }}>
      {REC_LABEL[rec] ?? rec}
    </span>
  );
}
function DecisionPill({ dec }: { dec: string }) {
  return (
    <span className="text-[10px] uppercase tracking-[0.12em] px-2 py-0.5 border border-ink whitespace-nowrap" style={{ backgroundColor: DECISION_COLOR[dec] ?? "transparent" }}>
      {DECISION_LABEL[dec] ?? dec}
    </span>
  );
}
function RatingPill({ rating }: { rating: string }) {
  return (
    <span className="text-[10px] uppercase tracking-[0.12em] px-2 py-0.5 border border-ink" style={{ backgroundColor: RATING_COLOR[rating] ?? "transparent" }}>
      {rating}
    </span>
  );
}

// ────────────────────────────── review drawer ─────────────────────────

function ReviewerDrawer({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const fetchSession = useServerFn(getSessionForReviewer);
  const decide = useServerFn(setReviewerDecision);
  const { data, refetch } = useQuery({ queryKey: ["session-review", sessionId], queryFn: () => fetchSession({ data: { sessionId } }) });

  const [tab, setTab] = useState<"context" | "inputs" | "rubric" | "soft" | "methodology" | "decision">("context");

  const [reviewerName, setReviewerName] = useState("");
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [coachFeedback, setCoachFeedback] = useState("");

  useEffect(() => {
    if (!data) return;
    const ev: any = data.evaluation;
    setReviewerName(ev?.reviewer_name ?? "");
    setReviewerNotes(ev?.reviewer_notes ?? "");
    setInternalNotes(ev?.internal_notes ?? "");
    setCoachFeedback(ev?.coach_feedback ?? "");
  }, [data]);

  const mut = useMutation({
    mutationFn: (dec: string) =>
      decide({
        data: {
          sessionId,
          reviewerName: reviewerName || undefined,
          reviewerNotes: reviewerNotes || undefined,
          internalNotes: internalNotes || undefined,
          coachFeedback: coachFeedback || undefined,
          reviewerDecision: dec as any,
        },
      }),
    onSuccess: () => { toast.success("Final review submitted"); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!data) return null;
  const session: any = data.session;
  const scenario: any = session.scenarios;
  const evaluation: any = data.evaluation;
  const messages: any[] = data.messages ?? [];
  const stakeholderStates: any[] = (data as any).stakeholderStates ?? [];
  const raw: any = evaluation?.raw_response ?? {};
  const sections: Record<string, any> = raw.sections ?? evaluation?.scores?.sections ?? {};


  const TABS: Array<[typeof tab, string]> = [
    ["context", "Scenario context"],
    ["inputs", "Candidate inputs"],
    ["rubric", "AI rubric"],
    ["soft", "Soft skills"],
    ["methodology", "Methodology"],
    ["decision", "Final review"],
  ];

  return (
    <div className="fixed inset-0 bg-ink/40 z-50 flex justify-end" onClick={onClose}>
      <div className="bg-paper w-full max-w-5xl h-full overflow-y-auto border-l border-ink" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="hairline-b p-6 sticky top-0 bg-paper z-10">
          <div className="flex justify-between items-start gap-4">
            <div>
              <span className="chip mb-2 inline-flex">{scenario?.title}</span>
              <h2 className="text-2xl">{session.candidate_name}</h2>
              <p className="text-sm text-muted-foreground">{session.candidate_email} · {scenario?.difficulty} · {scenario?.industry}</p>
            </div>
            <div className="flex items-start gap-3">
              {evaluation?.recommendation && <RecPill rec={evaluation.recommendation} />}
              {evaluation?.reviewer_decision && <DecisionPill dec={evaluation.reviewer_decision} />}
              <button onClick={onClose} className="text-2xl leading-none">×</button>
            </div>
          </div>
          <nav className="mt-4 flex flex-wrap gap-1">
            {TABS.map(([k, l]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`text-[11px] uppercase tracking-[0.12em] px-3 py-1.5 border border-ink ${tab === k ? "bg-ink text-paper" : "bg-paper"}`}
              >
                {l}
              </button>
            ))}
          </nav>
        </div>

        {/* Body */}
        <div className="p-6 space-y-8">
          {!evaluation && (
            <p className="text-sm text-muted-foreground">
              No AI evaluation generated yet. Once the candidate completes the intervention step, an evaluation will appear.
            </p>
          )}

          {tab === "context" && <ContextTab scenario={scenario} session={session} evaluation={evaluation} />}
          {tab === "inputs" && <InputsTab session={session} messages={messages} />}
          {tab === "rubric" && <RubricTab sections={sections} raw={raw} />}
          {tab === "soft" && <SkillsList items={evaluation?.soft_skills ?? raw.soft_skills ?? []} emptyHint="Soft-skill assessment not generated." />}
          {tab === "methodology" && <SkillsList items={evaluation?.methodology_skills ?? raw.methodology_skills ?? []} emptyHint="Methodology assessment not generated." />}
          {tab === "decision" && (
            <DecisionTab
              evaluation={evaluation}
              raw={raw}
              reviewerName={reviewerName}
              setReviewerName={setReviewerName}
              reviewerNotes={reviewerNotes}
              setReviewerNotes={setReviewerNotes}
              internalNotes={internalNotes}
              setInternalNotes={setInternalNotes}
              coachFeedback={coachFeedback}
              setCoachFeedback={setCoachFeedback}
              onSubmit={(d) => mut.mutate(d)}
              submitting={mut.isPending}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────── tabs ─────────────────────────────────

function ContextTab({ scenario, session, evaluation }: any) {
  const stakeholders = (scenario?.stakeholders ?? []) as Array<{ name: string; role: string; posture: string }>;
  return (
    <div className="space-y-6">
      <Field label="Success definition" value={scenario?.success_definition} />
      <Field label="Success pressure" value={scenario?.success_pressure} />
      <ListField label="Unrealistic assumptions" items={scenario?.unrealistic_aspects ?? []} />
      <ListField label="Ambiguity factors" items={scenario?.ambiguity_factors ?? []} />
      <div>
        <SectionLabel>Stakeholder cast</SectionLabel>
        <div className="grid md:grid-cols-2 gap-px bg-ink border border-ink">
          {stakeholders.map((st, i) => (
            <div key={i} className="bg-paper p-4">
              <div className="font-medium">{st.name}</div>
              <div className="text-xs text-muted-foreground mb-1">{st.role}</div>
              <p className="text-sm">{st.posture}</p>
            </div>
          ))}
        </div>
      </div>
      {evaluation?.overall_summary && (
        <div className="border border-ink p-5" style={{ backgroundColor: "var(--secondary)" }}>
          <SectionLabel>AI overall summary</SectionLabel>
          <p className="text-sm leading-relaxed">{evaluation.overall_summary}</p>
        </div>
      )}
    </div>
  );
}

function InputsTab({ session, messages }: { session: any; messages: any[] }) {
  const transcript = messages.filter((m) => m.role !== "system");
  const canvas = (session.application_canvas ?? {}) as Record<string, any>;
  const cells: Array<{ key: string; value: any; confidence: string; ambiguity: boolean }> = [];
  for (const [k, v] of Object.entries(canvas)) {
    if (k.startsWith("__meta__")) continue;
    const metaRaw = canvas[`__meta__${k}`];
    let meta: any = {};
    if (typeof metaRaw === "string") { try { meta = JSON.parse(metaRaw); } catch {} }
    cells.push({ key: k, value: v, confidence: meta.confidence ?? "unset", ambiguity: !!meta.ambiguity });
  }
  const pa = session.playbook_application ?? {};
  return (
    <div className="space-y-8">
      {(() => {
        const log = Array.isArray(session.playbook_suggestions) ? session.playbook_suggestions : [];
        if (log.length === 0) {
          return (
            <div className="p-3 border border-ink text-xs" style={{ backgroundColor: "var(--brand-lime)" }}>
              <span className="font-medium">No AI assistance used.</span> Candidate's coaching strategy reflects independent reasoning.
            </div>
          );
        }
        return (
          <div className="p-3 border border-ink text-xs" style={{ backgroundColor: "var(--brand-yellow)" }}>
            <div className="font-medium mb-2">AI assistance log — {log.length} suggestion{log.length === 1 ? "" : "s"} consulted</div>
            <ul className="space-y-2">
              {log.map((entry: any, i: number) => {
                const sug = entry?.suggestion ?? {};
                const state = entry?.candidate_state_at_request ?? {};
                return (
                  <li key={i} className="border-l-2 border-ink pl-2">
                    <div className="opacity-70">
                      Request {i + 1} · mode={entry?.requested_mode ?? "?"} ·
                      {" "}draft at time of request: {state.had_draft_choice ? "had choice" : "no choice yet"},
                      {" "}{state.draft_rationale_chars ?? 0} chars of rationale
                    </div>
                    <div>
                      AI proposed: <strong>{sug.playbookId ?? "(no playbook)"}</strong>
                      {sug.confidence ? ` · confidence ${sug.confidence}` : ""}
                    </div>
                    {sug.rationale && <div className="italic opacity-80">"{sug.rationale}"</div>}
                  </li>
                );
              })}
            </ul>
            <div className="mt-2 opacity-70">
              Compare these to the candidate's submitted rationale in Coaching Approach below. Reflexive AI use before drafting independent reasoning should weigh against Coaching Strategy.
            </div>
          </div>
        );
      })()}
      <CandidateBlock label="Situation framing (Step 1)" value={session.framing_notes} />
      <CandidateBlock
        label="Coaching approach (Step 2)"
        value={session.methodology_choice ? `Choice: ${session.methodology_choice}\n\nRationale:\n${session.methodology_rationale ?? "(none)"}` : null}
      />
      <div>
        <SectionLabel>Stakeholder workspace (Step 3)</SectionLabel>
        <CandidateBlock label="Captured commitments" value={session.dialogue_commitments} compact />
        <div className="mt-3 border border-ink max-h-[400px] overflow-y-auto">
          {transcript.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No stakeholder transcript.</p>
          ) : (
            transcript.map((m: any) => (
              <div key={m.id} className="hairline-b p-3">
                <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-1">
                  {m.role === "candidate" ? "Coach" : m.stakeholder_name} · {m.phase}
                </div>
                <p className="text-sm whitespace-pre-wrap">{m.content}</p>
              </div>
            ))
          )}
        </div>
      </div>
      <div>
        <SectionLabel>Live playbook facilitation (Step 4)</SectionLabel>
        {cells.length === 0 ? (
          <p className="text-sm text-muted-foreground">No cells captured.</p>
        ) : (
          <div className="border border-ink divide-y divide-ink">
            {cells.map((c) => (
              <div key={c.key} className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs font-medium">{c.key}</div>
                  <div className="flex gap-2">
                    <span className="text-[10px] uppercase tracking-[0.12em] px-2 py-0.5 border border-ink">
                      evidence: {c.confidence}
                    </span>
                    {c.ambiguity && (
                      <span className="text-[10px] uppercase tracking-[0.12em] px-2 py-0.5 border border-ink" style={{ backgroundColor: "var(--brand-yellow, #f5d547)" }}>
                        unresolved
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                  {typeof c.value === "string" ? c.value || "(blank)" : JSON.stringify(c.value)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
      <CandidateBlock label="Next-step judgment (Step 5)" value={session.intervention_recommendation} />
      <div>
        <SectionLabel>Engagement orchestration (Step 6)</SectionLabel>
        <CandidateBlock label="01 — Current situation" value={pa.situation_summary} compact />
        <CandidateBlock label="02 — Immediate intervention" value={pa.immediate_intervention} compact />
        <CandidateBlock label="03 — Pathway" value={pa.pathway} compact />
        <CandidateBlock label="04 — Risks" value={pa.risks} compact />
        <CandidateBlock label="05 — Success criteria" value={pa.success_criteria} compact />
      </div>
    </div>
  );
}

function RubricTab({ sections, raw }: { sections: Record<string, any>; raw: any }) {
  const hasAny = Object.keys(sections).length > 0;
  if (!hasAny) return <p className="text-sm text-muted-foreground">No rubric scoring yet.</p>;
  return (
    <div className="space-y-4">
      {raw?.reviewer_focus && (
        <div className="border border-ink p-4" style={{ backgroundColor: "var(--brand-cyan)" }}>
          <SectionLabel>Reviewer focus</SectionLabel>
          <p className="text-sm">{raw.reviewer_focus}</p>
        </div>
      )}
      {SECTION_RUBRIC.map((sec) => {
        const sx = sections[sec.key];
        if (!sx) return null;
        return (
          <article key={sec.key} className="border border-ink">
            <header className="hairline-b p-4 flex flex-wrap items-center justify-between gap-3" style={{ backgroundColor: "var(--secondary)" }}>
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{sec.step}</div>
                <h3 className="text-base mt-0.5">{sec.label}</h3>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {sx.reviewer_flag && (
                  <span className="text-[10px] uppercase tracking-[0.12em] px-2 py-0.5 border border-ink" style={{ backgroundColor: "var(--brand-yellow, #f5d547)" }}>
                    Flagged
                  </span>
                )}
                {sx.confidence && (
                  <span className="text-[10px] uppercase tracking-[0.12em] px-2 py-0.5 border border-ink">
                    conf: {sx.confidence}
                  </span>
                )}
                {sx.verdict && (
                  <span className="text-[10px] uppercase tracking-[0.12em] px-2 py-0.5 border border-ink">
                    {sx.verdict}
                  </span>
                )}
                <ScoreBar score={sx.score ?? 0} />
              </div>
            </header>
            <div className="p-4 grid md:grid-cols-3 gap-5 text-sm">
              <div>
                <SectionLabel>Evidence</SectionLabel>
                <p className="leading-relaxed">{sx.evidence ?? "—"}</p>
              </div>
              <div>
                <SectionLabel>Strengths</SectionLabel>
                <ul className="space-y-1.5">
                  {(sx.strengths ?? []).map((s: string, i: number) => (
                    <li key={i} className="flex gap-2"><span className="text-muted-foreground">+</span><span>{s}</span></li>
                  ))}
                </ul>
              </div>
              <div>
                <SectionLabel>Gaps</SectionLabel>
                <ul className="space-y-1.5">
                  {(sx.gaps ?? []).map((s: string, i: number) => (
                    <li key={i} className="flex gap-2"><span className="text-muted-foreground">−</span><span>{s}</span></li>
                  ))}
                </ul>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function SkillsList({ items, emptyHint }: { items: any[]; emptyHint: string }) {
  if (!items || items.length === 0) return <p className="text-sm text-muted-foreground">{emptyHint}</p>;
  return (
    <div className="space-y-3">
      {items.map((it: any, i: number) => (
        <article key={i} className="border border-ink p-4">
          <header className="flex items-center justify-between gap-3 mb-2">
            <h3 className="text-sm font-medium">{it.label ?? it.key}</h3>
            <RatingPill rating={it.rating} />
          </header>
          <p className="text-sm mb-2">{it.explanation}</p>
          {it.evidence && (
            <p className="text-xs text-muted-foreground border-l-2 border-ink pl-3 italic">{it.evidence}</p>
          )}
        </article>
      ))}
    </div>
  );
}

function DecisionTab(props: {
  evaluation: any;
  raw: any;
  reviewerName: string; setReviewerName: (v: string) => void;
  reviewerNotes: string; setReviewerNotes: (v: string) => void;
  internalNotes: string; setInternalNotes: (v: string) => void;
  coachFeedback: string; setCoachFeedback: (v: string) => void;
  onSubmit: (d: string) => void;
  submitting: boolean;
}) {
  const { evaluation, raw } = props;
  const DECISIONS = [
    { k: "approved", l: "Approved" },
    { k: "conditional_approval", l: "Conditional approval" },
    { k: "retry_required", l: "Retry required" },
    { k: "not_approved", l: "Not approved" },
    { k: "escalate", l: "Escalate to senior reviewer" },
  ];

  return (
    <div className="space-y-6">
      {/* AI advisory */}
      <div className="border border-ink p-5" style={{ backgroundColor: REC_COLOR[evaluation?.recommendation] ?? "transparent" }}>
        <div className="flex items-center justify-between gap-3 mb-2">
          <SectionLabel>AI advisory recommendation</SectionLabel>
          {raw?.confidence && <span className="text-[10px] uppercase tracking-[0.12em]">confidence: {raw.confidence}</span>}
        </div>
        <div className="text-lg font-medium">{REC_LABEL[evaluation?.recommendation] ?? "Pending"}</div>
        {raw?.recommendation_rationale && <p className="text-sm mt-2">{raw.recommendation_rationale}</p>}
        {raw?.calibration_notes && (
          <div className="mt-3 text-xs opacity-80 border-t border-ink/30 pt-2">
            <strong>Calibration:</strong> {raw.calibration_notes}
          </div>
        )}
        <div className="text-[10px] uppercase tracking-[0.12em] mt-3 opacity-70">Advisory only — you make the call below.</div>
      </div>

      {/* Reviewer name */}
      <div>
        <SectionLabel>Reviewer name</SectionLabel>
        <input
          value={props.reviewerName}
          onChange={(e) => props.setReviewerName(e.target.value)}
          placeholder="Your name"
          className="w-full border border-ink bg-paper p-2 text-sm focus:outline-none focus:bg-secondary"
        />
      </div>

      {/* Coach feedback (editable) */}
      <div>
        <SectionLabel>Coach-facing feedback (editable)</SectionLabel>
        <p className="text-xs text-muted-foreground mb-2">Draft generated by AI. Edit freely before sending.</p>
        <div className="relative">
          <textarea
            rows={14}
            value={props.coachFeedback}
            onChange={(e) => props.setCoachFeedback(e.target.value)}
            placeholder="What you did well / Where to improve / Methodology guidance / Facilitation guidance / Recommended next step"
            className="w-full border border-ink bg-paper p-3 pr-12 text-sm font-mono focus:outline-none focus:bg-secondary"
          />
          <div className="absolute top-2 right-2">
            <VoiceInput onTranscript={(c) => props.setCoachFeedback(appendTranscript(props.coachFeedback, c))} />
          </div>
        </div>
      </div>

      {/* Reviewer notes */}
      <div>
        <SectionLabel>Reviewer notes (visible alongside decision)</SectionLabel>
        <div className="relative">
          <textarea
            rows={4}
            value={props.reviewerNotes}
            onChange={(e) => props.setReviewerNotes(e.target.value)}
            placeholder="Reasoning behind your decision, calibration vs AI, developmental notes…"
            className="w-full border border-ink bg-paper p-3 pr-12 text-sm focus:outline-none focus:bg-secondary"
          />
          <div className="absolute top-2 right-2">
            <VoiceInput onTranscript={(c) => props.setReviewerNotes(appendTranscript(props.reviewerNotes, c))} />
          </div>
        </div>
      </div>

      {/* Internal notes */}
      <div>
        <SectionLabel>Private internal notes (reviewers only)</SectionLabel>
        <textarea
          rows={3}
          value={props.internalNotes}
          onChange={(e) => props.setInternalNotes(e.target.value)}
          placeholder="Not shared with the coach. Patterns, escalation context, calibration concerns…"
          className="w-full border border-ink bg-paper p-3 text-sm focus:outline-none focus:bg-secondary"
        />
      </div>

      {/* Final decision */}
      <div>
        <SectionLabel>Final decision</SectionLabel>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {DECISIONS.map((d) => (
            <button
              key={d.k}
              onClick={() => props.onSubmit(d.k)}
              disabled={props.submitting}
              className="p-3 border border-ink text-sm text-left"
              style={{ backgroundColor: DECISION_COLOR[d.k] }}
            >
              <div className="font-medium">{d.l}</div>
            </button>
          ))}
        </div>
        {evaluation?.reviewer_decision && (
          <p className="mt-3 text-xs text-muted-foreground">
            Current decision: <strong>{DECISION_LABEL[evaluation.reviewer_decision] ?? evaluation.reviewer_decision}</strong>
            {evaluation.reviewer_name && ` · by ${evaluation.reviewer_name}`}
            {evaluation.reviewed_at && ` · ${new Date(evaluation.reviewed_at).toLocaleString()}`}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-2">Click a decision to submit final review. AI never certifies autonomously.</p>
      </div>
    </div>
  );
}

// ────────────────────────────── small bits ─────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-2">{children}</div>;
}
function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <p className="text-sm leading-relaxed">{value || <span className="text-muted-foreground">—</span>}</p>
    </div>
  );
}
function ListField({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">—</p>
      ) : (
        <ul className="space-y-1">
          {items.map((it, i) => (
            <li key={i} className="text-sm flex gap-2"><span className="text-muted-foreground">·</span><span>{it}</span></li>
          ))}
        </ul>
      )}
    </div>
  );
}
function CandidateBlock({ label, value, compact }: { label: string; value: string | null | undefined; compact?: boolean }) {
  return (
    <div className={compact ? "mb-3" : ""}>
      <SectionLabel>{label}</SectionLabel>
      {value ? (
        <pre className="text-sm whitespace-pre-wrap font-sans border border-ink p-3 bg-paper">{value}</pre>
      ) : (
        <p className="text-sm text-muted-foreground">(empty)</p>
      )}
    </div>
  );
}
function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className="w-4 h-4 border border-ink" style={{ backgroundColor: n <= score ? "var(--brand-blue, #6366f1)" : "transparent" }} />
      ))}
      <span className="text-xs ml-1">{score}/5</span>
    </div>
  );
}
