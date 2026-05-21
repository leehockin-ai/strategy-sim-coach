import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useMemo, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Shell } from "@/components/Shell";
import { getSession, updateSession, sendStakeholderMessage, suggestPlaybook, sendScopingTurn, extractFraming, suggestCanvasCell, saveCanvas, sendPlaybookTeamTurn } from "@/lib/simulator.functions";
import { synthesizeVoice } from "@/lib/voice.functions";
import { voiceForStakeholder } from "@/lib/voices";
import { generateEvaluation } from "@/lib/evaluation.functions";
import { savePlaybookApplication } from "@/lib/playbook.functions";
import { supabase } from "@/integrations/supabase/client";
import { VoiceInput, appendTranscript } from "@/components/VoiceInput";
import { PLAYBOOKS, STRATEGYZER_LIBRARY_URL, ENGAGEMENT_MODELS, canvasForPlaybook, BUILTIN_PLAYBOOK } from "@/lib/playbooks";


export const Route = createFileRoute("/_authenticated/sessions/$sessionId")({
  head: () => ({
    meta: [{ title: "Session · Strategyzer Coach Certification" }],
  }),
  component: SessionPage,
});

type Step = "framing" | "method" | "dialogue" | "application" | "intervention" | "playbook";

const STEPS: { key: Step; label: string }[] = [
  { key: "framing", label: "Framing" },
  { key: "method", label: "Method" },
  { key: "dialogue", label: "Dialogue" },
  { key: "application", label: "Canvas" },
  { key: "intervention", label: "Intervention" },
  { key: "playbook", label: "Playbook Application" },
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
        {step === "framing" && <FramingStep session={session} messages={data.messages} onSaved={() => { refetch(); setStep("method"); }} onRefresh={refetch} />}
        {step === "method" && <MethodStep session={session} onSaved={() => { refetch(); setStep("dialogue"); }} />}
        {step === "dialogue" && <DialogueStep session={session} messages={data.messages} onRefresh={refetch} onContinue={() => setStep("application")} />}
        {step === "application" && <ApplicationStep session={session} onSaved={() => { refetch(); setStep("intervention"); }} />}
        {step === "intervention" && <InterventionStep session={session} onSaved={() => { refetch(); setStep("playbook"); }} />}
        {step === "playbook" && <PlaybookStep session={session} messages={data.messages} onSaved={refetch} />}
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

function stakeholderColor(i: number) {
  const palette = ["var(--brand-blue)", "var(--brand-yellow)", "var(--brand-lime)", "var(--brand-cyan)", "var(--brand-purple)", "var(--brand-red)"];
  return palette[i % palette.length];
}

function initials(name: string) {
  return name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function speakWithBrowser(text: string, onEnd?: () => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onEnd?.();
    return;
  }
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1; u.pitch = 1; u.lang = "en-US";
    u.onend = () => onEnd?.();
    u.onerror = () => onEnd?.();
    window.speechSynthesis.speak(u);
  } catch { onEnd?.(); }
}

function VideoTile({
  name, role, color, speaking, muted, isCoach,
}: { name: string; role: string; color: string; speaking: boolean; muted: boolean; isCoach?: boolean }) {
  // Idle "breathing" oscillation + speaking waveform handled via CSS keyframes in styles.css
  return (
    <div className={`relative aspect-video border border-ink overflow-hidden bg-ink ${speaking ? "tile-speaking" : ""}`}>
      {/* soft gradient backdrop when speaking */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at 50% 45%, ${color}33 0%, transparent 65%)`,
          opacity: speaking ? 1 : 0,
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          {/* pulsing rings when speaking */}
          {speaking && (
            <>
              <span className="absolute inset-0 rounded-full animate-ring" style={{ boxShadow: `0 0 0 2px ${color}` }} />
              <span className="absolute inset-0 rounded-full animate-ring [animation-delay:0.6s]" style={{ boxShadow: `0 0 0 2px ${color}` }} />
            </>
          )}
          <div
            className={`relative w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-paper flex items-center justify-center text-xl font-medium ${speaking ? "animate-talk" : "animate-breathe"}`}
            style={{ backgroundColor: color, color: "var(--ink)" }}
          >
            {isCoach ? "YOU" : initials(name)}
          </div>
        </div>
      </div>

      {/* equalizer waveform along bottom edge */}
      <div className="absolute bottom-7 left-1/2 -translate-x-1/2 flex items-end gap-[3px] h-5 pointer-events-none">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <span
            key={i}
            className={speaking ? "animate-wave" : ""}
            style={{
              width: 3,
              height: speaking ? "100%" : 3,
              backgroundColor: color,
              animationDelay: `${i * 0.09}s`,
              opacity: speaking ? 1 : 0.25,
              transition: "height 0.2s, opacity 0.3s",
            }}
          />
        ))}
      </div>

      <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 flex items-center justify-between text-paper text-xs bg-ink/80 backdrop-blur-sm">
        <span className="font-medium truncate flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${speaking ? "bg-green-400 animate-pulse" : "bg-paper/40"}`} />
          {name}
        </span>
        <span className="opacity-60 truncate ml-2 hidden sm:inline">{role}</span>
        {muted && <span className="ml-1 text-[10px] uppercase tracking-wider opacity-80">● muted</span>}
      </div>
    </div>
  );
}

function FramingStep({
  session, messages, onSaved, onRefresh,
}: { session: any; messages: any[]; onSaved: () => void; onRefresh: () => void }) {
  const scenario = session.scenarios;
  const stakeholders: Array<{ name: string; role: string; posture: string }> = scenario.stakeholders ?? [];
  const scopingMessages = useMemo(() => messages.filter((m) => m.phase === "scoping"), [messages]);

  const [text, setText] = useState("");
  const [speakingName, setSpeakingName] = useState<string | null>(null);
  const [callEnded, setCallEnded] = useState(!!session.framing_notes);
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const [gaps, setGaps] = useState<string[]>([]);
  const [reviewing, setReviewing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sendTurn = useServerFn(sendScopingTurn);
  const tts = useServerFn(synthesizeVoice);
  const extract = useServerFn(extractFraming);
  const save = useServerFn(updateSession);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [scopingMessages.length]);

  async function playReply(name: string, content: string) {
    const voiceId = voiceForStakeholder(stakeholders, name);
    setSpeakingName(name);
    try {
      const res = await tts({ data: { text: content, voiceId } });
      if (res.audio && !res.fallback) {
        const a = new Audio(`data:audio/mpeg;base64,${res.audio}`);
        audioRef.current?.pause();
        audioRef.current = a;
        a.onended = () => setSpeakingName(null);
        a.onerror = () => setSpeakingName(null);
        await a.play();
        return;
      }
      // Fallback: browser SpeechSynthesis
      speakWithBrowser(content, () => setSpeakingName(null));
    } catch (e: any) {
      // Last-resort fallback so the call doesn't break
      speakWithBrowser(content, () => setSpeakingName(null));
    }
  }

  const turnMut = useMutation({
    mutationFn: (msg: string) => sendTurn({ data: { sessionId: session.id, candidateMessage: msg } }),
    onSuccess: async (res) => {
      setText("");
      onRefresh();
      const reply = res.stakeholderMessage;
      if (reply?.stakeholder_name) await playReply(reply.stakeholder_name, reply.content);
    },
    onError: (e: any) => toast.error(e?.message ?? "Turn failed"),
  });

  const extractMut = useMutation({
    mutationFn: () => extract({ data: { sessionId: session.id } }),
    onSuccess: (res) => {
      const d = res.draft ?? {};
      setDraft({
        decision: d.decision ?? "",
        unclear: d.unclear ?? "",
        tried: d.tried ?? "",
        nothing: d.nothing ?? "",
        success: d.success ?? "",
      });
      setGaps(Array.isArray(d.gaps) ? d.gaps : []);
      setReviewing(true);
      setCallEnded(true);
    },
    onError: (e: any) => toast.error(e?.message ?? "Extraction failed"),
  });

  const saveMut = useMutation({
    mutationFn: () => save({ data: { sessionId: session.id, framingNotes: JSON.stringify(draft ?? {}), status: "framing" } }),
    onSuccess: () => { toast.success("Framing locked"); onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t || turnMut.isPending) return;
    turnMut.mutate(t);
  }

  // ----- Review screen after extracting framing -----
  if (reviewing && draft) {
    return (
      <StepShell
        title="Review the framing"
        hint="The AI drafted these scoping fields from your call. Edit anything that's off, then lock it in. Empty fields mean you didn't surface that in the call — go back and ask if needed."
      >
        {gaps.length > 0 && (
          <div className="mb-4 border border-ink p-3 text-xs" style={{ backgroundColor: "var(--brand-yellow)" }}>
            <div className="uppercase tracking-[0.12em] mb-1 font-medium">Coaching note</div>
            <ul className="list-disc pl-4 space-y-0.5">{gaps.map((g, i) => <li key={i}>{g}</li>)}</ul>
          </div>
        )}
        <div className="space-y-4">
          {SCOPING_FIELDS.map((f, i) => (
            <div key={f.key}>
              <label className="text-xs uppercase tracking-[0.12em] flex items-baseline gap-2">
                <span className="marker-num opacity-60">{String(i + 1).padStart(2, "0")}</span>
                {f.label}
              </label>
              <p className="text-[11px] text-muted-foreground mb-1.5">{f.hint}</p>
              <textarea
                value={draft[f.key] ?? ""}
                onChange={(e) => setDraft((p) => ({ ...(p ?? {}), [f.key]: e.target.value }))}
                rows={f.key === "decision" ? 2 : 3}
                className="w-full border border-ink bg-paper p-3 text-sm focus:outline-none focus:bg-secondary"
              />
            </div>
          ))}
        </div>
        <div className="mt-6 flex items-center justify-between">
          <button onClick={() => setReviewing(false)} className="text-xs underline">← Back to call</button>
          <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !draft.decision?.trim()} className="bg-ink text-paper px-5 py-2 text-sm rounded-sm disabled:opacity-50">
            {saveMut.isPending ? "Saving…" : "Lock framing & diagnose playbook →"}
          </button>
        </div>
      </StepShell>
    );
  }

  // ----- Live call screen -----
  return (
    <div className="grid lg:grid-cols-12 gap-6">
      <div className="lg:col-span-4">
        <h2 className="text-2xl tracking-tight mb-2">Scoping call</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          You're on a kick-off video call with the team. <strong>Lead the conversation</strong> — they won't volunteer the framing.
          Surface the decision, the ambiguity, what they've tried, the cost of inaction, and what success looks like.
        </p>
        <div className="border border-ink p-3 text-xs mb-4" style={{ backgroundColor: "var(--brand-yellow)" }}>
          <div className="uppercase tracking-[0.12em] font-medium mb-1">Five things to surface</div>
          <ol className="space-y-0.5 list-decimal pl-4">
            {SCOPING_FIELDS.map((f) => <li key={f.key}>{f.label}</li>)}
          </ol>
        </div>
        <button
          onClick={() => extractMut.mutate()}
          disabled={extractMut.isPending || scopingMessages.length < 2}
          className="w-full bg-ink text-paper py-2 text-sm rounded-sm disabled:opacity-40 mb-2"
        >
          {extractMut.isPending ? "Synthesizing call…" : callEnded ? "Re-extract framing draft" : "End call & extract framing →"}
        </button>
        <p className="text-[11px] text-muted-foreground">{scopingMessages.length} messages exchanged</p>
      </div>

      <div className="lg:col-span-8 space-y-4">
        {/* Video grid */}
        <div className="grid grid-cols-2 gap-2">
          {stakeholders.map((s, i) => (
            <VideoTile
              key={s.name}
              name={s.name}
              role={s.role}
              color={stakeholderColor(i)}
              speaking={speakingName === s.name}
              muted={false}
            />
          ))}
          <VideoTile name="You (Coach)" role="Strategyzer coach" color="var(--paper)" speaking={false} muted={!!speakingName} isCoach />
        </div>

        {/* Live transcript */}
        <div className="border border-ink">
          <div className="hairline-b px-4 py-2 flex items-center justify-between text-xs">
            <span className="uppercase tracking-[0.12em] text-muted-foreground">Live transcript</span>
            <span className="chip">● Recording</span>
          </div>
          <div ref={scrollRef} className="px-4 py-3 space-y-2 max-h-[28vh] overflow-y-auto text-sm">
            {scopingMessages.length === 0 && (
              <div className="text-muted-foreground italic">Open the call. Start by introducing yourself and asking what brought them to this engagement.</div>
            )}
            {scopingMessages.map((m) => (
              <div key={m.id} className={m.role === "candidate" ? "text-ink" : ""}>
                <span className="text-[10px] uppercase tracking-[0.12em] opacity-60 mr-2">
                  {m.role === "candidate" ? "You" : m.stakeholder_name}
                </span>
                <span>{m.content}</span>
              </div>
            ))}
            {turnMut.isPending && <div className="text-xs text-muted-foreground italic">Team is responding…</div>}
          </div>
          <form onSubmit={handleSend} className="hairline border-t p-2 flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Speak or type your next question to the team…"
              className="flex-1 border border-ink bg-paper px-3 py-2 text-sm focus:outline-none focus:bg-secondary"
              disabled={turnMut.isPending}
            />
            <VoiceInput onTranscript={(c) => setText((p) => appendTranscript(p, c))} className="!h-auto self-stretch !w-9" />
            <button type="submit" disabled={turnMut.isPending || !text.trim()} className="bg-ink text-paper px-4 text-sm rounded-sm disabled:opacity-50">
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
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
    () => messages.filter((m) => m.stakeholder_name === target && m.phase === "intervention"),
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
          Move to application →
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

// ---------- Application: run the playbook canvas with the team ----------

function ApplicationStep({ session, onSaved }: { session: any; onSaved: () => void }) {
  const canvas = canvasForPlaybook(session.methodology_choice);
  const initial = (session.application_canvas as Record<string, string> | null) ?? {};
  const [cells, setCells] = useState<Record<string, string>>(initial);
  const [evidence, setEvidence] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);

  const suggest = useServerFn(suggestCanvasCell);
  const save = useServerFn(saveCanvas);

  const saveMut = useMutation({
    mutationFn: () => save({ data: { sessionId: session.id, canvas: cells } }),
    onSuccess: () => { toast.success("Canvas saved"); onSaved(); },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  async function askTeam(cellKey: string) {
    setLoading(cellKey);
    try {
      const res = await suggest({ data: { sessionId: session.id, cellKey } });
      setCells((p) => ({ ...p, [cellKey]: res.suggestion ?? "" }));
      if (res.evidence) setEvidence((p) => ({ ...p, [cellKey]: res.evidence }));
    } catch (e: any) {
      toast.error(e?.message ?? "AI suggestion failed");
    } finally {
      setLoading(null);
    }
  }

  if (!canvas) {
    return (
      <StepShell title="Pick a playbook first" hint="Application requires a selected playbook. Go back to the Method step.">
        <p className="text-sm text-muted-foreground">No canvas has been mapped to this session yet.</p>
      </StepShell>
    );
  }

  const cellsByCol = (col: string) => canvas.cells.filter((c) => c.column === col);
  const isVPC = canvas.id === "strong_value_propositions";
  const isCustomerOnly = canvas.id === "customer_profile_interviews";
  const isBMC = canvas.id === "competing_on_business_models";

  function CellCard({ cell }: { cell: { key: string; label: string; hint: string; column?: string } }) {
    return (
      <div className="border border-ink p-3 bg-paper">
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <label className="text-[11px] uppercase tracking-[0.12em] font-medium">{cell.label}</label>
          <button
            onClick={() => askTeam(cell.key)}
            disabled={loading === cell.key}
            className="text-[10px] uppercase tracking-wider border border-ink px-2 py-0.5 hover:bg-secondary disabled:opacity-50"
          >
            {loading === cell.key ? "Asking…" : "Ask team"}
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground mb-2 leading-snug">{cell.hint}</p>
        <textarea
          value={cells[cell.key] ?? ""}
          onChange={(e) => setCells((p) => ({ ...p, [cell.key]: e.target.value }))}
          rows={5}
          placeholder="Fill with the team, or click 'Ask team' to draft from the conversation so far."
          className="w-full border border-ink bg-paper p-2 text-xs focus:outline-none focus:bg-secondary font-mono"
        />
        {evidence[cell.key] && (
          <p className="text-[10px] text-muted-foreground italic mt-1.5">Evidence: {evidence[cell.key]}</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="grid md:grid-cols-12 gap-6 mb-6">
        <div className="md:col-span-4">
          <h2 className="text-2xl tracking-tight mb-2">{canvas.name}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">{canvas.blurb}</p>
          <div className="border border-ink p-3 text-xs bg-secondary">
            <div className="uppercase tracking-[0.12em] font-medium mb-1">How to run this</div>
            <p className="leading-relaxed">
              Walk through each cell with the team. Use <strong>Ask team</strong> to have the AI synthesize what
              stakeholders have already said on that cell — then refine. Empty AI evidence means you need to ask the team a direct question.
            </p>
          </div>
        </div>

        <div className="md:col-span-8">
          {isVPC && (
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-3">
                <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Customer Profile (circle)</div>
                {cellsByCol("customer").map((c) => <CellCard key={c.key} cell={c} />)}
              </div>
              <div className="space-y-3">
                <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Value Map (square)</div>
                {cellsByCol("value").map((c) => <CellCard key={c.key} cell={c} />)}
              </div>
            </div>
          )}

          {isCustomerOnly && (
            <div className="space-y-3">
              {canvas.cells.map((c) => <CellCard key={c.key} cell={c} />)}
            </div>
          )}

          {isBMC && (
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-3">
                <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Value & customer side</div>
                {cellsByCol("left").map((c) => <CellCard key={c.key} cell={c} />)}
              </div>
              <div className="space-y-3">
                <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Infrastructure & economics</div>
                {cellsByCol("right").map((c) => <CellCard key={c.key} cell={c} />)}
                {cellsByCol("bottom").map((c) => <CellCard key={c.key} cell={c} />)}
              </div>
            </div>
          )}

          {!isVPC && !isCustomerOnly && !isBMC && (
            <div className="grid md:grid-cols-2 gap-3">
              {canvas.cells.map((c) => <CellCard key={c.key} cell={c} />)}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-ink pt-4">
        <a href={STRATEGYZER_LIBRARY_URL} target="_blank" rel="noreferrer" className="text-xs underline self-center mr-auto">
          Open Strategyzer playbook library ↗
        </a>
        <button
          onClick={() => saveMut.mutate()}
          disabled={saveMut.isPending}
          className="bg-ink text-paper px-5 py-2 text-sm rounded-sm disabled:opacity-50"
        >
          {saveMut.isPending ? "Saving…" : "Save canvas & recommend →"}
        </button>
      </div>
    </div>
  );
}

function InterventionStep({ session, onSaved }: { session: any; onSaved: () => void }) {
  const [rec, setRec] = useState<string>(session.intervention_recommendation ?? "");
  const [decision, setDecision] = useState(session.decision ?? "");
  const save = useServerFn(updateSession);

  const submit = useMutation({
    mutationFn: () =>
      save({ data: { sessionId: session.id, interventionRecommendation: rec, decision, status: "intervention" } }),
    onSuccess: () => {
      toast.success("Intervention saved — now apply a real playbook");
      onSaved();
    },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
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
      hint="What's the next concrete step you'd recommend? Then make the call: continue, pivot, escalate, or stop. Next you'll apply a real Strategyzer playbook with the team."
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
          {submit.isPending ? "Saving…" : "Continue to playbook application →"}
        </button>
      </div>
    </StepShell>
  );
}

// ---------- Playbook Application: upload a real Strategyzer playbook PDF and run it ----------

function PlaybookStep({ session, onSaved }: { session: any; onSaved: () => void }) {
  const navigate = useNavigate();
  const extracted = session.playbook_extracted as
    | { title: string; overview: string; exercises: { id: string; title: string; objective: string; instructions: string; prompts: string[] }[] }
    | null;
  const initialApp = (session.playbook_application as Record<string, string> | null) ?? {};

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [responses, setResponses] = useState<Record<string, string>>(initialApp);

  const extractFn = useServerFn(extractPlaybook);
  const saveApp = useServerFn(savePlaybookApplication);
  const evalFn = useServerFn(generateEvaluation);

  async function handleUpload() {
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("PDF too large (max 15MB)");
      return;
    }
    setUploading(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (!userId) throw new Error("Not signed in");
      const path = `${userId}/${session.id}.pdf`;
      const { error: upErr } = await supabase.storage
        .from("playbooks")
        .upload(path, file, { upsert: true, contentType: "application/pdf" });
      if (upErr) throw new Error(upErr.message);

      setUploading(false);
      setExtracting(true);
      await extractFn({ data: { sessionId: session.id, pdfPath: path } });
      toast.success("Playbook parsed");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
      setExtracting(false);
    }
  }

  const submit = useMutation({
    mutationFn: async () => {
      await saveApp({ data: { sessionId: session.id, application: responses } });
      await evalFn({ data: { sessionId: session.id } });
    },
    onSuccess: () => {
      toast.success("Evaluation generated");
      onSaved();
      navigate({ to: "/sessions/$sessionId/report", params: { sessionId: session.id } });
    },
    onError: (e: any) => toast.error(e?.message ?? "Evaluation failed"),
  });

  // ---------- Upload screen ----------
  if (!extracted) {
    return (
      <StepShell
        title="Bring in a real playbook"
        hint="Upload the Strategyzer playbook PDF you'd actually use here. We'll parse its exercises so you can run them with the team — no improvising frameworks."
      >
        <div className="border border-ink p-5 bg-secondary mb-4">
          <div className="text-xs uppercase tracking-[0.12em] font-medium mb-2">Where to get the playbook</div>
          <p className="text-sm leading-relaxed mb-3">
            Sign in to the Strategyzer platform and download the relevant playbook PDF from the official library.
          </p>
          <a
            href="https://platform.strategyzer.com/playbook_libraries/strategyzer_library"
            target="_blank"
            rel="noreferrer"
            className="text-xs underline"
          >
            Open Strategyzer playbook library ↗
          </a>
        </div>

        <label className="block border-2 border-dashed border-ink p-8 text-center cursor-pointer hover:bg-secondary">
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <div className="text-sm">
            {file ? <strong>{file.name}</strong> : "Click to choose a playbook PDF (max 15MB)"}
          </div>
          {file && (
            <div className="text-[11px] text-muted-foreground mt-1">
              {(file.size / 1024).toFixed(0)} KB
            </div>
          )}
        </label>

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleUpload}
            disabled={!file || uploading || extracting}
            className="bg-ink text-paper px-5 py-2 text-sm rounded-sm disabled:opacity-50"
          >
            {uploading ? "Uploading…" : extracting ? "Parsing exercises…" : "Upload & parse →"}
          </button>
        </div>
      </StepShell>
    );
  }

  // ---------- Run the playbook ----------
  return (
    <div>
      <div className="grid md:grid-cols-12 gap-6 mb-6">
        <div className="md:col-span-4">
          <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1">Active playbook</div>
          <h2 className="text-2xl tracking-tight mb-2">{extracted.title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">{extracted.overview}</p>
          <div className="border border-ink p-3 text-xs bg-secondary">
            <div className="uppercase tracking-[0.12em] font-medium mb-1">How to run this</div>
            <p className="leading-relaxed">
              Walk the team through each exercise in order. Capture what the team produces — not what you think.
              Empty responses mean the exercise wasn't completed.
            </p>
          </div>
          <button
            onClick={() => {
              if (confirm("Replace the current playbook with a different PDF?")) {
                setResponses({});
                // Force re-upload UI
                (session as any).playbook_extracted = null;
                onSaved();
              }
            }}
            className="mt-3 text-xs underline"
          >
            Replace playbook PDF
          </button>
        </div>

        <div className="md:col-span-8 space-y-4">
          {extracted.exercises.map((ex, i) => (
            <div key={ex.id} className="border border-ink p-4 bg-paper">
              <div className="flex items-baseline gap-3 mb-1">
                <span className="marker-num text-xs opacity-60">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="text-base font-medium">{ex.title}</h3>
              </div>
              <p className="text-xs text-muted-foreground italic mb-2">{ex.objective}</p>
              <p className="text-xs leading-relaxed mb-3 whitespace-pre-wrap">{ex.instructions}</p>
              {ex.prompts.length > 0 && (
                <ul className="text-xs list-disc pl-5 mb-3 space-y-0.5">
                  {ex.prompts.map((p, j) => <li key={j}>{p}</li>)}
                </ul>
              )}
              <textarea
                value={responses[ex.id] ?? ""}
                onChange={(e) => setResponses((p) => ({ ...p, [ex.id]: e.target.value }))}
                rows={5}
                placeholder="Capture the team's responses to this exercise."
                className="w-full border border-ink bg-paper p-2 text-xs focus:outline-none focus:bg-secondary font-mono"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-ink pt-4">
        <button
          onClick={() => saveApp({ data: { sessionId: session.id, application: responses } }).then(() => toast.success("Saved"))}
          className="border border-ink px-4 py-2 text-sm hover:bg-secondary"
        >
          Save progress
        </button>
        <button
          onClick={() => submit.mutate()}
          disabled={submit.isPending}
          className="bg-ink text-paper px-5 py-2 text-sm rounded-sm disabled:opacity-50"
        >
          {submit.isPending ? "Generating evaluation…" : "Submit & generate evaluation →"}
        </button>
      </div>
    </div>
  );
}
