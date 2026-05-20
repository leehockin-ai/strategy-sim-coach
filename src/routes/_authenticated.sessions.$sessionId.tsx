import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useMemo, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Shell } from "@/components/Shell";
import { getSession, updateSession, sendStakeholderMessage, suggestPlaybook, sendScopingTurn, extractFraming } from "@/lib/simulator.functions";
import { synthesizeVoice } from "@/lib/voice.functions";
import { voiceForStakeholder } from "@/lib/voices";
import { generateEvaluation } from "@/lib/evaluation.functions";
import { VoiceInput, appendTranscript } from "@/components/VoiceInput";
import { PLAYBOOKS, STRATEGYZER_LIBRARY_URL, ENGAGEMENT_MODELS } from "@/lib/playbooks";

export const Route = createFileRoute("/_authenticated/sessions/$sessionId")({
  head: () => ({
    meta: [{ title: "Session · Strategyzer Coach Certification" }],
  }),
  component: SessionPage,
});

type Step = "framing" | "method" | "dialogue" | "intervention";

const STEPS: { key: Step; label: string }[] = [
  { key: "framing", label: "Framing" },
  { key: "method", label: "Method" },
  { key: "dialogue", label: "Dialogue" },
  { key: "intervention", label: "Intervention" },
];

function SessionPage() {
  const { sessionId } = Route.useParams();
  const fetchSession = useServerFn(getSession);
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["session", sessionId],
    queryFn: () => fetchSession({ data: { sessionId } }),
  });

  const [step, setStep] = useState<Step>("framing");

  if (isLoading || !data) {
    return <Shell><div className="p-10 text-sm text-muted-foreground">Loading session…</div></Shell>;
  }

  const session: any = data.session;
  const scenario = session.scenarios;

  return (
    <Shell>
      <ScenarioHeader scenario={scenario} session={session} />
      <StepNav step={step} onChange={setStep} />
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-10">
        {step === "framing" && <FramingStep session={session} onSaved={() => { refetch(); setStep("method"); }} />}
        {step === "method" && <MethodStep session={session} onSaved={() => { refetch(); setStep("dialogue"); }} />}
        {step === "dialogue" && <DialogueStep session={session} messages={data.messages} onRefresh={refetch} onContinue={() => setStep("intervention")} />}
        {step === "intervention" && <InterventionStep session={session} onSaved={refetch} />}
      </div>
    </Shell>
  );
}

function ScenarioHeader({ scenario, session }: { scenario: any; session: any }) {
  return (
    <section className="hairline-b" style={{ backgroundColor: "var(--brand-blue)" }}>
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-10 text-paper">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs uppercase tracking-[0.14em] opacity-70 marker-num">
            Session · {session.id.slice(0, 8)}
          </span>
          <span className="text-xs uppercase tracking-[0.14em] opacity-70">{scenario.industry}</span>
        </div>
        <h1 className="text-3xl md:text-5xl tracking-tight font-medium mb-4">{scenario.title}</h1>
        <p className="max-w-3xl opacity-90 leading-relaxed">{scenario.context}</p>
        <div className="mt-6 grid md:grid-cols-3 gap-4">
          {(scenario.stakeholders as any[]).map((s) => (
            <div key={s.name} className="border border-paper/40 p-4">
              <div className="text-xs uppercase opacity-70 mb-1">{s.role}</div>
              <div className="font-medium mb-2">{s.name}</div>
              <p className="text-sm opacity-80 leading-relaxed">{s.posture}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StepNav({ step, onChange }: { step: Step; onChange: (s: Step) => void }) {
  return (
    <div className="hairline-b sticky top-0 bg-paper z-30">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="flex">
          {STEPS.map((s, i) => {
            const active = s.key === step;
            return (
              <button
                key={s.key}
                onClick={() => onChange(s.key)}
                className={`flex-1 py-4 text-left border-r border-ink last:border-r-0 px-4 transition-colors ${active ? "bg-ink text-paper" : "hover:bg-secondary"}`}
              >
                <div className="flex items-baseline gap-3">
                  <span className="marker-num text-xs opacity-70">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-sm font-medium">{s.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StepShell({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="grid md:grid-cols-12 gap-10">
      <div className="md:col-span-4">
        <h2 className="text-2xl tracking-tight mb-3">{title}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{hint}</p>
      </div>
      <div className="md:col-span-8">{children}</div>
    </div>
  );
}

// ---------- Framing: Strategyzer Scoping Conversation ----------

const SCOPING_FIELDS: { key: string; label: string; hint: string }[] = [
  { key: "decision", label: "Decision in the next 90 days", hint: "The single decision the team needs to make. E.g. 'Which customer problem should we focus on?'" },
  { key: "unclear", label: "What is currently unclear?", hint: "Where the ambiguity lives — strategy, customer, value, model." },
  { key: "tried", label: "What have you already tried?", hint: "Past attempts, frameworks, experiments, conversations." },
  { key: "nothing", label: "What happens if you do nothing?", hint: "Cost of inaction — surfaces real urgency." },
  { key: "success", label: "What would success look like after this engagement?", hint: "Concrete artifact, decision, or experiment." },
];

function parseFraming(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
  } catch { /* legacy plain text */ }
  return { decision: raw };
}

function FramingStep({ session, onSaved }: { session: any; onSaved: () => void }) {
  const initial = parseFraming(session.framing_notes);
  const [fields, setFields] = useState<Record<string, string>>(initial);
  const save = useServerFn(updateSession);
  const mut = useMutation({
    mutationFn: () => save({ data: { sessionId: session.id, framingNotes: JSON.stringify(fields), status: "framing" } }),
    onSuccess: () => { toast.success("Scoping saved"); onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });

  const filledCount = SCOPING_FIELDS.filter((f) => fields[f.key]?.trim()).length;
  const canSave = filledCount >= 3 && !!fields.decision?.trim();

  return (
    <StepShell
      title="Scoping conversation"
      hint="The goal of scoping (per Strategyzer): clarify the decision, diagnose the core problem, select the correct playbook, define the engagement outcome. Work through these five prompts as if the team were on the call."
    >
      <div className="space-y-5">
        {SCOPING_FIELDS.map((f, i) => (
          <div key={f.key}>
            <label className="flex items-baseline justify-between mb-1">
              <span className="text-xs uppercase tracking-[0.12em]">
                <span className="marker-num opacity-60 mr-2">{String(i + 1).padStart(2, "0")}</span>
                {f.label}
              </span>
              {fields[f.key]?.trim() && <span className="chip" style={{ backgroundColor: "var(--brand-yellow)" }}>captured</span>}
            </label>
            <p className="text-[11px] text-muted-foreground mb-1.5">{f.hint}</p>
            <div className="relative">
              <textarea
                value={fields[f.key] ?? ""}
                onChange={(e) => setFields((p) => ({ ...p, [f.key]: e.target.value }))}
                rows={f.key === "decision" ? 2 : 3}
                className="w-full border border-ink bg-paper p-3 pr-10 text-sm focus:outline-none focus:bg-secondary"
              />
              <div className="absolute top-1.5 right-1.5">
                <VoiceInput onTranscript={(c) => setFields((p) => ({ ...p, [f.key]: appendTranscript(p[f.key] ?? "", c) }))} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{filledCount}/5 prompts captured</span>
        <button onClick={() => mut.mutate()} disabled={mut.isPending || !canSave} className="bg-ink text-paper px-5 py-2 text-sm rounded-sm disabled:opacity-50">
          {mut.isPending ? "Saving…" : "Save & diagnose playbook →"}
        </button>
      </div>
    </StepShell>
  );
}

// ---------- Method: Playbook diagnosis & selection ----------

function MethodStep({ session, onSaved }: { session: any; onSaved: () => void }) {
  const [choice, setChoice] = useState<string>(session.methodology_choice ?? "");
  const [rationale, setRationale] = useState<string>(session.methodology_rationale ?? "");
  const [engagement, setEngagement] = useState<string>(ENGAGEMENT_MODELS[0].id);
  const [suggestion, setSuggestion] = useState<any>(null);
  const save = useServerFn(updateSession);
  const suggest = useServerFn(suggestPlaybook);

  const suggestMut = useMutation({
    mutationFn: () => suggest({ data: { sessionId: session.id } }),
    onSuccess: (res) => setSuggestion(res.suggestion),
    onError: (e: any) => toast.error(e.message ?? "Could not generate suggestion"),
  });

  const mut = useMutation({
    mutationFn: () => save({ data: {
      sessionId: session.id,
      methodologyChoice: `${choice}::${engagement}`,
      methodologyRationale: rationale,
      status: "method",
    } }),
    onSuccess: () => { toast.success("Playbook selected"); onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });

  const selectedPb = PLAYBOOKS.find((p) => p.id === choice);

  return (
    <StepShell
      title="Diagnose & select playbook"
      hint="Strategyzer's scoping logic: every project falls into one dominant category. Pick one primary playbook — don't mix unless the problem clearly shifts."
    >
      <div className="mb-6 p-4 border border-ink flex items-start justify-between gap-4" style={{ backgroundColor: "var(--brand-yellow)" }}>
        <div className="text-sm">
          <div className="font-medium mb-1">AI diagnostic assist</div>
          <div className="text-xs opacity-80">Have the AI review your scoping notes and recommend a playbook — then form your own call.</div>
        </div>
        <button
          onClick={() => suggestMut.mutate()}
          disabled={suggestMut.isPending}
          className="bg-ink text-paper px-3 py-1.5 text-xs rounded-sm disabled:opacity-50 shrink-0"
        >
          {suggestMut.isPending ? "Diagnosing…" : "Suggest playbook"}
        </button>
      </div>

      {suggestion && (
        <div className="mb-6 border border-ink p-4 bg-secondary">
          <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-2">AI recommendation · confidence {suggestion.confidence ?? "—"}</div>
          <div className="font-medium mb-1">
            → {PLAYBOOKS.find((p) => p.id === suggestion.playbookId)?.name ?? suggestion.playbookId ?? "(no match)"}
          </div>
          <p className="text-sm leading-relaxed mb-2">{suggestion.rationale}</p>
          {Array.isArray(suggestion.watchouts) && suggestion.watchouts.length > 0 && (
            <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
              {suggestion.watchouts.map((w: string, i: number) => <li key={i}>{w}</li>)}
            </ul>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-3 mb-6">
        {PLAYBOOKS.map((p) => {
          const active = choice === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setChoice(p.id)}
              className={`text-left border border-ink p-4 transition-colors ${active ? "bg-ink text-paper" : "hover:bg-secondary"}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="w-8 h-8 border border-current" style={{ backgroundColor: p.accent }} />
                <span className="text-[10px] uppercase tracking-[0.14em] opacity-70">{p.diagnosis}</span>
              </div>
              <div className="font-medium mb-1">{p.name}</div>
              <p className="text-xs opacity-80 italic mb-2">"{p.whenToUse}"</p>
              <ul className="text-[11px] opacity-70 space-y-0.5">
                {p.signals.map((s) => <li key={s}>· {s}</li>)}
              </ul>
              <div className="text-[10px] uppercase tracking-[0.14em] opacity-60 mt-3">Outcome → {p.outcome}</div>
            </button>
          );
        })}
      </div>

      {selectedPb && (
        <a
          href={selectedPb.libraryUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-xs underline mb-6 hover:opacity-70"
        >
          Open "{selectedPb.name}" in Strategyzer playbook library ↗
        </a>
      )}

      <label className="text-xs uppercase tracking-[0.12em] mb-2 block">Engagement model</label>
      <div className="grid md:grid-cols-2 gap-2 mb-6">
        {ENGAGEMENT_MODELS.map((m) => {
          const active = engagement === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setEngagement(m.id)}
              className={`text-left border border-ink p-3 ${active ? "bg-ink text-paper" : "hover:bg-secondary"}`}
            >
              <div className="text-sm font-medium mb-1">{m.name}</div>
              <div className="text-[11px] opacity-80 mb-1"><span className="uppercase tracking-wider opacity-70">Best for:</span> {m.bestFor}</div>
              <div className="text-[11px] opacity-80"><span className="uppercase tracking-wider opacity-70">Structure:</span> {m.structure}</div>
            </button>
          );
        })}
      </div>

      <label className="text-xs uppercase tracking-[0.12em] mb-1 block">Rationale</label>
      <div className="relative">
        <textarea
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          rows={5}
          placeholder="Why this playbook for this team, right now. What scoping signal pointed here. What would change your mind."
          className="w-full border border-ink bg-paper p-4 pr-12 text-sm focus:outline-none focus:bg-secondary"
        />
        <div className="absolute top-2 right-2">
          <VoiceInput onTranscript={(c) => setRationale((p) => appendTranscript(p, c))} />
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <button onClick={() => mut.mutate()} disabled={mut.isPending || !choice || !rationale.trim()} className="bg-ink text-paper px-5 py-2 text-sm rounded-sm disabled:opacity-50">
          {mut.isPending ? "Saving…" : "Save & open dialogue →"}
        </button>
      </div>
    </StepShell>
  );
}

function DialogueStep({ session, messages, onRefresh, onContinue }: { session: any; messages: any[]; onRefresh: () => void; onContinue: () => void }) {
  const scenario = session.scenarios;
  const stakeholders: any[] = scenario.stakeholders ?? [];
  const [target, setTarget] = useState<string>(stakeholders[0]?.name ?? "");
  const [text, setText] = useState("");
  const send = useServerFn(sendStakeholderMessage);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () => messages.filter((m) => m.stakeholder_name === target),
    [messages, target]
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [filtered.length]);

  const mut = useMutation({
    mutationFn: () => send({ data: { sessionId: session.id, stakeholderName: target, candidateMessage: text } }),
    onSuccess: () => { setText(""); onRefresh(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="grid md:grid-cols-12 gap-6">
      <aside className="md:col-span-3">
        <h3 className="text-xs uppercase tracking-[0.12em] mb-3">Stakeholders</h3>
        <div className="space-y-1">
          {stakeholders.map((s) => (
            <button
              key={s.name}
              onClick={() => setTarget(s.name)}
              className={`w-full text-left p-3 border border-ink ${target === s.name ? "bg-ink text-paper" : "hover:bg-secondary"}`}
            >
              <div className="text-sm font-medium">{s.name}</div>
              <div className="text-xs opacity-70">{s.role}</div>
            </button>
          ))}
        </div>
        <button onClick={onContinue} className="mt-6 w-full border border-ink py-2 text-sm hover:bg-secondary">
          Move to intervention →
        </button>
      </aside>

      <div className="md:col-span-9 border border-ink flex flex-col min-h-[60vh]">
        <div className="hairline-b px-5 py-3 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Talking to</div>
            <div className="font-medium">{target}</div>
          </div>
          <span className="chip">Live simulation</span>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[55vh]">
          {filtered.length === 0 && (
            <div className="text-sm text-muted-foreground italic">
              Open the conversation. What do you want to learn first from {target}?
            </div>
          )}
          {filtered.map((m) => (
            <div key={m.id} className={`flex ${m.role === "candidate" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] p-3 text-sm leading-relaxed ${
                m.role === "candidate"
                  ? "bg-ink text-paper"
                  : "border border-ink bg-secondary"
              }`}>
                <div className="text-[10px] uppercase tracking-[0.12em] opacity-70 mb-1">
                  {m.role === "candidate" ? "Coach" : m.stakeholder_name}
                </div>
                <div>{m.content}</div>
              </div>
            </div>
          ))}
          {mut.isPending && <div className="text-xs text-muted-foreground italic">{target} is thinking…</div>}
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); if (text.trim() && !mut.isPending) mut.mutate(); }}
          className="hairline border-t p-3 flex gap-2"
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Say something to ${target}…`}
            className="flex-1 border border-ink bg-paper px-3 py-2 text-sm focus:outline-none focus:bg-secondary"
          />
          <VoiceInput onTranscript={(c) => setText((p) => appendTranscript(p, c))} className="!h-auto self-stretch !w-9" />
          <button type="submit" disabled={mut.isPending || !text.trim()} className="bg-ink text-paper px-4 text-sm rounded-sm disabled:opacity-50">
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

function InterventionStep({ session, onSaved }: { session: any; onSaved: () => void }) {
  const navigate = useNavigate();
  const [rec, setRec] = useState<string>(session.intervention_recommendation ?? "");
  const [decision, setDecision] = useState(session.decision ?? "");
  const save = useServerFn(updateSession);
  const evalFn = useServerFn(generateEvaluation);

  const submit = useMutation({
    mutationFn: async () => {
      await save({ data: { sessionId: session.id, interventionRecommendation: rec, decision, status: "evaluating" } });
      await evalFn({ data: { sessionId: session.id } });
    },
    onSuccess: () => {
      toast.success("Evaluation generated");
      onSaved();
      navigate({ to: "/sessions/$sessionId/report", params: { sessionId: session.id } });
    },
    onError: (e: any) => toast.error(e.message ?? "Evaluation failed"),
  });

  const decisions = [
    { v: "continue", l: "Continue", c: "var(--brand-lime)" },
    { v: "pivot", l: "Pivot", c: "var(--brand-cyan)" },
    { v: "escalate", l: "Escalate", c: "var(--brand-purple)" },
    { v: "stop", l: "Stop", c: "var(--brand-red)" },
  ];

  return (
    <StepShell
      title="Recommend & decide"
      hint="What's the next concrete step you'd recommend? Then make the call: continue, pivot, escalate, or stop. Submitting locks the session and triggers AI evaluation."
    >
      <label className="text-xs uppercase tracking-[0.12em] mb-1 block">Next-best action</label>
      <div className="relative">
        <textarea
          value={rec}
          onChange={(e) => setRec(e.target.value)}
          rows={8}
          placeholder="What exactly happens next? Who, what, by when. What evidence are you trying to generate?"
          className="w-full border border-ink bg-paper p-4 pr-12 text-sm focus:outline-none focus:bg-secondary font-mono"
        />
        <div className="absolute top-2 right-2">
          <VoiceInput onTranscript={(c) => setRec((p) => appendTranscript(p, c))} />
        </div>
      </div>

      <label className="text-xs uppercase tracking-[0.12em] mt-6 mb-2 block">Your call</label>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {decisions.map((d) => (
          <button
            key={d.v}
            onClick={() => setDecision(d.v)}
            className={`p-4 border border-ink text-left ${decision === d.v ? "bg-ink text-paper" : "hover:bg-secondary"}`}
          >
            <div className="w-3 h-3 mb-2 border border-current" style={{ backgroundColor: d.c }} />
            <div className="text-sm font-medium">{d.l}</div>
          </button>
        ))}
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={() => submit.mutate()}
          disabled={submit.isPending || !rec.trim() || !decision}
          className="bg-ink text-paper px-6 py-3 text-sm font-medium rounded-sm disabled:opacity-50"
        >
          {submit.isPending ? "Generating evaluation…" : "Submit & generate evaluation →"}
        </button>
      </div>
    </StepShell>
  );
}
