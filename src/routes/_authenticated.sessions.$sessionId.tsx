import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useMemo, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Shell } from "@/components/Shell";
import { getSession, updateSession, sendStakeholderMessage, suggestPlaybook, sendScopingTurn, extractFraming, suggestCanvasCell, saveCanvas, sendPlaybookTeamTurn, respondAsTeamCell } from "@/lib/simulator.functions";
import { synthesizeVoice } from "@/lib/voice.functions";
import { voiceForStakeholder } from "@/lib/voices";
import { generateEvaluation } from "@/lib/evaluation.functions";
import { savePlaybookApplication } from "@/lib/playbook.functions";
import { supabase } from "@/integrations/supabase/client";
import { VoiceInput, appendTranscript } from "@/components/VoiceInput";
import { PLAYBOOKS, STRATEGYZER_LIBRARY_URL, ENGAGEMENT_MODELS, canvasForPlaybook, BUILTIN_PLAYBOOK } from "@/lib/playbooks";
import canvasVPC from "@/assets/canvas-value-proposition.png";
import canvasBMC from "@/assets/canvas-business-model.png";

const CANVAS_IMAGES: Record<string, { src: string; alt: string }> = {
  strong_value_propositions: { src: canvasVPC, alt: "Strategyzer Value Proposition Canvas" },
  customer_profile_interviews: { src: canvasVPC, alt: "Strategyzer Customer Profile (right side of the Value Proposition Canvas)" },
  competing_on_business_models: { src: canvasBMC, alt: "Strategyzer Business Model Canvas" },
};


export const Route = createFileRoute("/_authenticated/sessions/$sessionId")({
  head: () => ({
    meta: [{ title: "Session · Strategyzer Coach Certification" }],
  }),
  component: SessionPage,
});

type Step = "framing" | "method" | "dialogue" | "application" | "intervention" | "playbook";

const STEPS: { key: Step; label: string; sub: string }[] = [
  { key: "framing",      label: "Situation Framing",          sub: "Diagnose ambiguity, evidence, and success expectations" },
  { key: "method",       label: "Coaching Approach",          sub: "Choose the smallest useful Strategyzer intervention" },
  { key: "dialogue",     label: "Stakeholder Workspace",      sub: "Surface political reality, readiness, and resistance before facilitating" },
  { key: "application",  label: "Live Playbook Facilitation", sub: "Run a real Strategyzer working session with the team" },
  { key: "intervention", label: "Next-Step Judgment",         sub: "What should happen now based on what emerged?" },
  { key: "playbook",     label: "Engagement Orchestration",   sub: "Design the smallest responsible pathway forward" },
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

  // Free navigation by design. Saving never auto-advances — the coach chooses
  // when to move on, or to return to a prior section. Stakeholder Workspace is
  // always one click away via the StepNav and the floating "Revisit
  // stakeholders" affordance below.
  const refreshOnly = () => { refetch(); };

  return (
    <Shell>
      <ScenarioHeader scenario={scenario} session={session} />
      <StepNav step={step} onChange={setStep} />
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-10">
        {step === "framing" && <FramingStep session={session} messages={data.messages} onSaved={refreshOnly} onRefresh={refetch} />}
        {step === "method" && <MethodStep session={session} onSaved={refreshOnly} />}
        {step === "dialogue" && <DialogueStep session={session} messages={data.messages} onRefresh={refetch} onContinue={refreshOnly} />}
        {step === "application" && <ApplicationStep session={session} onSaved={refreshOnly} />}
        {step === "intervention" && <InterventionStep session={session} onSaved={refreshOnly} />}
        {step === "playbook" && <EngagementPathwayStep session={session} onSaved={refetch} />}
      </div>
      {step !== "dialogue" && step !== "framing" && (
        <button
          onClick={() => setStep("dialogue")}
          className="fixed bottom-6 right-6 z-40 bg-ink text-paper px-4 py-3 text-xs uppercase tracking-[0.12em] rounded-sm shadow-[3px_3px_0_var(--ink)] border border-ink hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_var(--ink)] transition-transform"
          title="Stakeholder dialogue is persistent — return any time to clarify, negotiate scope, or surface resistance"
        >
          ↩ Revisit stakeholders
        </button>
      )}
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

        {(scenario.success_definition || scenario.success_pressure) && (
          <div className="mt-6 grid md:grid-cols-2 gap-4 max-w-4xl">
            {scenario.success_definition && (
              <div className="border border-paper/40 p-4">
                <div className="text-[10px] uppercase tracking-[0.14em] opacity-70 mb-1.5">What the team believes success looks like</div>
                <p className="text-sm opacity-90 leading-relaxed">{scenario.success_definition}</p>
              </div>
            )}
            {scenario.success_pressure && (
              <div className="border border-paper/40 p-4">
                <div className="text-[10px] uppercase tracking-[0.14em] opacity-70 mb-1.5">Pressure shaping that belief</div>
                <p className="text-sm opacity-90 leading-relaxed">{scenario.success_pressure}</p>
              </div>
            )}
            {Array.isArray(scenario.unrealistic_aspects) && scenario.unrealistic_aspects.length > 0 && (
              <div className="md:col-span-2 border border-paper/40 p-4" style={{ backgroundColor: "rgba(0,0,0,0.18)" }}>
                <div className="text-[10px] uppercase tracking-[0.14em] opacity-70 mb-1.5">Where their success picture may be off — for you to surface, not assume</div>
                <ul className="text-sm opacity-90 leading-relaxed list-disc pl-4 space-y-0.5">
                  {scenario.unrealistic_aspects.map((u: string, i: number) => <li key={i}>{u}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
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
                <div className={`text-[10px] mt-1 ml-7 leading-snug ${active ? "opacity-70" : "text-muted-foreground"}`}>{s.sub}</div>
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
  // Parse stored "choice::engagement" format. New: choice may also be
  // "multi:id1,id2" or "none" — restraint is a valid coaching call.
  const storedRaw: string = session.methodology_choice ?? "";
  const [storedChoice, storedEngagement] = storedRaw.includes("::") ? storedRaw.split("::") : [storedRaw, ENGAGEMENT_MODELS[0].id];

  const initialMode: "single" | "multi" | "none" =
    storedChoice === "none" ? "none" : storedChoice.startsWith("multi:") ? "multi" : "single";
  const initialSingle = initialMode === "single" ? storedChoice : "";
  const initialMulti = initialMode === "multi" ? storedChoice.replace(/^multi:/, "").split(",").filter(Boolean) : [];

  const [mode, setMode] = useState<"single" | "multi" | "none">(initialMode);
  const [choice, setChoice] = useState<string>(initialSingle);
  const [multi, setMulti] = useState<string[]>(initialMulti);
  const [rationale, setRationale] = useState<string>(session.methodology_rationale ?? "");
  const [engagement, setEngagement] = useState<string>(storedEngagement || ENGAGEMENT_MODELS[0].id);
  const [suggestion, setSuggestion] = useState<any>(null);
  const save = useServerFn(updateSession);
  const suggest = useServerFn(suggestPlaybook);

  const suggestMut = useMutation({
    mutationFn: () => suggest({ data: { sessionId: session.id, mode } as any }),
    onSuccess: (res) => setSuggestion(res.suggestion),
    onError: (e: any) => toast.error(e.message ?? "Could not generate suggestion"),
  });

  function encodedChoice(): string {
    if (mode === "none") return "none";
    if (mode === "multi") return `multi:${multi.join(",")}`;
    return choice;
  }

  const mut = useMutation({
    mutationFn: () => save({ data: {
      sessionId: session.id,
      methodologyChoice: `${encodedChoice()}::${engagement}`,
      methodologyRationale: rationale,
      status: "method",
    } }),
    onSuccess: () => { toast.success("Coaching strategy saved"); onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });

  const canSave =
    rationale.trim().length > 0 &&
    (mode === "none" || (mode === "single" && choice) || (mode === "multi" && multi.length > 0));

  const selectedPb = PLAYBOOKS.find((p) => p.id === choice);

  function toggleMulti(id: string) {
    setMulti((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  return (
    <StepShell
      title="Choose your coaching approach"
      hint="How are you going to work with this team? Pick the smallest useful Strategyzer intervention — one playbook, a sequenced combination, or none yet if evidence is too thin. Decide methodology fit, sequencing, and working style (workshop · guided coaching · evidence gathering) before you enter the room. This is the approach you'll activate in Live Playbook Facilitation."
    >
      {/* Mode selector — single / multi / none */}
      <div className="grid md:grid-cols-3 gap-2 mb-6">
        {[
          { id: "single", label: "One playbook", sub: "A single primary intervention" },
          { id: "multi", label: "Sequenced combination", sub: "A short orchestration of playbooks" },
          { id: "none", label: "No playbook yet", sub: "Gather more evidence first" },
        ].map((m) => {
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setMode(m.id as any)}
              className={`text-left p-3 border border-ink ${active ? "bg-ink text-paper" : "hover:bg-secondary"}`}
            >
              <div className="text-sm font-medium">{m.label}</div>
              <div className="text-[11px] opacity-80 mt-0.5">{m.sub}</div>
            </button>
          );
        })}
      </div>

      <div className="mb-6 p-4 border border-ink flex items-start justify-between gap-4" style={{ backgroundColor: "var(--brand-yellow)" }}>
        <div className="text-sm">
          <div className="font-medium mb-1">AI second opinion</div>
          <div className="text-xs opacity-80">{mode === "none" ? "Ask the AI which evidence-gathering moves it would prioritize before any playbook." : "Have the AI review your scoping notes and propose a fit — then form your own call."}</div>
        </div>
        <button
          onClick={() => suggestMut.mutate()}
          disabled={suggestMut.isPending}
          className="bg-ink text-paper px-3 py-1.5 text-xs rounded-sm disabled:opacity-50 shrink-0"
        >
          {suggestMut.isPending ? "Thinking…" : mode === "none" ? "Suggest evidence moves" : "Suggest playbook"}
        </button>
      </div>

      {suggestion && (
        <div className="mb-6 border border-ink p-4 bg-secondary">
          <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-2">AI suggestion · confidence {suggestion.confidence ?? "—"}</div>
          {suggestion.playbookId && (
            <div className="font-medium mb-1">
              → {PLAYBOOKS.find((p) => p.id === suggestion.playbookId)?.name ?? suggestion.playbookId}
            </div>
          )}
          {suggestion.rationale && <p className="text-sm leading-relaxed mb-2">{suggestion.rationale}</p>}
          {Array.isArray(suggestion.evidence_moves) && suggestion.evidence_moves.length > 0 && (
            <ul className="text-sm list-disc pl-4 space-y-0.5">
              {suggestion.evidence_moves.map((m: string, i: number) => <li key={i}>{m}</li>)}
            </ul>
          )}
          {Array.isArray(suggestion.watchouts) && suggestion.watchouts.length > 0 && (
            <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5 mt-2">
              {suggestion.watchouts.map((w: string, i: number) => <li key={i}>{w}</li>)}
            </ul>
          )}
        </div>
      )}

      {mode !== "none" && (
        <div className="grid md:grid-cols-2 gap-3 mb-6">
          {PLAYBOOKS.map((p) => {
            const active = mode === "single" ? choice === p.id : multi.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() => mode === "single" ? setChoice(p.id) : toggleMulti(p.id)}
                className={`text-left border border-ink p-4 transition-colors ${active ? "bg-ink text-paper" : "hover:bg-secondary"}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="w-8 h-8 border border-current" style={{ backgroundColor: p.accent }} />
                  <span className="text-[10px] uppercase tracking-[0.14em] opacity-70">{p.diagnosis}{mode === "multi" && active ? ` · #${multi.indexOf(p.id) + 1}` : ""}</span>
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
      )}

      {mode === "none" && (
        <div className="border border-ink p-4 mb-6" style={{ backgroundColor: "var(--brand-lime)" }}>
          <div className="text-xs uppercase tracking-[0.12em] font-medium mb-1">Restraint is a coaching move</div>
          <p className="text-sm leading-relaxed">
            Reaching for a playbook before the team has shared evidence is a common failure mode. Document what evidence
            you need first, who would generate it, and what would trigger you to commit to a methodology. The simulator
            will reward this decision if your rationale shows judgment, not avoidance.
          </p>
        </div>
      )}

      {selectedPb && mode === "single" && (
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

      <label className="text-xs uppercase tracking-[0.12em] mb-1 block">Rationale — sequencing, scope, evidence focus, restraint</label>
      <div className="relative">
        <textarea
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          rows={5}
          placeholder={mode === "none"
            ? "What evidence are you missing? Who would generate it, by when? What would have to be true to commit to a playbook?"
            : "Why this approach for this team right now. What sequencing or restraint matters. What would change your mind."}
          className="w-full border border-ink bg-paper p-4 pr-12 text-sm focus:outline-none focus:bg-secondary"
        />
        <div className="absolute top-2 right-2">
          <VoiceInput onTranscript={(c) => setRationale((p) => appendTranscript(p, c))} />
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <button onClick={() => mut.mutate()} disabled={mut.isPending || !canSave} className="bg-ink text-paper px-5 py-2 text-sm rounded-sm disabled:opacity-50">
          {mut.isPending ? "Saving…" : "Save coaching strategy"}
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
  const [commitments, setCommitments] = useState<string>(session.dialogue_commitments ?? "");
  const [savingCommit, setSavingCommit] = useState(false);
  const send = useServerFn(sendStakeholderMessage);
  const save = useServerFn(updateSession);
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

  async function persistCommitments(next: string) {
    setSavingCommit(true);
    try {
      await save({ data: { sessionId: session.id, dialogueCommitments: next } });
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setSavingCommit(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Purpose framing */}
      <div className="border border-ink p-5" style={{ backgroundColor: "var(--brand-yellow)" }}>
        <div className="text-xs uppercase tracking-[0.14em] font-medium mb-2">Stakeholder workspace — diagnostic & preparatory</div>
        <p className="text-sm leading-relaxed">
          This is where you gather the missing context <em>before</em> you facilitate. Use these 1:1s to validate
          assumptions, uncover constraints, clarify stakeholder readiness, read emotional dynamics, identify hidden
          blockers, test alignment, and surface political reality. Stakeholders remember the full transcript — they will
          resist, evolve, and sometimes contradict themselves under pressure, just like real ones.
        </p>
        <p className="text-sm leading-relaxed mt-2">
          <strong>What gets carried forward:</strong> commitments and decisions captured on the right. These sharpen
          your Live Playbook Facilitation, your Next-Step Judgment, and your Engagement Orchestration. This isn't a
          standalone coaching phase — return here any time a later step surfaces a new question for a stakeholder.
        </p>
      </div>

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
          <p className="mt-6 text-[11px] text-muted-foreground leading-relaxed">
            This workspace stays open across the whole session. Switch sections from the top nav at any time —
            nothing here is locked or "completed".
          </p>
        </aside>

        <div className="md:col-span-6 border border-ink flex flex-col min-h-[60vh]">
          <div className="hairline-b px-5 py-3 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Talking to</div>
              <div className="font-medium">{target}</div>
            </div>
            <span className="chip">1:1 — keep it short</span>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[55vh]">
            {filtered.length === 0 && (
              <div className="text-sm text-muted-foreground italic">
                Open the conversation. What do you want to learn — or get committed — from {target}?
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

        {/* Commitments capture */}
        <aside className="md:col-span-3">
          <h3 className="text-xs uppercase tracking-[0.12em] mb-2">Commitments &amp; decisions</h3>
          <p className="text-[11px] text-muted-foreground mb-2 leading-relaxed">
            Capture what each stakeholder agreed to, refused, or hinted at. This carries into your intervention
            recommendation and the canvas you'll run with the team.
          </p>
          <textarea
            value={commitments}
            onChange={(e) => setCommitments(e.target.value)}
            onBlur={(e) => persistCommitments(e.target.value)}
            rows={14}
            placeholder={`e.g.\n• ${stakeholders[0]?.name ?? "CIO"}: agreed to 15-min pitch next Tue\n• ${stakeholders[1]?.name ?? "PM"}: will share 3 customer contacts\n• ${stakeholders[2]?.name ?? "Eng lead"}: pushed back on 6-week pilot`}
            className="w-full border border-ink bg-paper p-2 text-xs focus:outline-none focus:bg-secondary font-mono leading-relaxed"
          />
          <div className="text-[10px] text-muted-foreground mt-1">
            {savingCommit ? "Saving…" : "Auto-saved when you click away"}
          </div>
        </aside>
      </div>
    </div>
  );
}


// ---------- Application: run the playbook canvas with the team ----------

type FacilitationAssist = {
  team_says: string;
  probing_questions: string[];
  evidence_gaps: string[];
  reframe: string;
  contradiction: string | null;
};

type FacilitationTurn = { role: "team" | "coach"; content: string; flag?: string; coach_signal?: string };

type CellMeta = {
  confidence?: "none" | "weak" | "moderate" | "strong";
  ambiguity?: boolean;
};

const FLAG_LABEL: Record<string, { label: string; color: string }> = {
  recovered:         { label: "Recovered",         color: "var(--brand-lime)" },
  still_vague:       { label: "Still vague",       color: "var(--brand-yellow)" },
  evidence_gap:      { label: "Evidence gap",      color: "var(--brand-red)" },
  solution_jumping:  { label: "Solution-jumping",  color: "var(--brand-cyan)" },
  team_tension:      { label: "Team tension",      color: "var(--brand-purple)" },
  genuine_progress:  { label: "Genuine progress",  color: "var(--brand-lime)" },
};

const CONFIDENCE_OPTIONS: { v: NonNullable<CellMeta["confidence"]>; l: string; c: string }[] = [
  { v: "none",     l: "No evidence",  c: "transparent" },
  { v: "weak",     l: "Weak",         c: "var(--brand-red)" },
  { v: "moderate", l: "Moderate",     c: "var(--brand-yellow)" },
  { v: "strong",   l: "Strong",       c: "var(--brand-lime)" },
];

function ApplicationStep({ session, onSaved }: { session: any; onSaved: () => void }) {
  const canvas = canvasForPlaybook(session.methodology_choice);
  const initial = (session.application_canvas as Record<string, string> | null) ?? {};
  const [cells, setCells] = useState<Record<string, string>>(initial);
  const [meta, setMeta] = useState<Record<string, CellMeta>>(() => {
    // Allow meta to be encoded in canvas as `__meta__${cellKey}` strings (JSON)
    const m: Record<string, CellMeta> = {};
    for (const [k, v] of Object.entries(initial)) {
      if (k.startsWith("__meta__") && typeof v === "string") {
        try { m[k.replace("__meta__", "")] = JSON.parse(v); } catch {}
      }
    }
    return m;
  });
  const [assist, setAssist] = useState<Record<string, FacilitationAssist>>({});
  const [turns, setTurns] = useState<Record<string, FacilitationTurn[]>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [replying, setReplying] = useState<string | null>(null);

  const suggest = useServerFn(suggestCanvasCell);
  const respond = useServerFn(respondAsTeamCell);
  const save = useServerFn(saveCanvas);

  function buildPersistable(): Record<string, string> {
    const out: Record<string, string> = { ...cells };
    for (const [k, v] of Object.entries(meta)) out[`__meta__${k}`] = JSON.stringify(v);
    return out;
  }

  const saveMut = useMutation({
    mutationFn: () => save({ data: { sessionId: session.id, canvas: buildPersistable() } }),
    onSuccess: () => { toast.success("Facilitation captured — incomplete is fine"); onSaved(); },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  async function runAssist(cellKey: string) {
    setLoading(cellKey);
    try {
      const res = await suggest({ data: { sessionId: session.id, cellKey } });
      const a: FacilitationAssist = {
        team_says: res.team_says ?? "",
        probing_questions: res.probing_questions ?? [],
        evidence_gaps: res.evidence_gaps ?? [],
        reframe: res.reframe ?? "",
        contradiction: res.contradiction ?? null,
      };
      setAssist((p) => ({ ...p, [cellKey]: a }));
      // Seed the live transcript with the opening team utterance
      setTurns((p) => ({
        ...p,
        [cellKey]: a.team_says ? [{ role: "team", content: `[Team] ${a.team_says}` }] : (p[cellKey] ?? []),
      }));
    } catch (e: any) {
      toast.error(e?.message ?? "Facilitation assist failed");
    } finally {
      setLoading(null);
    }
  }

  async function sendCoachMove(cellKey: string) {
    const move = (draft[cellKey] ?? "").trim();
    if (!move || replying) return;
    setReplying(cellKey);
    const history = turns[cellKey] ?? [];
    // optimistic append
    setTurns((p) => ({ ...p, [cellKey]: [...(p[cellKey] ?? []), { role: "coach", content: move }] }));
    setDraft((p) => ({ ...p, [cellKey]: "" }));
    try {
      const res = await respond({
        data: {
          sessionId: session.id,
          cellKey,
          history: history.map((t) => ({ role: t.role, content: t.content })),
          coachMove: move,
        },
      });
      setTurns((p) => ({
        ...p,
        [cellKey]: [
          ...(p[cellKey] ?? []),
          { role: "team", content: res.team_reply, flag: res.facilitation_flag, coach_signal: res.coach_signal },
        ],
      }));
    } catch (e: any) {
      toast.error(e?.message ?? "Team didn't respond");
    } finally {
      setReplying(null);
    }
  }

  if (!canvas) {
    const mode = session.methodology_choice?.startsWith("none") ? "none" : "unmapped";
    return (
      <StepShell
        title="Facilitated Working Session"
        hint="Sometimes the right move is no canvas at all. Restraint scores above forced facilitation."
      >
        {mode === "none" ? (
          <div className="border border-ink p-5" style={{ backgroundColor: "var(--brand-lime)" }}>
            <div className="text-xs uppercase tracking-[0.12em] font-medium mb-2">No canvas yet — by design</div>
            <p className="text-sm leading-relaxed">
              You chose to gather more evidence before committing to a playbook. Stay here while you work the
              Stakeholder Workspace, then return to Coaching Strategy when you're ready. Knowing when NOT to
              facilitate deeper playbook work is itself rewarded.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No canvas has been mapped to your chosen approach yet. Return to Coaching Strategy if you'd like to commit to a playbook.</p>
        )}
      </StepShell>
    );
  }

  const cellsByCol = (col: string) => canvas.cells.filter((c) => c.column === col);
  const isVPC = canvas.id === "strong_value_propositions";
  const isCustomerOnly = canvas.id === "customer_profile_interviews";
  const isBMC = canvas.id === "competing_on_business_models";

  function CellCard({ cell }: { cell: { key: string; label: string; hint: string; column?: string } }) {
    const a = assist[cell.key];
    const cellTurns = turns[cell.key] ?? [];
    const cellMeta = meta[cell.key] ?? {};
    const lastFlag = [...cellTurns].reverse().find((t) => t.flag)?.flag;
    return (
      <div className="border border-ink p-3 bg-paper">
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <label className="text-[11px] uppercase tracking-[0.12em] font-medium">{cell.label}</label>
          <div className="flex items-center gap-1">
            {lastFlag && FLAG_LABEL[lastFlag] && (
              <span
                className="text-[9px] uppercase tracking-[0.1em] border border-ink px-1.5 py-0.5"
                style={{ backgroundColor: FLAG_LABEL[lastFlag].color }}
                title="Latest facilitation signal"
              >
                {FLAG_LABEL[lastFlag].label}
              </span>
            )}
            <button
              onClick={() => runAssist(cell.key)}
              disabled={loading === cell.key}
              className="text-[10px] uppercase tracking-wider border border-ink px-2 py-0.5 hover:bg-secondary disabled:opacity-50"
              title="Start a live facilitation moment with the team. They reply realistically; you facilitate."
            >
              {loading === cell.key ? "Listening…" : cellTurns.length === 0 ? "Open the moment" : "Re-open"}
            </button>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mb-2 leading-snug">{cell.hint}</p>

        {/* Live facilitation transcript */}
        {cellTurns.length > 0 && (
          <div className="border border-ink/40 bg-secondary/30 mb-2 max-h-[260px] overflow-y-auto">
            <div className="px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-muted-foreground border-b border-ink/30 bg-paper">
              Live facilitation moment
            </div>
            <div className="p-2 space-y-1.5">
              {cellTurns.map((t, i) => (
                <div key={i} className={`text-[11px] ${t.role === "coach" ? "text-right" : "text-left"}`}>
                  <div className={`inline-block max-w-[92%] px-2 py-1 leading-snug ${t.role === "coach" ? "bg-ink text-paper" : "bg-paper border border-ink/40"}`}>
                    <div className="text-[8px] uppercase tracking-[0.12em] opacity-70 mb-0.5">{t.role === "coach" ? "Coach" : "Team"}</div>
                    <div className="whitespace-pre-wrap italic">{t.content}</div>
                    {t.role === "team" && t.coach_signal && (
                      <div className="text-[9px] mt-1 not-italic opacity-80 border-t border-ink/20 pt-1">
                        ↳ {t.coach_signal}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {replying === cell.key && (
                <div className="text-[10px] text-muted-foreground italic">Team is thinking…</div>
              )}
            </div>
          </div>
        )}

        {/* Coach move input — appears after the moment opens */}
        {cellTurns.length > 0 && (
          <div className="flex gap-1.5 mb-2">
            <textarea
              value={draft[cell.key] ?? ""}
              onChange={(e) => setDraft((p) => ({ ...p, [cell.key]: e.target.value }))}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sendCoachMove(cell.key); }}
              rows={2}
              placeholder="Your facilitation move — a probe, a reframe, a pause. (⌘/Ctrl+Enter)"
              className="flex-1 border border-ink bg-paper p-1.5 text-[11px] focus:outline-none focus:bg-secondary"
            />
            <button
              onClick={() => sendCoachMove(cell.key)}
              disabled={!(draft[cell.key] ?? "").trim() || replying === cell.key}
              className="bg-ink text-paper px-2 py-1 text-[10px] uppercase tracking-wider rounded-sm disabled:opacity-50"
            >
              Send
            </button>
          </div>
        )}

        {/* Coach's note for this cell — what they decided to capture */}
        <textarea
          value={cells[cell.key] ?? ""}
          onChange={(e) => setCells((p) => ({ ...p, [cell.key]: e.target.value }))}
          rows={4}
          placeholder="What did you capture FROM this moment? In the team's words. Blank is OK if the evidence wasn't there — flag it below."
          className="w-full border border-ink bg-paper p-2 text-xs focus:outline-none focus:bg-secondary font-mono"
        />

        {/* Evidence confidence + ambiguity marker */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <div className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground mr-1">Evidence</div>
          {CONFIDENCE_OPTIONS.map((opt) => {
            const active = (cellMeta.confidence ?? "none") === opt.v;
            return (
              <button
                key={opt.v}
                onClick={() => setMeta((p) => ({ ...p, [cell.key]: { ...p[cell.key], confidence: opt.v } }))}
                className={`text-[9px] uppercase tracking-[0.1em] border border-ink px-1.5 py-0.5 ${active ? "ring-2 ring-ink ring-offset-1" : ""}`}
                style={{ backgroundColor: opt.c }}
                title={`Mark the evidence behind this cell as ${opt.l.toLowerCase()}`}
              >
                {opt.l}
              </button>
            );
          })}
          <button
            onClick={() => setMeta((p) => ({ ...p, [cell.key]: { ...p[cell.key], ambiguity: !cellMeta.ambiguity } }))}
            className={`ml-auto text-[9px] uppercase tracking-[0.1em] border border-ink px-1.5 py-0.5 ${cellMeta.ambiguity ? "bg-ink text-paper" : "bg-paper"}`}
            title="Mark this cell as unresolved ambiguity to flag for the evaluator"
          >
            {cellMeta.ambiguity ? "✓ Unresolved" : "Flag unresolved"}
          </button>
        </div>

        {/* Assist panel (reframe / gaps / contradiction) */}
        {a && (
          <div className="mt-2 border-t border-ink/30 pt-2 space-y-2">
            {a.probing_questions.length > 0 && (
              <div>
                <div className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground mb-1">Probes you could ask</div>
                <ul className="text-[11px] space-y-0.5 leading-snug list-disc list-inside">
                  {a.probing_questions.map((q, i) => <li key={i}>{q}</li>)}
                </ul>
              </div>
            )}
            {a.evidence_gaps.length > 0 && (
              <div>
                <div className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground mb-1">Evidence gaps</div>
                <ul className="text-[11px] space-y-0.5 leading-snug list-disc list-inside">
                  {a.evidence_gaps.map((g, i) => <li key={i}>{g}</li>)}
                </ul>
              </div>
            )}
            {a.reframe && (
              <div className="border-l-2 border-ink pl-2">
                <div className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground mb-0.5">Reframe</div>
                <p className="text-[11px] leading-snug">{a.reframe}</p>
              </div>
            )}
            {a.contradiction && (
              <div className="border border-ink p-2" style={{ backgroundColor: "var(--brand-red, #fee)" }}>
                <div className="text-[9px] uppercase tracking-[0.14em] mb-0.5">Contradiction</div>
                <p className="text-[11px] leading-snug">{a.contradiction}</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }


  const canvasImage = CANVAS_IMAGES[canvas.id];

  return (
    <div>
      {canvasImage && (
        <div className="mb-6 border border-ink bg-paper">
          <div className="flex items-center justify-between px-4 py-2 border-b border-ink">
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Anchor canvas · placeholder reference
            </div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {canvas.name}
            </div>
          </div>
          <div className="p-4 flex justify-center bg-white">
            <img
              src={canvasImage.src}
              alt={canvasImage.alt}
              className="max-h-[460px] w-auto object-contain"
              loading="lazy"
            />
          </div>
          <div className="px-4 py-2 border-t border-ink text-[11px] text-muted-foreground leading-relaxed">
            Reference only — anchors the working session visually until the live playbook
            artifact is integrated. Capture facilitation moves and evidence in the cells below.
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-12 gap-6 mb-6">
        <div className="md:col-span-4">
          <h2 className="text-2xl tracking-tight mb-2">{canvas.name}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">{canvas.blurb}</p>
          <div className="border border-ink p-3 text-xs bg-secondary mb-3">
            <div className="uppercase tracking-[0.12em] font-medium mb-1">You're facilitating live</div>
            <p className="leading-relaxed">
              Open a cell to start a <strong>live facilitation moment</strong>. The team replies in character —
              vague, defensive, solution-jumping, half-formed. Your probes, reframes and pauses move the moment
              forward. You decide what (if anything) to capture in the cell.
            </p>
          </div>
          <div className="border border-ink p-3 text-xs mb-3">
            <div className="uppercase tracking-[0.12em] font-medium mb-1">Reward / penalize</div>
            <p className="leading-relaxed">
              <span className="block mb-1"><strong>Rewarded:</strong> open-ended probes, specificity, evidence rigor, simplification, ownership transfer, workshop recovery, ambiguity navigation, facilitation restraint.</span>
              <span className="block"><strong>Penalized:</strong> answering for the team, leading/yes-no questions, framework jargon, mechanically completed cells, premature solutioning, polished consulting narration.</span>
            </p>
          </div>
          <div className="border border-ink p-3 text-xs mb-3 bg-paper">
            <div className="uppercase tracking-[0.12em] font-medium mb-1">Signals you'll see</div>
            <ul className="leading-relaxed list-disc pl-4 space-y-0.5">
              <li><strong>Flag chips</strong> per cell: recovered · still vague · evidence gap · solution-jumping · team tension · genuine progress.</li>
              <li><strong>Evidence confidence</strong> (none / weak / moderate / strong) — you set it honestly.</li>
              <li><strong>Unresolved</strong> marker — flag cells where ambiguity is the truthful answer.</li>
            </ul>
          </div>

          {(session.dialogue_commitments ?? "").trim() && (
            <div className="border border-ink p-3 text-xs" style={{ backgroundColor: "var(--brand-lime)" }}>
              <div className="uppercase tracking-[0.12em] font-medium mb-1">Carry these in from your 1:1s</div>
              <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed">{session.dialogue_commitments}</pre>
            </div>
          )}
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
          {saveMut.isPending ? "Saving…" : "Capture session & continue →"}
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

  const commitments: string = (session.dialogue_commitments ?? "").trim();

  return (
    <StepShell
      title="Recommend & decide"
      hint="What's the next concrete step you'd recommend? Then make the call: continue, pivot, escalate, or stop. Reflect the commitments stakeholders gave you in the dialogue — they're the real currency of your intervention."
    >
      {commitments && (
        <div className="mb-4 border border-ink p-3 text-xs" style={{ backgroundColor: "var(--brand-lime)" }}>
          <div className="uppercase tracking-[0.12em] font-medium mb-1">Commitments from your 1:1s</div>
          <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed">{commitments}</pre>
        </div>
      )}

      <label className="text-xs uppercase tracking-[0.12em] mb-1 block">Next-best action</label>
      <div className="relative">
        <textarea
          value={rec}
          onChange={(e) => setRec(e.target.value)}
          rows={8}
          placeholder="What exactly happens next? Who, what, by when. What evidence are you trying to generate? Build on the commitments above."
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


// ---------- Engagement Pathway: orchestrate Strategyzer methodology over time ----------

type PBMessage = { id: string; role: string; stakeholder_name: string | null; content: string; phase: string; created_at: string };

const PATHWAY_SECTIONS: { key: string; n: string; label: string; placeholder: string; hint: string }[] = [
  {
    key: "situation_summary",
    n: "01",
    label: "Current Situation Summary",
    placeholder:
      "What is actually happening? Key ambiguity, stakeholder reality, evidence quality, readiness level. Keep it short and prioritized.",
    hint: "Reward: simplification, clarity, prioritization. Avoid: jargon, exhaustive consulting summaries.",
  },
  {
    key: "immediate_intervention",
    n: "02",
    label: "Recommended Immediate Intervention",
    placeholder:
      "The ONE next move. May legitimately be: alignment session, evidence sprint, sponsor clarification, narrowed scope, or 'no playbook yet — pause/stop'. Justify it.",
    hint: "Reward: restraint. Sometimes the right answer is alignment first, evidence first, or stop.",
  },
  {
    key: "pathway",
    n: "03",
    label: "Recommended Engagement Pathway",
    placeholder:
      "Sequence interventions over time. For each step: what happens, who participates, what evidence/decision it produces, what it unblocks next. Lightweight. Realistic cadence.",
    hint: "Reward: sequencing coherence, evidence progression, executable workshops. Penalize: framework stacking, bloated multi-week plans.",
  },
  {
    key: "risks",
    n: "04",
    label: "Risk Factors",
    placeholder:
      "Stakeholder/sponsor risks, evidence gaps, organizational friction, unrealistic expectations, sequencing risks. What could quietly derail this?",
    hint: "Strong coaches surface hidden blockers and readiness problems.",
  },
  {
    key: "success_criteria",
    n: "05",
    label: "Success Criteria",
    placeholder:
      "Realistic, evidence-anchored definition of meaningful progress. Reframe unrealistic ambitions into learning/evidence milestones.",
    hint: "Reward: reframing overpromised success into evidence-based movement.",
  },
];

function EngagementPathwayStep({ session, onSaved }: { session: any; onSaved: () => void }) {
  const navigate = useNavigate();
  const initialApp = (session.playbook_application as Record<string, any> | null) ?? {};
  const [values, setValues] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const s of PATHWAY_SECTIONS) out[s.key] = typeof initialApp[s.key] === "string" ? initialApp[s.key] : "";
    return out;
  });
  const [activeKey, setActiveKey] = useState<string>(PATHWAY_SECTIONS[0].key);
  const active = PATHWAY_SECTIONS.find((s) => s.key === activeKey)!;

  const saveApp = useServerFn(savePlaybookApplication);
  const evalFn = useServerFn(generateEvaluation);

  function persist(next: Record<string, string>) {
    setValues(next);
    saveApp({ data: { sessionId: session.id, application: next } }).catch(() => {});
  }

  const submit = useMutation({
    mutationFn: async () => {
      await saveApp({ data: { sessionId: session.id, application: values } });
      await evalFn({ data: { sessionId: session.id } });
    },
    onSuccess: () => {
      toast.success("Evaluation generated");
      onSaved();
      navigate({ to: "/sessions/$sessionId/report", params: { sessionId: session.id } });
    },
    onError: (e: any) => toast.error(e?.message ?? "Evaluation failed"),
  });

  const filledCount = PATHWAY_SECTIONS.filter((s) => (values[s.key] ?? "").trim().length > 0).length;

  return (
    <div>
      <div className="border border-ink p-5 bg-secondary mb-6">
        <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1">Final stage · Strategyzer engagement orchestration</div>
        <h2 className="text-2xl tracking-tight">Design the engagement pathway</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mt-2 max-w-3xl">
          Orchestrate Strategyzer methodology over time. Think in terms of facilitated working
          sessions, evidence-generating activities, and lightweight interventions — not abstract
          consulting recommendations. The minimum structured intervention that creates meaningful
          progress beats the biggest engagement design.
        </p>
        <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-3">
          {filledCount} / {PATHWAY_SECTIONS.length} sections drafted
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Section nav */}
        <div className="lg:col-span-4 space-y-2">
          {PATHWAY_SECTIONS.map((s) => {
            const filled = (values[s.key] ?? "").trim().length > 0;
            const isActive = s.key === activeKey;
            return (
              <button
                key={s.key}
                onClick={() => setActiveKey(s.key)}
                className={`w-full text-left border border-ink p-3 transition ${
                  isActive ? "bg-ink text-paper" : "bg-paper hover:bg-secondary"
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <div className="text-[10px] uppercase tracking-[0.14em] opacity-70">{s.n}</div>
                  <div
                    className={`w-2 h-2 border ${isActive ? "border-paper" : "border-ink"}`}
                    style={{ backgroundColor: filled ? "var(--brand-lime)" : "transparent" }}
                  />
                </div>
                <div className="text-sm font-medium mt-1 leading-tight">{s.label}</div>
              </button>
            );
          })}

          <div className="border border-ink p-3 bg-paper mt-4">
            <div className="text-[10px] uppercase tracking-[0.14em] font-medium mb-2">Orchestration principles</div>
            <ul className="text-[11px] leading-relaxed list-disc pl-4 space-y-1 text-muted-foreground">
              <li>Smallest sufficient intervention &gt; biggest engagement.</li>
              <li>"No playbook yet" is a valid recommendation.</li>
              <li>Sequence so each step unblocks the next.</li>
              <li>Multiple valid pathways exist — coherence matters more than picking the "right" one.</li>
              <li>Reframe unrealistic success into evidence milestones.</li>
            </ul>
          </div>
        </div>

        {/* Active section editor */}
        <div className="lg:col-span-8">
          <div className="border border-ink bg-paper p-4">
            <div className="flex items-baseline justify-between gap-4 mb-2">
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{active.n}</div>
                <h3 className="text-lg font-medium">{active.label}</h3>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground italic mb-3">{active.hint}</p>
            <div className="relative">
              <textarea
                value={values[active.key] ?? ""}
                onChange={(e) => setValues({ ...values, [active.key]: e.target.value })}
                onBlur={() => persist(values)}
                rows={14}
                placeholder={active.placeholder}
                className="w-full border border-ink bg-paper p-3 pr-12 text-sm font-mono leading-relaxed focus:outline-none focus:bg-secondary"
              />
              <div className="absolute top-2 right-2">
                <VoiceInput onTranscript={(c) => setValues((p) => ({ ...p, [active.key]: appendTranscript(p[active.key] ?? "", c) }))} />
              </div>
            </div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-2">
              Autosaves on blur · {(values[active.key] ?? "").length} chars
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center gap-2 border-t border-ink pt-4 mt-6">
        <div className="text-xs text-muted-foreground max-w-xl">
          The evaluator reads this pathway as your orchestration artifact. Restraint, sequencing
          coherence, and operational realism score above polished consulting language.
        </div>
        <button
          onClick={() => submit.mutate()}
          disabled={submit.isPending || filledCount === 0}
          className="bg-ink text-paper px-5 py-2 text-sm rounded-sm disabled:opacity-50"
        >
          {submit.isPending ? "Generating evaluation…" : "Submit & generate evaluation →"}
        </button>
      </div>
    </div>
  );
}


// ---------- Strategyzer-style visual artifacts ----------

function toLines(s: string): string[] {
  return (s ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
}

function StickyNotes({ items, color, max = 8 }: { items: string[]; color: string; max?: number }) {
  if (items.length === 0) {
    return <div className="text-[10px] text-muted-foreground italic">No notes yet — add one per line below.</div>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.slice(0, max).map((t, i) => (
        <div
          key={i}
          className="text-[10px] leading-snug px-2 py-1.5 border border-ink shadow-[2px_2px_0_var(--ink)] max-w-[140px] break-words"
          style={{ backgroundColor: color, transform: `rotate(${(i % 3 - 1) * 1.2}deg)` }}
        >
          {t}
        </div>
      ))}
      {items.length > max && (
        <div className="text-[10px] text-muted-foreground self-center">+{items.length - max} more</div>
      )}
    </div>
  );
}

function EcosystemArtifact({
  categories,
  value,
  onChange,
}: {
  categories: { key: string; label: string; description: string }[];
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}) {
  const palette = ["var(--brand-yellow)", "var(--brand-lime)", "var(--brand-cyan)", "var(--brand-purple)", "var(--brand-blue)", "var(--brand-red)"];
  const [focus, setFocus] = useState<string>(categories[0]?.key ?? "");
  const focused = categories.find((c) => c.key === focus) ?? categories[0];
  const colorFor = (key: string) => palette[categories.findIndex((c) => c.key === key) % palette.length];

  return (
    <div className="border border-ink bg-paper">
      {/* Ringed map */}
      <div className="relative aspect-square w-full bg-secondary border-b border-ink overflow-hidden">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 200" preserveAspectRatio="none">
          <circle cx="100" cy="100" r="92" fill="none" stroke="var(--ink)" strokeWidth="0.5" strokeDasharray="2 2" />
          <circle cx="100" cy="100" r="64" fill="none" stroke="var(--ink)" strokeWidth="0.5" strokeDasharray="2 2" />
          <circle cx="100" cy="100" r="32" fill="var(--ink)" />
          <text x="100" y="98" textAnchor="middle" fill="var(--paper)" fontSize="6" fontWeight="500" style={{ letterSpacing: "0.1em" }}>CUSTOMER</text>
          <text x="100" y="106" textAnchor="middle" fill="var(--paper)" fontSize="4.5" opacity="0.7">in their ecosystem</text>
        </svg>
        {categories.map((c, i) => {
          const angle = (i / categories.length) * Math.PI * 2 - Math.PI / 2;
          const r = 38; // % from center
          const x = 50 + Math.cos(angle) * r;
          const y = 50 + Math.sin(angle) * r;
          const items = toLines(value[c.key] ?? "");
          const isFocus = focus === c.key;
          return (
            <button
              key={c.key}
              onClick={() => setFocus(c.key)}
              className={`absolute -translate-x-1/2 -translate-y-1/2 border border-ink p-1.5 w-[26%] text-left transition-all ${isFocus ? "ring-2 ring-ink z-10" : "hover:z-10"}`}
              style={{ left: `${x}%`, top: `${y}%`, backgroundColor: colorFor(c.key) }}
            >
              <div className="text-[8px] uppercase tracking-[0.1em] font-medium leading-tight">{c.label}</div>
              <div className="text-[8px] mt-0.5 leading-tight opacity-80">
                {items.length === 0 ? "empty" : `${items.length} note${items.length === 1 ? "" : "s"}`}
              </div>
            </button>
          );
        })}
      </div>

      {/* Editor for focused category */}
      <div className="p-3 space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <div className="text-[10px] uppercase tracking-[0.12em] font-medium">{focused.label}</div>
            <div className="text-[10px] text-muted-foreground italic">{focused.description}</div>
          </div>
          <div className="flex gap-1">
            {categories.map((c) => (
              <button
                key={c.key}
                onClick={() => setFocus(c.key)}
                aria-label={c.label}
                className={`w-3 h-3 border border-ink ${focus === c.key ? "ring-1 ring-ink ring-offset-1" : ""}`}
                style={{ backgroundColor: colorFor(c.key) }}
              />
            ))}
          </div>
        </div>
        <StickyNotes items={toLines(value[focused.key] ?? "")} color={colorFor(focused.key)} />
        <textarea
          value={value[focused.key] ?? ""}
          onChange={(e) => onChange({ ...value, [focused.key]: e.target.value })}
          rows={3}
          placeholder="One actor per line — e.g. 'In-house IT team'"
          className="w-full border border-ink bg-paper p-1.5 text-xs focus:outline-none focus:bg-secondary"
        />
      </div>
    </div>
  );
}

function CustomerProfileArtifact({
  quadrants,
  value,
  onChange,
}: {
  quadrants: { key: "jobs" | "pains" | "gains"; label: string; hint: string }[];
  value: { segmentName: string; jobs: string; pains: string; gains: string };
  onChange: (next: { segmentName: string; jobs: string; pains: string; gains: string }) => void;
}) {
  const colors: Record<"jobs" | "pains" | "gains", string> = {
    jobs: "var(--brand-yellow)",
    pains: "var(--brand-red)",
    gains: "var(--brand-lime)",
  };
  const [focus, setFocus] = useState<"jobs" | "pains" | "gains">("jobs");
  const focused = quadrants.find((q) => q.key === focus)!;


  return (
    <div className="border border-ink bg-paper">
      {/* Segment name strip */}
      <div className="p-2 border-b border-ink bg-secondary">
        <label className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground block">Customer segment</label>
        <input
          value={value.segmentName}
          onChange={(e) => onChange({ ...value, segmentName: e.target.value })}
          placeholder="Name the segment you're profiling…"
          className="w-full bg-transparent text-sm font-medium focus:outline-none"
        />
      </div>

      {/* The circle */}
      <div className="relative aspect-square w-full bg-paper border-b border-ink">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 200">
          {/* outer circle */}
          <circle cx="100" cy="100" r="96" fill="var(--paper)" stroke="var(--ink)" strokeWidth="1.5" />
          {/* Jobs (top half) divider — horizontal line */}
          <line x1="4" y1="100" x2="196" y2="100" stroke="var(--ink)" strokeWidth="1" />
          {/* Pains/Gains divider — vertical line in bottom half only */}
          <line x1="100" y1="100" x2="100" y2="196" stroke="var(--ink)" strokeWidth="1" />
          {/* Tinted fills */}
          <path d="M 100,100 L 4,100 A 96,96 0 0 1 196,100 Z" fill={colors.jobs} fillOpacity="0.35" />
          <path d="M 100,100 L 4,100 A 96,96 0 0 0 100,196 Z" fill={colors.pains} fillOpacity="0.3" />
          <path d="M 100,100 L 100,196 A 96,96 0 0 0 196,100 Z" fill={colors.gains} fillOpacity="0.3" />
          {/* Sector labels */}
          <text x="100" y="22" textAnchor="middle" fontSize="7" fontWeight="600" style={{ letterSpacing: "0.18em" }}>CUSTOMER JOBS</text>
          <text x="44" y="186" textAnchor="middle" fontSize="7" fontWeight="600" style={{ letterSpacing: "0.18em" }}>PAINS</text>
          <text x="156" y="186" textAnchor="middle" fontSize="7" fontWeight="600" style={{ letterSpacing: "0.18em" }}>GAINS</text>
        </svg>

        {/* Sticky-note overlays per sector */}
        <button
          onClick={() => setFocus("jobs")}
          className={`absolute left-1/2 top-[8%] -translate-x-1/2 w-[78%] max-h-[36%] overflow-hidden p-2 text-left ${focus === "jobs" ? "ring-2 ring-ink" : ""}`}
        >
          <StickyNotes items={toLines(value.jobs)} color={colors.jobs} max={5} />
        </button>
        <button
          onClick={() => setFocus("pains")}
          className={`absolute left-[3%] top-[54%] w-[44%] max-h-[40%] overflow-hidden p-2 text-left ${focus === "pains" ? "ring-2 ring-ink" : ""}`}
        >
          <StickyNotes items={toLines(value.pains)} color={colors.pains} max={4} />
        </button>
        <button
          onClick={() => setFocus("gains")}
          className={`absolute right-[3%] top-[54%] w-[44%] max-h-[40%] overflow-hidden p-2 text-left ${focus === "gains" ? "ring-2 ring-ink" : ""}`}
        >
          <StickyNotes items={toLines(value.gains)} color={colors.gains} max={4} />
        </button>
      </div>

      {/* Editor for focused quadrant */}
      <div className="p-3 space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <div className="text-[10px] uppercase tracking-[0.12em] font-medium flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 border border-ink" style={{ backgroundColor: colors[focus] }} />
              {focused.label}
            </div>
            <div className="text-[10px] text-muted-foreground italic">{focused.hint}</div>
          </div>
          <div className="flex gap-1">
            {(["jobs", "pains", "gains"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setFocus(k)}
                aria-label={k}
                className={`w-3 h-3 border border-ink ${focus === k ? "ring-1 ring-ink ring-offset-1" : ""}`}
                style={{ backgroundColor: colors[k] }}
              />
            ))}
          </div>
        </div>
        <textarea
          value={value[focus]}
          onChange={(e) => onChange({ ...value, [focus]: e.target.value })}
          rows={4}
          placeholder={`One ${focus === "jobs" ? "job" : focus === "pains" ? "pain" : "gain"} per line — what the team is actually hearing.`}
          className="w-full border border-ink bg-paper p-1.5 text-xs focus:outline-none focus:bg-secondary"
        />
        <div className="grid grid-cols-3 gap-1 text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
          <div>Jobs: {toLines(value.jobs).length}</div>
          <div>Pains: {toLines(value.pains).length}</div>
          <div>Gains: {toLines(value.gains).length}</div>
        </div>
      </div>
    </div>
  );
}


