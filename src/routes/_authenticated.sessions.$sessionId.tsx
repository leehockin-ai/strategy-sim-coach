import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useRef, useEffect } from "react";
import { GraduationCap, SquarePen, Clock } from "lucide-react";
import { toast } from "sonner";
import { Shell } from "@/components/Shell";
import { getSession, updateSession, sendStakeholderMessage, suggestPlaybook, sendScopingTurn, extractFraming, suggestCanvasCell, saveCanvas, sendPlaybookTeamTurn, respondAsTeamCell, listInterventions } from "@/lib/simulator.functions";
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

import { CHAPTERS, chapterForStep, chapterMeta, stepFromStatus, STEP_LABELS, CHAPTER_ENTRY_STATUS, type ChapterKey, type StepKey } from "@/lib/chapters";

// Map from StepKey (UI grouping) → local render key used by the switch below.
type RenderKey = "framing" | "method" | "dialogue" | "application" | "intervention" | "playbook";
const RENDER_KEY: Record<StepKey, RenderKey> = {
  framing: "framing",
  coaching_approach: "method",
  stakeholder_workspace: "dialogue",
  live_playbook: "application",
  next_step_judgment: "intervention",
  engagement_orchestration: "playbook",
};

function SessionPage() {
  const { sessionId } = Route.useParams();
  const fetchSession = useServerFn(getSession);
  const save = useServerFn(updateSession);
  const qc = useQueryClient();
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["session", sessionId],
    queryFn: () => fetchSession({ data: { sessionId } }),
  });

  const initialStep: StepKey = data ? stepFromStatus((data.session as any).status) : "framing";
  const [activeStep, setActiveStep] = useState<StepKey>(initialStep);
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (data && !initialized) {
      setActiveStep(stepFromStatus((data.session as any).status));
      setInitialized(true);
    }
  }, [data, initialized]);

  if (isLoading || !data) {
    return <Shell><div className="p-10 text-sm text-muted-foreground">Loading session…</div></Shell>;
  }

  const session: any = data.session;
  const scenario = session.scenarios;

  const activeChapter: ChapterKey = chapterForStep(activeStep);
  const chapter = chapterMeta(activeChapter);
  const furthestStep = stepFromStatus(session.status);
  const furthestChapter = chapterMeta(chapterForStep(furthestStep));

  const refreshOnly = () => { refetch(); };

  // Advance sub-tab within a chapter on save; at the last sub-tab of the
  // chapter, do nothing — the coach clicks the "Continue to Chapter X" button.
  function onStepSaved() {
    refetch();
    const idx = chapter.steps.indexOf(activeStep);
    if (idx >= 0 && idx < chapter.steps.length - 1) {
      setActiveStep(chapter.steps[idx + 1]);
    }
  }

  async function goToChapter(targetKey: ChapterKey) {
    const target = chapterMeta(targetKey);
    const nextStep = target.steps[0];
    setActiveStep(nextStep);
    // Only persist status when moving forward past the furthest reached.
    if (target.index > furthestChapter.index) {
      try {
        await save({ data: { sessionId: session.id, status: CHAPTER_ENTRY_STATUS[targetKey] as any } });
        qc.invalidateQueries({ queryKey: ["session", session.id] });
        qc.invalidateQueries({ queryKey: ["my-sessions"] });
      } catch (e: any) {
        toast.error(e?.message ?? "Could not advance chapter");
      }
    }
  }

  const renderKey = RENDER_KEY[activeStep];
  const stepIdxInChapter = chapter.steps.indexOf(activeStep);
  const isLastStepOfChapter = stepIdxInChapter === chapter.steps.length - 1;
  const nextChapter = CHAPTERS.find((c) => c.index === (chapter.index + 1)) ?? null;
  const showChapterTransition = isLastStepOfChapter && nextChapter !== null && chapter.index < 3;
  // MethodStep (coaching_approach) renders its own commit-and-continue button
  // because the commit write must happen atomically with the chapter advance.
  const suppressSharedContinue = activeStep === "coaching_approach";

  return (
    <Shell>
      <ScenarioHeader scenario={scenario} session={session} />
      <ChapterNav
        activeChapter={activeChapter}
        furthestChapterIndex={furthestChapter.index}
        onChange={(k) => setActiveStep(chapterMeta(k).steps[0])}
      />
      {chapter.steps.length > 1 && (
        <SubTabNav
          steps={chapter.steps}
          active={activeStep}
          onChange={setActiveStep}
        />
      )}
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-10">
        <ChapterBanner chapter={activeChapter} />
        {renderKey === "framing" && <FramingStep session={session} messages={data.messages} onSaved={onStepSaved} onRefresh={refetch} />}
        {renderKey === "method" && (
          <MethodStep
            session={session}
            onSaved={onStepSaved}
            onCommitAndAdvance={nextChapter ? () => goToChapter(nextChapter.key) : undefined}
            nextChapterLabel={nextChapter ? `Chapter ${nextChapter.index} — ${nextChapter.label}` : undefined}
          />
        )}
        {renderKey === "dialogue" && <DialogueStep session={session} messages={data.messages} onRefresh={refetch} onContinue={onStepSaved} />}
        {renderKey === "application" && (
          <Chapter2Container
            session={session}
            onSaved={onStepSaved}
            onChangeIntervention={() => setActiveStep("coaching_approach")}
            onAdvanceToChapter3={() => goToChapter("progress")}
          />
        )}
        {renderKey === "intervention" && <InterventionStep session={session} onSaved={onStepSaved} />}
        {renderKey === "playbook" && <EngagementPathwayStep session={session} onSaved={refreshOnly} />}

        {showChapterTransition && nextChapter && !suppressSharedContinue && (
          <div className="mt-12 border-t border-ink pt-8 flex justify-end">
            <button
              onClick={() => goToChapter(nextChapter.key)}
              className="bg-ink text-paper px-6 py-3 text-sm rounded-sm hover:opacity-90"
            >
              Continue to Chapter {nextChapter.index} — {nextChapter.label} →
            </button>
          </div>
        )}
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

function ChapterNav({
  activeChapter, furthestChapterIndex, onChange,
}: { activeChapter: ChapterKey; furthestChapterIndex: number; onChange: (k: ChapterKey) => void }) {
  return (
    <div className="hairline-b sticky top-0 bg-paper z-30">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="flex">
          {CHAPTERS.map((c) => {
            const active = c.key === activeChapter;
            const reachable = c.index <= furthestChapterIndex;
            const disabled = !reachable && !active;
            return (
              <button
                key={c.key}
                onClick={() => !disabled && onChange(c.key)}
                disabled={disabled}
                className={`flex-1 py-4 text-left border-r border-ink last:border-r-0 px-5 transition-colors ${active ? "bg-ink text-paper" : disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-secondary"}`}
              >
                <div className="marker-num text-[10px] uppercase tracking-[0.14em] opacity-70">
                  {String(c.index).padStart(2, "0")} · Chapter {c.index}
                </div>
                <div className="text-base font-medium mt-1">{c.label}</div>
                <div className={`text-[11px] mt-1 leading-snug ${active ? "opacity-70" : "text-muted-foreground"}`}>{c.descriptor}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SubTabNav({
  steps, active, onChange,
}: { steps: StepKey[]; active: StepKey; onChange: (s: StepKey) => void }) {
  return (
    <div className="hairline-b bg-paper">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="flex gap-6">
          {steps.map((s) => {
            const on = s === active;
            return (
              <button
                key={s}
                onClick={() => onChange(s)}
                className={`py-3 text-xs uppercase tracking-[0.12em] border-b-2 transition-colors ${on ? "border-ink text-ink" : "border-transparent text-muted-foreground hover:text-ink"}`}
              >
                {STEP_LABELS[s]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ChapterBanner({ chapter }: { chapter: ChapterKey }) {
  const meta = chapterMeta(chapter);
  const isApply = chapter === "apply";
  const descriptor = isApply
    ? "You've scoped the engagement. Now facilitate the Playbook activity with the team. Ask questions, redirect solution-jumping, and produce meaningful — not necessarily complete — output. Know when enough has been achieved."
    : meta.descriptor;
  return (
    <div className="mb-8 border-l-2 border-ink pl-4">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground marker-num">
        Chapter {meta.index} · {meta.label}
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed mt-1 max-w-3xl">{descriptor}</p>
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

// ---------- Method: Intervention picker (Chapter 1 · Approach) ----------

type PlaybookActivity = {
  n: number;
  section: string;
  label: string;
  kind: "elearning" | "workspace" | string;
  minutes: number;
};

type InterventionRow = {
  slug: string;
  label: string;
  short_description: string;
  long_description: string;
  pathway_type: "pre_playbook" | "playbook" | "evidence_gathering" | "deliberate_pause" | string;
  phase: string | null;
  is_deep_vertical: boolean;
  sort_order: number;
  default_activity_list?: PlaybookActivity[] | null | any;
};

type PathwayType = "pre_playbook" | "playbook" | "evidence_gathering" | "deliberate_pause";

const PATHWAY_CARDS: Array<{ type: PathwayType; title: string; descriptor: string }> = [
  { type: "pre_playbook", title: "The team isn't ready for methodology yet", descriptor: "Alignment, sponsor commitment, or scope negotiation must happen before any Playbook makes sense." },
  { type: "playbook", title: "Run a Strategyzer Playbook", descriptor: "The team is aligned and ready. Select a Playbook that fits the phase they're in." },
  { type: "evidence_gathering", title: "Send the team to gather evidence first", descriptor: "No live intervention yet. The team needs to run interviews, do ecosystem mapping, or gather artifacts before methodology work will land." },
  { type: "deliberate_pause", title: "Deliberate pause", descriptor: "No intervention is the right move right now. Specify what would need to be true before you'd re-engage." },
];

const PHASE_LABEL: Record<string, string> = {
  discovery: "Discovery",
  design: "Design",
  test: "Test",
};

function MethodStep({
  session,
  onSaved,
  onCommitAndAdvance,
  nextChapterLabel,
}: {
  session: any;
  onSaved: () => void;
  onCommitAndAdvance?: () => void | Promise<void>;
  nextChapterLabel?: string;
}) {
  const fetchInterventions = useServerFn(listInterventions);
  const { data: iData } = useQuery({
    queryKey: ["interventions"],
    queryFn: () => fetchInterventions(),
    staleTime: 5 * 60 * 1000,
  });
  const interventions = (iData?.interventions ?? []) as InterventionRow[];

  const storedSlug: string = session.chosen_intervention_slug ?? "";
  const alignmentWs: Record<string, unknown> = (session.alignment_workspace ?? {}) as Record<string, unknown>;
  const storedBespoke: string = (alignmentWs["bespoke_alignment_description"] as string) ?? "";

  const initialPathway: PathwayType | "" = (() => {
    if (!storedSlug) return "";
    if (storedSlug === "bespoke_alignment") return "pre_playbook";
    const row = (iData?.interventions ?? []).find((r: InterventionRow) => r.slug === storedSlug);
    return (row?.pathway_type as PathwayType) ?? "";
  })();

  const [pathway, setPathway] = useState<PathwayType | "">(initialPathway);
  const [slug, setSlug] = useState<string>(storedSlug);
  const [bespokeText, setBespokeText] = useState<string>(storedBespoke);
  const [rationale, setRationale] = useState<string>(session.intervention_rationale ?? session.methodology_rationale ?? "");
  const [suggestion, setSuggestion] = useState<any>(null);

  // Re-derive pathway once interventions load (needed when initial render had no rows).
  useEffect(() => {
    if (pathway || !storedSlug || interventions.length === 0) return;
    if (storedSlug === "bespoke_alignment") { setPathway("pre_playbook"); return; }
    const row = interventions.find((r) => r.slug === storedSlug);
    if (row) setPathway(row.pathway_type as PathwayType);
  }, [interventions, storedSlug, pathway]);

  const save = useServerFn(updateSession);
  const suggest = useServerFn(suggestPlaybook);

  // Backward-compat: keep methodology_choice populated so Chapter 2/3 keep working.
  function backcompatMethodology(): string {
    if (pathway === "playbook" && slug) return slug;
    return "none";
  }

  const hasDraft = rationale.trim().length >= 40 && !!pathway && (
    pathway === "evidence_gathering" ||
    pathway === "deliberate_pause" ||
    (pathway === "pre_playbook" && (slug === "team_alignment_map" || (slug === "bespoke_alignment" && bespokeText.trim().length > 0))) ||
    (pathway === "playbook" && !!slug)
  );

  const suggestMut = useMutation({
    mutationFn: () =>
      suggest({
        data: {
          sessionId: session.id,
          mode: pathway || "single",
          candidateDraft: {
            choice: pathway === "pre_playbook" && slug === "bespoke_alignment"
              ? `bespoke_alignment: ${bespokeText}`
              : (slug || pathway || ""),
            rationale,
          },
        } as any,
      }),
    onSuccess: (res: any) => setSuggestion(res.suggestion),
    onError: (e: any) => toast.error(e.message ?? "Could not generate suggestion"),
  });

  const canCommit =
    !!pathway &&
    rationale.trim().length > 0 &&
    (
      pathway === "evidence_gathering" ||
      pathway === "deliberate_pause" ||
      (pathway === "pre_playbook" && (
        slug === "team_alignment_map" ||
        (slug === "bespoke_alignment" && bespokeText.trim().length > 0)
      )) ||
      (pathway === "playbook" && !!slug)
    );

  function buildSaveData(commit: boolean) {
    const effectiveSlug = pathway === "evidence_gathering"
      ? "evidence_gathering"
      : pathway === "deliberate_pause"
        ? "deliberate_pause"
        : slug;
    const alignmentPatch = (pathway === "pre_playbook" && slug === "bespoke_alignment")
      ? { bespoke_alignment_description: bespokeText }
      : undefined;
    return {
      sessionId: session.id,
      chosenInterventionSlug: effectiveSlug,
      interventionRationale: rationale,
      methodologyChoice: backcompatMethodology(),
      methodologyRationale: rationale,
      ...(alignmentPatch ? { alignmentWorkspacePatch: alignmentPatch } : {}),
      ...(commit ? { commitIntervention: true, status: "method" } : {}),
    };
  }

  const saveDraftMut = useMutation({
    mutationFn: () => save({ data: buildSaveData(false) as any }),
    onSuccess: () => { toast.success("Draft saved"); onSaved(); },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });

  const commitMut = useMutation({
    mutationFn: () => save({ data: buildSaveData(true) as any }),
    onSuccess: async () => {
      toast.success("Intervention committed");
      if (onCommitAndAdvance) await onCommitAndAdvance();
    },
    onError: (e: any) => toast.error(e.message ?? "Commit failed"),
  });

  // Group Playbook interventions by phase (Discovery/Design/Test).
  const playbookRows = interventions.filter((r) => r.pathway_type === "playbook");
  const byPhase: Record<string, InterventionRow[]> = {};
  for (const r of playbookRows) {
    const p = r.phase ?? "other";
    (byPhase[p] ??= []).push(r);
  }
  const teamAlignment = interventions.find((r) => r.slug === "team_alignment_map");

  return (
    <StepShell
      title="Choose your intervention"
      hint="Pick the pathway that fits what you diagnosed in Framing and Stakeholders — then pick a specific intervention (or write your own alignment approach). Your rationale is what reviewers assess; the commit happens when you continue to Chapter 2."
    >
      {/* Pathway cards */}
      <div className="grid md:grid-cols-2 gap-3 mb-6">
        {PATHWAY_CARDS.map((c) => {
          const active = pathway === c.type;
          return (
            <button
              key={c.type}
              type="button"
              onClick={() => {
                setPathway(c.type);
                // Reset second-level selection when pathway changes.
                if (c.type === "evidence_gathering") setSlug("evidence_gathering");
                else if (c.type === "deliberate_pause") setSlug("deliberate_pause");
                else setSlug("");
              }}
              className={`text-left border border-ink p-4 transition-colors ${active ? "bg-ink text-paper" : "hover:bg-secondary"}`}
            >
              <div className="text-sm font-medium mb-1">{c.title}</div>
              <p className="text-xs opacity-80 leading-relaxed">{c.descriptor}</p>
            </button>
          );
        })}
      </div>

      {/* AI second opinion — logged for reviewer */}
      <div className="mb-6 p-4 border border-ink flex items-start justify-between gap-4" style={{ backgroundColor: "var(--brand-yellow)" }}>
        <div className="text-sm">
          <div className="font-medium mb-1 flex items-center gap-2">
            {hasDraft ? "Compare with AI" : "AI second opinion"}
            <span className="text-[10px] uppercase tracking-[0.14em] opacity-70 px-1.5 py-0.5 border border-ink">Logged for reviewer</span>
          </div>
          <div className="text-xs opacity-80">
            {hasDraft
              ? "You've drafted your own reasoning. Pressure-test it against the AI — your reviewer will see both."
              : "Draft your own intervention and rationale first, then pressure-test with AI. Every suggestion shown is recorded."}
          </div>
        </div>
        <button
          type="button"
          onClick={() => suggestMut.mutate()}
          disabled={suggestMut.isPending || !pathway}
          className="bg-ink text-paper px-3 py-1.5 text-xs rounded-sm disabled:opacity-50 shrink-0"
        >
          {suggestMut.isPending ? "Thinking…" : hasDraft ? "Compare" : "Suggest"}
        </button>
      </div>

      {suggestion && (
        <div className="mb-6 border border-ink p-4 bg-secondary">
          <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-2">AI suggestion · confidence {suggestion.confidence ?? "—"}</div>
          {suggestion.playbookId && (
            <div className="font-medium mb-1">
              → {interventions.find((r) => r.slug === suggestion.playbookId)?.label ?? PLAYBOOKS.find((p) => p.id === suggestion.playbookId)?.name ?? suggestion.playbookId}
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

      {/* Second level: specific intervention picker */}
      {pathway === "pre_playbook" && (
        <div className="mb-6 space-y-3">
          <label className="text-xs uppercase tracking-[0.12em] block">Pick an alignment intervention</label>
          {teamAlignment && (
            <button
              type="button"
              onClick={() => setSlug("team_alignment_map")}
              className={`w-full text-left border border-ink p-4 ${slug === "team_alignment_map" ? "bg-ink text-paper" : "hover:bg-secondary"}`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="font-medium text-sm">Team Alignment Map</div>
                <span className="text-[10px] uppercase tracking-[0.14em] opacity-70 px-1.5 py-0.5 border border-current">Suggested default</span>
              </div>
              <p className="text-xs opacity-80">{teamAlignment.short_description}</p>
            </button>
          )}
          <button
            type="button"
            onClick={() => setSlug("bespoke_alignment")}
            className={`w-full text-left border border-ink p-4 ${slug === "bespoke_alignment" ? "bg-ink text-paper" : "hover:bg-secondary"}`}
          >
            <div className="font-medium text-sm mb-1">Or describe a different alignment intervention you'd propose</div>
            <p className="text-xs opacity-80">Write your own alignment approach — sponsor commitment work, scope renegotiation, stakeholder mapping, whatever fits.</p>
          </button>
          {slug === "bespoke_alignment" && (
            <textarea
              value={bespokeText}
              onChange={(e) => setBespokeText(e.target.value)}
              rows={4}
              placeholder="Describe the alignment work you'd propose. Who's in the room, what you're producing, what has to be true when you leave."
              className="w-full border border-ink bg-paper p-3 text-sm focus:outline-none focus:bg-secondary"
            />
          )}
        </div>
      )}

      {pathway === "playbook" && (
        <div className="mb-6 space-y-4">
          <label className="text-xs uppercase tracking-[0.12em] block">Pick a Strategyzer Playbook</label>
          {(["discovery", "design", "test"] as const).map((phase) => {
            const rows = byPhase[phase] ?? [];
            if (rows.length === 0) return null;
            return (
              <div key={phase}>
                <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-2">{PHASE_LABEL[phase]}</div>
                <div className="grid md:grid-cols-2 gap-2">
                  {rows.map((r) => {
                    const active = slug === r.slug;
                    return (
                      <button
                        key={r.slug}
                        type="button"
                        onClick={() => setSlug(r.slug)}
                        className={`text-left border border-ink p-3 ${active ? "bg-ink text-paper" : "hover:bg-secondary"}`}
                      >
                        <div className="flex items-center justify-between mb-1 gap-2">
                          <span className="text-sm font-medium">{r.label}</span>
                          {r.is_deep_vertical && (
                            <span className="text-[9px] uppercase tracking-[0.14em] px-1.5 py-0.5 border border-current shrink-0">Deep vertical</span>
                          )}
                        </div>
                        <p className="text-xs opacity-80 leading-relaxed">{r.short_description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(pathway === "evidence_gathering" || pathway === "deliberate_pause") && (
        <div className="mb-6 border border-ink p-4" style={{ backgroundColor: "var(--brand-lime)" }}>
          <div className="text-xs uppercase tracking-[0.12em] font-medium mb-1">
            {pathway === "evidence_gathering" ? "Restraint through evidence" : "Restraint through pause"}
          </div>
          <p className="text-sm leading-relaxed">
            No specific picker here — commit to the pathway and use the rationale below to spell out what evidence you need
            or what would have to be true before you re-engage.
          </p>
        </div>
      )}

      {/* Rationale */}
      <label className="text-xs uppercase tracking-[0.12em] mb-2 block">
        Why does this intervention fit? <span className="text-red-600">*</span>
      </label>
      <p className="text-[11px] text-muted-foreground mb-2 -mt-1">
        Ground your reasoning in what you diagnosed in Framing and Stakeholders. Required before you continue to Chapter 2.
      </p>
      <div className="relative">
        <textarea
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          rows={5}
          placeholder="Sequencing, scope, evidence focus, restraint. What sequencing matters. What would change your mind."
          className="w-full border border-ink bg-paper p-4 pr-12 text-sm focus:outline-none focus:bg-secondary"
        />
        <div className="absolute top-2 right-2">
          <VoiceInput onTranscript={(c) => setRationale((p) => appendTranscript(p, c))} />
        </div>
      </div>

      <div className="mt-6 flex justify-between items-center gap-3">
        <button
          type="button"
          onClick={() => saveDraftMut.mutate()}
          disabled={saveDraftMut.isPending || !pathway}
          className="border border-ink px-4 py-2 text-sm rounded-sm hover:bg-secondary disabled:opacity-50"
        >
          {saveDraftMut.isPending ? "Saving…" : "Save draft"}
        </button>
        {onCommitAndAdvance && (
          <button
            type="button"
            onClick={() => commitMut.mutate()}
            disabled={commitMut.isPending || !canCommit}
            className="bg-ink text-paper px-5 py-2 text-sm rounded-sm disabled:opacity-50"
            title={!canCommit ? "Pick an intervention and write a rationale first." : undefined}
          >
            {commitMut.isPending ? "Committing…" : `Continue to ${nextChapterLabel ?? "Chapter 2"} →`}
          </button>
        )}
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

const PATHWAY_PLAIN: Record<string, string> = {
  pre_playbook: "Pre-Playbook alignment work",
  playbook: "Strategyzer Playbook facilitation",
  evidence_gathering: "Evidence gathering",
  deliberate_pause: "Deliberate pause",
};

function Chapter2Container({
  session,
  onSaved,
  onChangeIntervention,
  onAdvanceToChapter3,
}: {
  session: any;
  onSaved: () => void;
  onChangeIntervention: () => void;
  onAdvanceToChapter3: () => void | Promise<void>;
}) {
  const fetchInterventions = useServerFn(listInterventions);
  const { data: iData, isLoading } = useQuery({
    queryKey: ["interventions"],
    queryFn: () => fetchInterventions(),
    staleTime: 5 * 60 * 1000,
  });
  const interventions = (iData?.interventions ?? []) as InterventionRow[];
  const slug: string = session.chosen_intervention_slug ?? "";

  if (!slug) {
    return (
      <div className="border border-ink p-6 bg-paper max-w-2xl">
        <div className="text-xs uppercase tracking-[0.12em] font-medium mb-2">No intervention committed yet</div>
        <p className="text-sm mb-4">
          You haven't committed to an intervention yet — return to Chapter 1 → Approach to make a choice
          before starting the working session.
        </p>
        <button
          onClick={onChangeIntervention}
          className="bg-ink text-paper px-4 py-2 text-sm rounded-sm hover:opacity-90"
        >
          Go to Chapter 1 · Approach →
        </button>
      </div>
    );
  }

  // Resolve intervention metadata. bespoke_alignment is synthetic (not in the table).
  let label: string;
  let pathwayType: string;
  let isDeepVertical = false;

  if (slug === "bespoke_alignment") {
    label = "Custom alignment approach";
    pathwayType = "pre_playbook";
    isDeepVertical = true;
  } else {
    const row = interventions.find((r) => r.slug === slug);
    if (!row) {
      if (isLoading) {
        return <div className="p-6 text-sm text-muted-foreground">Loading intervention…</div>;
      }
      // Slug exists but not in table — likely a legacy playbook slug. Treat as shallow playbook.
      label = slug;
      pathwayType = "playbook";
      isDeepVertical = false;
    } else {
      label = row.label;
      pathwayType = row.pathway_type;
      isDeepVertical = !!row.is_deep_vertical;
    }
  }

  const banner = (
    <div className="border border-ink p-4 mb-6 flex flex-wrap items-center justify-between gap-3 bg-paper">
      <div>
        <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Chapter 2 · {PATHWAY_PLAIN[pathwayType] ?? pathwayType}
        </div>
        <div className="text-sm font-medium mt-0.5">{label}</div>
      </div>
      <button
        onClick={onChangeIntervention}
        className="text-xs underline underline-offset-2 hover:opacity-70"
      >
        Change intervention
      </button>
    </div>
  );

  // Route by pathway_type + deep-vertical flag.
  let body: React.ReactNode;
  // The competing_on_business_models branch renders its own Platform-styled
  // shell (blue header + sub-tabs) — suppress the generic Coach Compass banner.
  let suppressBanner = false;

  if (pathwayType === "pre_playbook") {
    body = (
      <AlignmentWorkspace
        session={session}
        interventions={interventions}
        onAdvance={onAdvanceToChapter3}
        onSaved={onSaved}
      />
    );
  } else if (pathwayType === "evidence_gathering") {
    body = <Chapter2Placeholder title="Evidence-gathering plan" note="The evidence-gathering shell will render here after Stage 6." interventionLabel={label} />;
  } else if (pathwayType === "deliberate_pause") {
    body = <Chapter2Placeholder title="Deliberate pause" note="The deliberate-pause shell will render here after Stage 6." interventionLabel={label} />;
  } else if (pathwayType === "playbook" && slug === "competing_on_business_models") {
    const row = interventions.find((r) => r.slug === slug);
    suppressBanner = true;
    body = (
      <PlaybookDeepFacilitation
        session={session}
        intervention={row}
        interventionLabel={label}
        onAdvance={onAdvanceToChapter3}
        onSaved={onSaved}
        onBackToApproach={onChangeIntervention}
      />
    );
  } else if (pathwayType === "playbook" && isDeepVertical) {
    body = (
      <>
        <div className="border border-ink p-3 mb-4 text-xs" style={{ backgroundColor: "var(--brand-yellow)" }}>
          Deep facilitation for this Playbook is coming soon. For now, facilitate the working session using the existing tools.
        </div>
        <ApplicationStep session={session} onSaved={onSaved} />
      </>
    );
  } else if (pathwayType === "playbook") {
    body = <ApplicationStep session={session} onSaved={onSaved} />;
  } else {
    body = <Chapter2Placeholder title="Unknown pathway" note={`Pathway type "${pathwayType}" has no configured Chapter 2 view.`} interventionLabel={label} />;
  }

  return (
    <div>
      {!suppressBanner && banner}
      {body}
    </div>
  );
}


function Chapter2Placeholder({ title, note, interventionLabel }: { title: string; note: string; interventionLabel: string }) {
  return (
    <div className="border border-dashed border-ink p-8 bg-paper">
      <div className="text-xs uppercase tracking-[0.12em] font-medium mb-2">Coming next · {title}</div>
      <div className="text-sm mb-1"><span className="font-medium">Intervention:</span> {interventionLabel}</div>
      <p className="text-sm text-muted-foreground">{note}</p>
    </div>
  );
}


// ============ Alignment Workspace (pre_playbook pathway) ============

type AlignmentSubTab = "setup" | "facilitate" | "interpret";

const ALIGNMENT_SUBTABS: Array<{ key: AlignmentSubTab; label: string }> = [
  { key: "setup", label: "Set up the session" },
  { key: "facilitate", label: "Facilitate the session" },
  { key: "interpret", label: "Interpret alignment state" },
];

const QUADRANTS: Array<{ key: "objectives" | "commitments" | "resources" | "risks"; title: string; hint: string }> = [
  { key: "objectives", title: "Objectives", hint: "What is this team trying to achieve together?" },
  { key: "commitments", title: "Commitments", hint: "What is each stakeholder committing to?" },
  { key: "resources", title: "Resources", hint: "What does the team have (or lack) to succeed?" },
  { key: "risks", title: "Risks", hint: "What could derail this?" },
];

function AlignmentWorkspace({
  session,
  interventions,
  onAdvance,
  onSaved,
}: {
  session: any;
  interventions: InterventionRow[];
  onAdvance: () => void | Promise<void>;
  onSaved: () => void;
}) {
  const save = useServerFn(updateSession);
  const [tab, setTab] = useState<AlignmentSubTab>("setup");

  const ws = (session.alignment_workspace ?? {}) as Record<string, any>;
  const setup = (ws.setup ?? {}) as Record<string, any>;
  const facilitation = (ws.facilitation ?? {}) as Record<string, any>;
  const interpretation = (ws.interpretation ?? {}) as Record<string, any>;

  async function persistSection(section: "setup" | "facilitation" | "interpretation", next: Record<string, any>) {
    try {
      await save({ data: { sessionId: session.id, alignmentWorkspacePatch: { [section]: next } } });
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save");
    }
  }

  return (
    <div>
      {/* thin sub-tab bar — visually distinct from Chapter 1 sub-tabs */}
      <div className="flex gap-4 border-b border-ink/20 mb-6">
        {ALIGNMENT_SUBTABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`pb-2 -mb-px text-xs uppercase tracking-[0.12em] transition-colors ${
                active
                  ? "border-b border-ink text-ink font-medium"
                  : "text-muted-foreground hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "setup" && (
        <AlignmentSetup
          session={session}
          setup={setup}
          onSave={(next) => persistSection("setup", next)}
        />
      )}
      {tab === "facilitate" && (
        <AlignmentFacilitate
          session={session}
          facilitation={facilitation}
          onSave={(next) => persistSection("facilitation", next)}
        />
      )}
      {tab === "interpret" && (
        <AlignmentInterpret
          interpretation={interpretation}
          interventions={interventions}
          onSave={(next) => persistSection("interpretation", next)}
          onAdvance={onAdvance}
        />
      )}
    </div>
  );
}

function AlignmentSetup({
  session,
  setup,
  onSave,
}: {
  session: any;
  setup: Record<string, any>;
  onSave: (next: Record<string, any>) => Promise<void>;
}) {
  const stakeholders: Array<{ name: string; role?: string }> = session.scenarios?.stakeholders ?? [];

  // Seed alignment_gaps from framing + dialogue commitments on first render if empty.
  const seededGaps = useMemo(() => {
    const bits: string[] = [];
    if (session.framing_notes) bits.push(`From Framing:\n${session.framing_notes}`);
    if (session.dialogue_commitments) bits.push(`From Stakeholder workspace:\n${session.dialogue_commitments}`);
    return bits.join("\n\n");
  }, [session.framing_notes, session.dialogue_commitments]);

  const [whoInRoom, setWhoInRoom] = useState<string[]>(setup.who_in_room ?? []);
  const [otherAttendees, setOtherAttendees] = useState<string>(setup.other_attendees ?? "");
  const [framing, setFraming] = useState<string>(setup.framing_brought ?? "");
  const [gaps, setGaps] = useState<string>(setup.alignment_gaps ?? seededGaps);
  const [successLooks, setSuccessLooks] = useState<string>(setup.aligned_enough_definition ?? "");

  const build = () => ({
    who_in_room: whoInRoom,
    other_attendees: otherAttendees,
    framing_brought: framing,
    alignment_gaps: gaps,
    aligned_enough_definition: successLooks,
  });

  function togglePerson(name: string) {
    setWhoInRoom((prev) => {
      const next = prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name];
      onSave({ ...build(), who_in_room: next });
      return next;
    });
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <label className="block text-xs uppercase tracking-[0.12em] font-medium mb-2">Who's in the room?</label>
        <div className="flex flex-wrap gap-2">
          {stakeholders.map((s) => {
            const active = whoInRoom.includes(s.name);
            return (
              <button
                key={s.name}
                type="button"
                onClick={() => togglePerson(s.name)}
                className={`text-xs px-3 py-1.5 border ${active ? "border-ink bg-ink text-paper" : "border-ink/40 text-ink hover:border-ink"}`}
              >
                {s.name}{s.role ? ` · ${s.role}` : ""}
              </button>
            );
          })}
        </div>
        <input
          value={otherAttendees}
          onChange={(e) => setOtherAttendees(e.target.value)}
          onBlur={() => onSave(build())}
          placeholder="Other people not listed above (comma separated)"
          className="mt-3 w-full border border-ink/30 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs uppercase tracking-[0.12em] font-medium mb-2">What framing are you bringing?</label>
        <p className="text-xs text-muted-foreground mb-2">How are you opening this session? What are you telling the team you're here to do together?</p>
        <textarea
          value={framing}
          onChange={(e) => setFraming(e.target.value)}
          onBlur={() => onSave(build())}
          rows={4}
          className="w-full border border-ink/30 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs uppercase tracking-[0.12em] font-medium mb-2">What alignment gaps did you diagnose in Chapter 1?</label>
        <textarea
          value={gaps}
          onChange={(e) => setGaps(e.target.value)}
          onBlur={() => onSave(build())}
          rows={6}
          placeholder="What's not aligned in this team? What did you observe in Framing and Stakeholders that told you methodology work isn't ready yet?"
          className="w-full border border-ink/30 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs uppercase tracking-[0.12em] font-medium mb-2">What would 'aligned enough to proceed' look like?</label>
        <p className="text-xs text-muted-foreground mb-2">How will you know this alignment session worked? What does the team need to agree on before you'd feel confident moving to strategic work?</p>
        <textarea
          value={successLooks}
          onChange={(e) => setSuccessLooks(e.target.value)}
          onBlur={() => onSave(build())}
          rows={3}
          className="w-full border border-ink/30 px-3 py-2 text-sm"
        />
      </div>
    </div>
  );
}

function AlignmentFacilitate({
  session,
  facilitation,
  onSave,
}: {
  session: any;
  facilitation: Record<string, any>;
  onSave: (next: Record<string, any>) => Promise<void>;
}) {
  const stakeholders: Array<{ name: string; role?: string }> = session.scenarios?.stakeholders ?? [];
  const [values, setValues] = useState<Record<string, string>>({
    objectives: facilitation.objectives ?? "",
    commitments: facilitation.commitments ?? "",
    resources: facilitation.resources ?? "",
    risks: facilitation.risks ?? "",
    misalignment_observed: facilitation.misalignment_observed ?? "",
  });
  const [surfaceOpen, setSurfaceOpen] = useState<string | null>(null);

  function updateField(key: string, v: string) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }
  function saveAll() {
    onSave({ ...values });
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {QUADRANTS.map((q) => (
          <div key={q.key} className="border border-ink p-4 bg-paper">
            <div className="text-sm font-medium mb-1">{q.title}</div>
            <div className="text-xs text-muted-foreground mb-3">{q.hint}</div>
            <textarea
              value={values[q.key]}
              onChange={(e) => updateField(q.key, e.target.value)}
              onBlur={saveAll}
              rows={5}
              className="w-full border border-ink/30 px-3 py-2 text-sm"
              placeholder="Capture what emerged during facilitation…"
            />
            <button
              type="button"
              onClick={() => setSurfaceOpen(surfaceOpen === q.key ? null : q.key)}
              className="mt-2 text-xs underline underline-offset-2 hover:opacity-70"
            >
              {surfaceOpen === q.key ? "Close stakeholder view" : "Surface a stakeholder view →"}
            </button>
            {surfaceOpen === q.key && (
              <SurfaceStakeholderView
                sessionId={session.id}
                stakeholders={stakeholders}
                phase={`alignment:${q.key}`}
                quadrantHint={q.hint}
              />
            )}
          </div>
        ))}
      </div>

      <div>
        <label className="block text-xs uppercase tracking-[0.12em] font-medium mb-2">Misalignment observed</label>
        <p className="text-xs text-muted-foreground mb-2">Capture moments during facilitation where the room disagreed or where a stakeholder's position surprised you. This is high signal for how well the alignment work is landing.</p>
        <textarea
          value={values.misalignment_observed}
          onChange={(e) => updateField("misalignment_observed", e.target.value)}
          onBlur={saveAll}
          rows={4}
          className="w-full border border-ink/30 px-3 py-2 text-sm"
        />
      </div>
    </div>
  );
}

function SurfaceStakeholderView({
  sessionId,
  stakeholders,
  phase,
  quadrantHint,
}: {
  sessionId: string;
  stakeholders: Array<{ name: string; role?: string }>;
  phase: string;
  quadrantHint: string;
}) {
  const send = useServerFn(sendStakeholderMessage);
  const [target, setTarget] = useState<string>(stakeholders[0]?.name ?? "");
  const [q, setQ] = useState<string>("");
  const [exchanges, setExchanges] = useState<Array<{ q: string; reply: string; who: string }>>([]);
  const [busy, setBusy] = useState(false);

  async function ask() {
    if (!target || !q.trim()) return;
    setBusy(true);
    try {
      const res: any = await send({ data: { sessionId, stakeholderName: target, candidateMessage: q, phase } });
      setExchanges((prev) => [...prev, { q, reply: res?.message?.content ?? "…", who: target }]);
      setQ("");
    } catch (e: any) {
      toast.error(e?.message ?? "Stakeholder didn't respond");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 border-t border-ink/20 pt-3 space-y-2">
      <div className="flex gap-2">
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="border border-ink/30 px-2 py-1 text-xs"
        >
          {stakeholders.map((s) => (
            <option key={s.name} value={s.name}>{s.name}</option>
          ))}
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Ask ${target || "them"} about: ${quadrantHint}`}
          className="flex-1 border border-ink/30 px-2 py-1 text-xs"
          onKeyDown={(e) => { if (e.key === "Enter") ask(); }}
        />
        <button
          type="button"
          disabled={busy || !q.trim()}
          onClick={ask}
          className="bg-ink text-paper text-xs px-3 py-1 disabled:opacity-40"
        >
          {busy ? "…" : "Ask"}
        </button>
      </div>
      {exchanges.map((ex, i) => (
        <div key={i} className="text-xs bg-paper/60 border border-ink/10 p-2">
          <div className="text-muted-foreground">Coach → {ex.who}: {ex.q}</div>
          <div className="mt-1"><span className="font-medium">{ex.who}:</span> {ex.reply}</div>
        </div>
      ))}
    </div>
  );
}

function AlignmentInterpret({
  interpretation,
  interventions,
  onSave,
  onAdvance,
}: {
  interpretation: Record<string, any>;
  interventions: InterventionRow[];
  onSave: (next: Record<string, any>) => Promise<void>;
  onAdvance: () => void | Promise<void>;
}) {
  const [readiness, setReadiness] = useState<string>(interpretation.readiness ?? "");
  const [ambiguous, setAmbiguous] = useState<string>(interpretation.ambiguous ?? "");
  const [commitments, setCommitments] = useState<Array<{ who: string; what: string }>>(
    interpretation.commitments ?? []
  );
  const [nextMove, setNextMove] = useState<string>(interpretation.next_move ?? "");
  const [nextPlaybookSlug, setNextPlaybookSlug] = useState<string>(interpretation.next_playbook_slug ?? "");
  const [nextMoveRationale, setNextMoveRationale] = useState<string>(interpretation.next_move_rationale ?? "");

  const playbookOptions = interventions.filter((i) => i.pathway_type === "playbook");

  const build = () => ({
    readiness,
    ambiguous,
    commitments,
    next_move: nextMove,
    next_playbook_slug: nextMove === "playbook" ? nextPlaybookSlug : "",
    next_move_rationale: nextMoveRationale,
  });

  function saveNow(overrides: Partial<ReturnType<typeof build>> = {}) {
    onSave({ ...build(), ...overrides });
  }

  function addRow() {
    const next = [...commitments, { who: "", what: "" }];
    setCommitments(next);
    saveNow({ commitments: next });
  }
  function removeRow(i: number) {
    const next = commitments.filter((_, idx) => idx !== i);
    setCommitments(next);
    saveNow({ commitments: next });
  }
  function updateRow(i: number, field: "who" | "what", v: string) {
    const next = commitments.map((c, idx) => (idx === i ? { ...c, [field]: v } : c));
    setCommitments(next);
  }

  const canContinue = !!readiness && !!nextMove && nextMoveRationale.trim().length > 0 &&
    (nextMove !== "playbook" || !!nextPlaybookSlug);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <div className="text-xs uppercase tracking-[0.12em] font-medium mb-2">
          Is the team aligned enough to move to strategic work?
        </div>
        <div className="flex gap-3">
          {[
            { v: "yes", l: "Yes" },
            { v: "partially", l: "Partially" },
            { v: "no", l: "No" },
          ].map((o) => (
            <label key={o.v} className={`text-sm border px-3 py-1.5 cursor-pointer ${readiness === o.v ? "border-ink bg-ink text-paper" : "border-ink/40"}`}>
              <input
                type="radio"
                className="sr-only"
                name="readiness"
                checked={readiness === o.v}
                onChange={() => { setReadiness(o.v); saveNow({ readiness: o.v }); }}
              />
              {o.l}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs uppercase tracking-[0.12em] font-medium mb-2">What's still ambiguous?</label>
        <textarea
          value={ambiguous}
          onChange={(e) => setAmbiguous(e.target.value)}
          onBlur={() => saveNow()}
          rows={3}
          className="w-full border border-ink/30 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <div className="text-xs uppercase tracking-[0.12em] font-medium mb-2">Who committed to what?</div>
        <div className="space-y-2">
          {commitments.map((c, i) => (
            <div key={i} className="flex gap-2 items-start">
              <input
                value={c.who}
                onChange={(e) => updateRow(i, "who", e.target.value)}
                onBlur={() => saveNow()}
                placeholder="Stakeholder name"
                className="w-48 border border-ink/30 px-2 py-1 text-sm"
              />
              <textarea
                value={c.what}
                onChange={(e) => updateRow(i, "what", e.target.value)}
                onBlur={() => saveNow()}
                rows={2}
                className="flex-1 border border-ink/30 px-2 py-1 text-sm"
                placeholder="Commitment"
              />
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="text-xs text-muted-foreground hover:text-ink"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addRow}
            className="text-xs border border-ink/40 px-3 py-1 hover:border-ink"
          >
            + Add commitment
          </button>
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-[0.12em] font-medium mb-2">What's the next move?</div>
        <div className="space-y-2">
          {[
            { v: "playbook", l: "Move to a Strategyzer Playbook" },
            { v: "another_alignment", l: "Run another alignment session" },
            { v: "escalate", l: "Escalate to sponsor / senior stakeholder" },
            { v: "pause", l: "Pause the engagement" },
          ].map((o) => (
            <label key={o.v} className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="next_move"
                checked={nextMove === o.v}
                onChange={() => { setNextMove(o.v); saveNow({ next_move: o.v, next_playbook_slug: o.v === "playbook" ? nextPlaybookSlug : "" }); }}
                className="mt-1"
              />
              <span>{o.l}</span>
            </label>
          ))}
        </div>
        {nextMove === "playbook" && (
          <select
            value={nextPlaybookSlug}
            onChange={(e) => { setNextPlaybookSlug(e.target.value); saveNow({ next_playbook_slug: e.target.value }); }}
            className="mt-3 border border-ink/30 px-3 py-2 text-sm"
          >
            <option value="">Select a Playbook…</option>
            {playbookOptions.map((p) => (
              <option key={p.slug} value={p.slug}>{p.label}</option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label className="block text-xs uppercase tracking-[0.12em] font-medium mb-2">Why is this the right next move given what surfaced today?</label>
        <textarea
          value={nextMoveRationale}
          onChange={(e) => setNextMoveRationale(e.target.value)}
          onBlur={() => saveNow()}
          rows={4}
          className="w-full border border-ink/30 px-3 py-2 text-sm"
        />
      </div>

      <div className="pt-4 border-t border-ink flex justify-end">
        <button
          type="button"
          disabled={!canContinue}
          onClick={() => onAdvance()}
          className="bg-ink text-paper px-6 py-3 text-sm rounded-sm disabled:opacity-40 hover:opacity-90"
          title={!canContinue ? "Fill readiness, next move, and rationale to continue" : ""}
        >
          Continue to Chapter 3 →
        </button>
      </div>
    </div>
  );
}


// ============ Playbook Deep Facilitation (slug-agnostic) ============
// Reusable for any deep-vertical Playbook. The activity list comes from
// interventions.default_activity_list; nothing here is CoBM-specific.

type ActivityMode = "live" | "homework" | "skip";
type ActivitySession = "session_1" | "session_2" | "session_3" | "between";
type PlaybookDeepSubTab = "plan" | "facilitate" | "interpret";

const PLAYBOOK_DEEP_SUBTABS: Array<{ key: PlaybookDeepSubTab; label: string }> = [
  { key: "plan", label: "Plan the Playbook" },
  { key: "facilitate", label: "Facilitate one activity live" },
  { key: "interpret", label: "Interpret what emerged" },
];

const SESSION_OPTIONS: Array<{ v: ActivitySession; l: string }> = [
  { v: "session_1", l: "Session 1" },
  { v: "session_2", l: "Session 2" },
  { v: "session_3", l: "Session 3" },
  { v: "between", l: "Between-session" },
];

function defaultActivityDecision(a: PlaybookActivity): { include: boolean; mode: ActivityMode; session: ActivitySession } {
  return {
    include: true,
    mode: a.kind === "workspace" ? "live" : "homework",
    session: "session_1",
  };
}

function PlaybookDeepFacilitation({
  session,
  intervention,
  interventionLabel,
  onAdvance,
  onSaved,
  onBackToApproach,
}: {
  session: any;
  intervention: InterventionRow | undefined;
  interventionLabel: string;
  onAdvance: () => void | Promise<void>;
  onSaved: () => void;
  onBackToApproach: () => void;
}) {
  const save = useServerFn(updateSession);
  const [tab, setTab] = useState<PlaybookDeepSubTab>("plan");

  const rawList = intervention?.default_activity_list;
  const activities: PlaybookActivity[] = Array.isArray(rawList) ? (rawList as PlaybookActivity[]) : [];

  const plan = (session.playbook_facilitation_plan ?? {}) as { rationale?: string; activities?: Record<string, { include: boolean; mode: ActivityMode; session: ActivitySession }> };
  const activityRun = (session.playbook_activity_run ?? {}) as { activity_n?: number; activity_label?: string; started_at?: string };
  const interp = (session.playbook_interpretation ?? {}) as Record<string, any>;

  const scenarioTitle: string = session.scenarios?.title ?? "Scenario";

  async function savePlanPatch(patch: Record<string, unknown>) {
    try {
      await save({ data: { sessionId: session.id, playbookFacilitationPlanPatch: patch } });
      onSaved();
    } catch (e: any) { toast.error(e?.message ?? "Could not save"); }
  }
  async function saveRunPatch(patch: Record<string, unknown>) {
    try {
      await save({ data: { sessionId: session.id, playbookActivityRunPatch: patch } });
      onSaved();
    } catch (e: any) { toast.error(e?.message ?? "Could not save"); }
  }
  async function saveInterpPatch(patch: Record<string, unknown>) {
    try {
      await save({ data: { sessionId: session.id, playbookInterpretationPatch: patch } });
      onSaved();
    } catch (e: any) { toast.error(e?.message ?? "Could not save"); }
  }

  return (
    <div className="platform-scope -mx-6 md:-mx-10 mb-6">
      {/* 5.1a — Platform header banner */}
      <div
        className="px-6 md:px-10 py-8 md:py-10"
        style={{ background: "var(--platform-blue)", color: "#FFFFFF" }}
      >
        <div className="mx-auto max-w-[1400px]">
          <div className="text-xs opacity-60 mb-2">
            Coach Compass · {scenarioTitle} · Chapter 2
          </div>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-3" style={{ fontFamily: "var(--platform-font)" }}>
            {interventionLabel}
          </h2>
          <button
            onClick={onBackToApproach}
            className="text-sm opacity-90 hover:opacity-100 hover:underline underline-offset-2"
          >
            ← Back to Chapter 1 · Approach
          </button>
        </div>
      </div>

      {/* 5.1b — Platform sub-tab bar */}
      <div
        className="px-6 md:px-10"
        style={{ background: "var(--platform-surface)", borderBottom: "1px solid var(--platform-border)" }}
      >
        <div className="mx-auto max-w-[1400px] flex gap-6">
          {PLAYBOOK_DEEP_SUBTABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="py-4 text-base transition-colors"
                style={{
                  color: active ? "var(--platform-blue)" : "var(--platform-muted)",
                  fontWeight: active ? 600 : 500,
                  borderBottom: active ? "2px solid var(--platform-blue)" : "2px solid transparent",
                  marginBottom: "-1px",
                  fontFamily: "var(--platform-font)",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5.1c — Main content area */}
      <div className="px-6 md:px-10 py-8" style={{ background: "var(--platform-bg)", minHeight: "400px" }}>
        <div className="mx-auto max-w-[1400px]">
          {tab === "plan" && (
            <PlaybookPlan activities={activities} plan={plan} onSave={savePlanPatch} />
          )}
          {tab === "facilitate" && (
            <PlaybookFacilitate
              session={session}
              activities={activities}
              plan={plan}
              activityRun={activityRun}
              onSaveRun={saveRunPatch}
              onSaved={onSaved}
            />
          )}
          {tab === "interpret" && (
            <PlaybookInterpret
              activityRun={activityRun}
              interpretation={interp}
              onSave={saveInterpPatch}
              onAdvance={onAdvance}
            />
          )}
        </div>
      </div>
    </div>
  );
}


const SECTION_SUBTITLES: Record<string, string> = {
  "Get started with the Business Model Canvas":
    "Learn what the Business Model Canvas is and get started using it to describe your business model.",
  "Level up your business model":
    "Sharpen your Canvas with patterns and finer analysis of how your model creates and captures value.",
  "Business model connections":
    "Understand how the building blocks of your Canvas interact and reinforce (or undermine) each other.",
  "Competing on business models":
    "Compare and challenge your business model against competitors and design stronger alternatives.",
};

const ACTIVITY_DESCRIPTION_FALLBACK = "Apply what you've just learned through a simple exercise.";

function PlaybookPlan({
  activities,
  plan,
  onSave,
}: {
  activities: PlaybookActivity[];
  plan: { rationale?: string; activities?: Record<string, { include: boolean; mode: ActivityMode; session: ActivitySession }> };
  onSave: (patch: Record<string, unknown>) => Promise<void>;
}) {
  const [rationale, setRationale] = useState<string>(plan.rationale ?? "");
  const [decisions, setDecisions] = useState<Record<string, { include: boolean; mode: ActivityMode; session: ActivitySession }>>(() => {
    const seed: Record<string, { include: boolean; mode: ActivityMode; session: ActivitySession }> = {};
    for (const a of activities) {
      const stored = plan.activities?.[String(a.n)];
      seed[String(a.n)] = stored ?? defaultActivityDecision(a);
    }
    return seed;
  });

  const sections = useMemo(() => {
    const map = new Map<string, PlaybookActivity[]>();
    for (const a of activities) {
      const list = map.get(a.section) ?? [];
      list.push(a);
      map.set(a.section, list);
    }
    return Array.from(map.entries());
  }, [activities]);

  function updateDecision(n: number, patch: Partial<{ include: boolean; mode: ActivityMode; session: ActivitySession }>) {
    setDecisions((prev) => {
      const key = String(n);
      const merged = { ...prev[key], ...patch };
      if (patch.include === false) merged.mode = "skip";
      if (patch.include === true && prev[key]?.mode === "skip") {
        const a = activities.find((x) => x.n === n);
        merged.mode = a ? defaultActivityDecision(a).mode : "live";
      }
      const next = { ...prev, [key]: merged };
      onSave({ activities: { ...(plan.activities ?? {}), ...next } });
      return next;
    });
  }

  if (activities.length === 0) {
    return (
      <div
        className="p-6 text-sm"
        style={{
          background: "var(--platform-surface)",
          border: "1px solid var(--platform-border)",
          borderRadius: "var(--platform-radius)",
          color: "var(--platform-muted)",
        }}
      >
        No activity list configured for this Playbook.
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      {/* Rationale card */}
      <div
        className="p-8"
        style={{
          background: "var(--platform-surface)",
          border: "1px solid var(--platform-border)",
          borderRadius: "var(--platform-radius)",
        }}
      >
        <h3
          className="mb-2"
          style={{ fontSize: 20, fontWeight: 600, color: "var(--platform-ink)", letterSpacing: "-0.01em" }}
        >
          Your facilitation plan
        </h3>
        <p className="mb-4" style={{ fontSize: 14, color: "var(--platform-muted)", maxWidth: "60ch", lineHeight: 1.55 }}>
          Why this sequencing and pacing? Which activities matter most for this team, and which are lower priority given what you diagnosed in Chapter 1?
        </p>
        <textarea
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          onBlur={() => onSave({ rationale })}
          rows={5}
          className="w-full"
          style={{
            minHeight: 120,
            padding: 16,
            fontFamily: "var(--platform-font)",
            fontSize: 14,
            lineHeight: 1.55,
            color: "var(--platform-ink)",
            background: "var(--platform-surface)",
            border: "1px solid var(--platform-border)",
            borderRadius: "var(--platform-radius)",
            outline: "none",
            resize: "vertical",
          }}
        />
      </div>

      {/* Section blocks */}
      {sections.map(([section, acts]) => (
        <section key={section}>
          <h2 style={{ fontSize: 26, fontWeight: 600, color: "var(--platform-ink)", letterSpacing: "-0.015em" }}>
            {section}
          </h2>
          <p className="mt-1 mb-4" style={{ fontSize: 14, color: "var(--platform-muted)", maxWidth: "70ch" }}>
            {SECTION_SUBTITLES[section] ?? "Work through these activities together with the team."}
          </p>
          <div>
            {acts.map((a) => {
              const d = decisions[String(a.n)] ?? defaultActivityDecision(a);
              const isWorkspace = a.kind === "workspace";
              const thumbBg = isWorkspace ? "var(--platform-blue)" : "var(--platform-aqua)";
              const Icon = isWorkspace ? SquarePen : GraduationCap;
              const dimmed = !d.include;
              return (
                <div
                  key={a.n}
                  className="flex gap-6 py-6"
                  style={{ borderBottom: "1px solid var(--platform-border)" }}
                >
                  {/* Thumbnail */}
                  <div
                    className="relative shrink-0 flex items-center justify-center"
                    style={{
                      width: "var(--platform-thumb-size)",
                      height: "var(--platform-thumb-size)",
                      background: thumbBg,
                      borderRadius: "var(--platform-radius)",
                      opacity: dimmed ? 0.45 : 1,
                    }}
                  >
                    <Icon size={46} color="#fff" strokeWidth={2.25} />
                    <div
                      className="absolute flex items-center justify-center"
                      style={{
                        top: 8,
                        left: 8,
                        width: 24,
                        height: 24,
                        background: "var(--platform-badge-bg)",
                        borderRadius: "999px",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--platform-ink)",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                      }}
                    >
                      {a.n}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0" style={{ opacity: dimmed ? 0.5 : 1 }}>
                    <div style={{ fontSize: 18, fontWeight: 600, color: "var(--platform-blue)", lineHeight: 1.3 }}>
                      {a.label}
                    </div>
                    <div className="mt-1" style={{ fontSize: 14, color: "var(--platform-muted)", lineHeight: 1.5 }}>
                      {ACTIVITY_DESCRIPTION_FALLBACK}
                    </div>
                    <div className="mt-2 flex items-center gap-2" style={{ color: "var(--platform-muted)" }}>
                      <Clock size={14} strokeWidth={2} />
                      <span style={{ fontSize: 13 }}>{a.minutes} min</span>
                      <span style={{ fontSize: 13 }}>·</span>
                      <span style={{ fontSize: 13, textTransform: "capitalize" }}>
                        {isWorkspace ? "Workspace" : "E-learning"}
                      </span>
                    </div>

                    {/* Coach decisions */}
                    <div className="mt-4 flex flex-wrap items-center gap-4">
                      <label className="flex items-center gap-2" style={{ fontSize: 13, color: "var(--platform-ink)" }}>
                        <input
                          type="checkbox"
                          checked={d.include}
                          onChange={(e) => updateDecision(a.n, { include: e.target.checked })}
                          style={{ accentColor: "var(--platform-blue)" }}
                        />
                        Include
                      </label>

                      <div
                        className="flex"
                        style={{
                          border: "1px solid var(--platform-border)",
                          borderRadius: "var(--platform-radius-pill)",
                          overflow: "hidden",
                          background: "var(--platform-surface)",
                        }}
                      >
                        {(["live", "homework", "skip"] as ActivityMode[]).map((m) => {
                          const active = d.mode === m;
                          return (
                            <button
                              key={m}
                              type="button"
                              disabled={!d.include && m !== "skip"}
                              onClick={() => updateDecision(a.n, { mode: m })}
                              style={{
                                padding: "6px 14px",
                                fontSize: 12,
                                fontWeight: 600,
                                fontFamily: "var(--platform-font)",
                                background: active ? "var(--platform-blue)" : "transparent",
                                color: active ? "#fff" : "var(--platform-muted)",
                                border: "none",
                                cursor: d.include || m === "skip" ? "pointer" : "not-allowed",
                              }}
                            >
                              {m === "live" ? "Live" : m === "homework" ? "Homework" : "Skip"}
                            </button>
                          );
                        })}
                      </div>

                      <select
                        value={d.session}
                        disabled={!d.include}
                        onChange={(e) => updateDecision(a.n, { session: e.target.value as ActivitySession })}
                        style={{
                          padding: "6px 12px",
                          fontSize: 13,
                          fontFamily: "var(--platform-font)",
                          color: "var(--platform-ink)",
                          background: "var(--platform-surface)",
                          border: "1px solid var(--platform-border)",
                          borderRadius: "var(--platform-radius)",
                          outline: "none",
                        }}
                      >
                        {SESSION_OPTIONS.map((o) => (
                          <option key={o.v} value={o.v}>{o.l}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}


function PlaybookFacilitate({
  session,
  activities,
  plan,
  activityRun,
  onSaveRun,
  onSaved,
}: {
  session: any;
  activities: PlaybookActivity[];
  plan: { activities?: Record<string, { include: boolean; mode: ActivityMode; session: ActivitySession }> };
  activityRun: { activity_n?: number; activity_label?: string; started_at?: string };
  onSaveRun: (patch: Record<string, unknown>) => Promise<void>;
  onSaved: () => void;
}) {
  const liveActivities = activities.filter((a) => plan.activities?.[String(a.n)]?.mode === "live");

  if (liveActivities.length === 0) {
    return (
      <div
        className="mx-auto max-w-2xl"
        style={{
          background: "var(--platform-surface)",
          border: "1px solid var(--platform-border)",
          borderRadius: "var(--platform-radius)",
          padding: "32px 36px",
          fontFamily: "var(--platform-font)",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "4px 12px",
            borderRadius: "var(--platform-radius-pill)",
            background: "color-mix(in oklab, var(--platform-blue) 10%, transparent)",
            color: "var(--platform-blue)",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          Nothing to facilitate yet
        </div>
        <h3 style={{ fontSize: 22, fontWeight: 600, color: "var(--platform-ink)", marginBottom: 10, letterSpacing: "-0.01em" }}>
          Pick which activities you'll run live
        </h3>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--platform-muted)", marginBottom: 20 }}>
          Head back to <span style={{ color: "var(--platform-blue)", fontWeight: 500 }}>Plan the Playbook</span> and
          mark at least one activity as <span style={{ fontWeight: 600, color: "var(--platform-ink)" }}>Live</span>.
          Live activities are the ones you'll facilitate with the team in this session — everything else runs as
          homework or gets skipped. Once one is marked Live, it will appear here ready to run.
        </p>
      </div>
    );
  }

  const selectedN = activityRun.activity_n;
  const selected = activities.find((a) => a.n === selectedN);

  async function pick(n: number) {
    const a = activities.find((x) => x.n === n);
    if (!a) return;
    const patch: Record<string, unknown> = {
      activity_n: n,
      activity_label: a.label,
    };
    if (!activityRun.started_at) patch.started_at = new Date().toISOString();
    await onSaveRun(patch);
  }

  return (
    <div style={{ fontFamily: "var(--platform-font)" }}>
      {/* Activity picker — Platform-styled pill group */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--platform-muted)",
            marginBottom: 10,
          }}
        >
          Which live activity are you running now?
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {liveActivities.map((a) => {
            const isActive = a.n === selectedN;
            const isWorkspace = a.kind === "workspace";
            return (
              <button
                key={a.n}
                type="button"
                onClick={() => pick(a.n)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 16px",
                  borderRadius: "var(--platform-radius-pill)",
                  border: isActive ? "1px solid var(--platform-blue)" : "1px solid var(--platform-border)",
                  background: isActive ? "var(--platform-blue)" : "var(--platform-surface)",
                  color: isActive ? "#FFFFFF" : "var(--platform-ink)",
                  fontSize: 14,
                  fontWeight: 500,
                  fontFamily: "var(--platform-font)",
                  cursor: "pointer",
                  transition: "all 120ms ease",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 22,
                    height: 22,
                    borderRadius: "999px",
                    background: isActive ? "#FFFFFF" : (isWorkspace ? "var(--platform-blue)" : "var(--platform-aqua)"),
                    color: isActive ? "var(--platform-blue)" : "#FFFFFF",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {a.n}
                </span>
                <span>{a.label}</span>
                <span style={{ opacity: 0.7, fontSize: 12 }}>· {a.minutes} min</span>
              </button>
            );
          })}
        </div>
      </div>

      {selected && (
        <>
          {/* Now-facilitating header card */}
          <div
            style={{
              background: "var(--platform-surface)",
              border: "1px solid var(--platform-border)",
              borderRadius: "var(--platform-radius)",
              padding: "18px 22px",
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 16,
              fontFamily: "var(--platform-font)",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "var(--platform-radius)",
                background: selected.kind === "workspace" ? "var(--platform-blue)" : "var(--platform-aqua)",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {selected.kind === "workspace" ? <SquarePen size={22} strokeWidth={1.75} /> : <GraduationCap size={22} strokeWidth={1.75} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--platform-muted)", marginBottom: 2 }}>
                Now facilitating · Activity {selected.n}
              </div>
              <div style={{ fontSize: 18, fontWeight: 600, color: "var(--platform-blue)", letterSpacing: "-0.01em" }}>
                {selected.label}
              </div>
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--platform-muted)", fontSize: 13, flexShrink: 0 }}>
              <Clock size={14} strokeWidth={1.75} />
              {selected.minutes} min · {selected.kind === "workspace" ? "Workspace" : "E-learning"}
            </div>
          </div>

          {/* Working session — Coach Compass UI. Font-family reset marks the intentional seam. */}
          <div style={{ fontFamily: "var(--font-sans)", color: "var(--ink)" }}>
            <ApplicationStep session={session} onSaved={onSaved} />
          </div>
        </>
      )}
    </div>
  );
}

function PlaybookInterpret({
  activityRun,
  interpretation,
  onSave,
  onAdvance,
}: {
  activityRun: { activity_n?: number };
  interpretation: Record<string, any>;
  onSave: (patch: Record<string, unknown>) => Promise<void>;
  onAdvance: () => void | Promise<void>;
}) {
  const [surfaced, setSurfaced] = useState<string>(interpretation.surfaced ?? "");
  const [landing, setLanding] = useState<string>(interpretation.landing ?? "");
  const [landingWhy, setLandingWhy] = useState<string>(interpretation.landing_explanation ?? "");
  const [ready, setReady] = useState<string>(interpretation.ready_for_next ?? "");
  const [readyBlock, setReadyBlock] = useState<string>(interpretation.ready_blocker ?? "");
  const [homework, setHomework] = useState<string>(interpretation.homework ?? "");

  if (!activityRun.activity_n) {
    return (
      <div
        className="p-8"
        style={{
          background: "var(--platform-surface)",
          border: "1px solid var(--platform-border)",
          borderRadius: "var(--platform-radius)",
          fontFamily: "var(--platform-font)",
        }}
      >
        <div
          className="inline-flex items-center px-3 py-1 mb-4 text-xs font-medium"
          style={{
            background: "var(--platform-blue)",
            color: "#fff",
            borderRadius: "var(--platform-radius-pill)",
            letterSpacing: "0.02em",
          }}
        >
          Nothing to interpret yet
        </div>
        <h3 className="text-[22px] font-semibold mb-2" style={{ color: "var(--platform-ink)" }}>
          Facilitate an activity first
        </h3>
        <p className="text-sm max-w-xl" style={{ color: "var(--platform-muted)" }}>
          Open the Facilitate sub-tab and run at least one activity with the team. Once you've done that, come back here to capture what surfaced and decide what comes next.
        </p>
      </div>
    );
  }

  function saveAll(overrides: Record<string, unknown> = {}) {
    onSave({
      surfaced, landing, landing_explanation: landingWhy,
      ready_for_next: ready, ready_blocker: readyBlock,
      homework,
      ...overrides,
    });
  }

  const canContinue =
    surfaced.trim().length > 0 &&
    !!landing && landingWhy.trim().length > 0 &&
    !!ready;

  const cardStyle: React.CSSProperties = {
    background: "var(--platform-surface)",
    border: "1px solid var(--platform-border)",
    borderRadius: "var(--platform-radius)",
    fontFamily: "var(--platform-font)",
  };
  const textareaStyle: React.CSSProperties = {
    background: "#fff",
    border: "1px solid var(--platform-border)",
    borderRadius: "var(--platform-radius)",
    color: "var(--platform-ink)",
    fontFamily: "var(--platform-font)",
    fontSize: "14px",
    lineHeight: 1.55,
    padding: "10px 12px",
    width: "100%",
    outline: "none",
  };

  function Pill({
    active,
    onClick,
    children,
  }: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="text-sm px-4 py-2 transition-colors"
        style={{
          background: active ? "var(--platform-blue)" : "#fff",
          color: active ? "#fff" : "var(--platform-ink)",
          border: `1px solid ${active ? "var(--platform-blue)" : "var(--platform-border)"}`,
          borderRadius: "var(--platform-radius-pill)",
          fontFamily: "var(--platform-font)",
          fontWeight: active ? 600 : 500,
        }}
      >
        {children}
      </button>
    );
  }

  return (
    <div
      className="space-y-6 max-w-3xl mx-auto"
      style={{ fontFamily: "var(--platform-font)", color: "var(--platform-ink)" }}
    >
      {/* Field 1 — surfaced */}
      <div className="p-6" style={cardStyle}>
        <label className="block text-[18px] font-semibold mb-1" style={{ color: "var(--platform-blue)" }}>
          What did this activity actually surface?
        </label>
        <p className="text-sm mb-3" style={{ color: "var(--platform-muted)" }}>
          What did the team produce, what did they wrestle with, what did they say that told you the exercise did or didn't land?
        </p>
        <textarea
          value={surfaced}
          onChange={(e) => setSurfaced(e.target.value)}
          onBlur={() => saveAll()}
          rows={5}
          style={textareaStyle}
        />
      </div>

      {/* Field 2 — engagement read */}
      <div className="p-6" style={cardStyle}>
        <div className="text-[18px] font-semibold mb-3" style={{ color: "var(--platform-blue)" }}>
          Team hit the exercise well vs went through the motions
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { v: "hit", l: "Hit it well" },
            { v: "mixed", l: "Mixed" },
            { v: "motions", l: "Went through the motions" },
          ].map((o) => (
            <Pill
              key={o.v}
              active={landing === o.v}
              onClick={() => { setLanding(o.v); saveAll({ landing: o.v }); }}
            >
              {o.l}
            </Pill>
          ))}
        </div>
        <textarea
          value={landingWhy}
          onChange={(e) => setLandingWhy(e.target.value)}
          onBlur={() => saveAll()}
          rows={3}
          placeholder="What did you observe that led you to this read?"
          style={textareaStyle}
        />
      </div>

      {/* Field 3 — ready for next */}
      <div className="p-6" style={cardStyle}>
        <div className="text-[18px] font-semibold mb-3" style={{ color: "var(--platform-blue)" }}>
          Ready for the next activity in your plan?
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { v: "yes", l: "Yes" },
            { v: "revisit", l: "Needs revisiting" },
            { v: "no", l: "No" },
          ].map((o) => (
            <Pill
              key={o.v}
              active={ready === o.v}
              onClick={() => { setReady(o.v); saveAll({ ready_for_next: o.v }); }}
            >
              {o.l}
            </Pill>
          ))}
        </div>
        {(ready === "revisit" || ready === "no") && (
          <textarea
            value={readyBlock}
            onChange={(e) => setReadyBlock(e.target.value)}
            onBlur={() => saveAll()}
            rows={3}
            placeholder="What needs to happen before you'd move on?"
            style={{ ...textareaStyle, marginTop: "12px" }}
          />
        )}
      </div>

      {/* Field 4 — homework */}
      <div className="p-6" style={cardStyle}>
        <label className="block text-[18px] font-semibold mb-1" style={{ color: "var(--platform-blue)" }}>
          What should be homework before you reconvene?
        </label>
        <p className="text-sm mb-3" style={{ color: "var(--platform-muted)" }}>
          If anything. Not every activity generates homework — say "nothing" if that's the honest answer.
        </p>
        <textarea
          value={homework}
          onChange={(e) => setHomework(e.target.value)}
          onBlur={() => saveAll()}
          rows={3}
          style={textareaStyle}
        />
      </div>

      {/* Continue */}
      <div className="pt-2 flex justify-end">
        <button
          type="button"
          disabled={!canContinue}
          onClick={() => onAdvance()}
          className="px-6 py-3 text-sm font-semibold transition-opacity"
          style={{
            background: "var(--platform-blue)",
            color: "#fff",
            borderRadius: "var(--platform-radius-pill)",
            fontFamily: "var(--platform-font)",
            opacity: canContinue ? 1 : 0.4,
            cursor: canContinue ? "pointer" : "not-allowed",
          }}
          title={!canContinue ? "Fill surfaced, landing + explanation, and ready-for-next to continue" : ""}
        >
          Continue to Chapter 3 →
        </button>
      </div>
    </div>
  );
}

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
        title="Live Playbook Facilitation"
        hint="You're in the room with the team now. Sometimes the right move is no canvas at all — restraint scores above forced facilitation."
      >
        {mode === "none" ? (
          <div className="border border-ink p-5" style={{ backgroundColor: "var(--brand-lime)" }}>
            <div className="text-xs uppercase tracking-[0.12em] font-medium mb-2">No canvas yet — by design</div>
            <p className="text-sm leading-relaxed">
              You chose to gather more evidence before activating a playbook. Stay here while you work the
              Stakeholder Workspace, then return to Coaching Approach when you're ready to commit. Knowing when NOT
              to run a playbook is itself rewarded.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No canvas has been mapped to your chosen approach yet. Return to Coaching Approach if you'd like to commit to a playbook.</p>
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
      <div className="border border-ink p-5 mb-6" style={{ backgroundColor: "var(--brand-blue)", color: "var(--paper)" }}>
        <div className="text-[10px] uppercase tracking-[0.14em] mb-1 opacity-80">Step 04 · The intervention</div>
        <h2 className="text-2xl tracking-tight">Live Playbook Facilitation</h2>
        <p className="text-sm leading-relaxed mt-2 max-w-3xl opacity-95">
          You are now <strong>in</strong> the session. You're not designing a workshop anymore — you are actively
          guiding the team through Strategyzer methodology. Run the playbook you committed to in Coaching Approach,
          respond to what the team gives you, narrow segments, redirect solution-jumping, simplify assumptions, and
          surface evidence gaps in real time. This is the core of the simulation.
        </p>
      </div>
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
      title="Next-Step Judgment"
      hint="The intervention has already happened in Live Playbook Facilitation. Now interpret what emerged. What did the session actually reveal? What is realistically true now? What should the team do next — and just as importantly, what should NOT happen yet? Then make the call: continue, pivot, escalate, or stop. Anchor your reasoning in the stakeholder commitments below."
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
          {submit.isPending ? "Saving…" : "Continue to engagement orchestration →"}
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
  const qc = useQueryClient();

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
      qc.invalidateQueries({ queryKey: ["my-sessions"] });
      qc.invalidateQueries({ queryKey: ["session", session.id] });
      onSaved();
      navigate({ to: "/sessions/$sessionId/report", params: { sessionId: session.id } });
    },
    onError: (e: any) => toast.error(e?.message ?? "Evaluation failed"),
  });

  const filledCount = PATHWAY_SECTIONS.filter((s) => (values[s.key] ?? "").trim().length > 0).length;

  return (
    <div>
      <div className="border border-ink p-5 bg-secondary mb-6">
        <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1">Step 06 · Portfolio-level orchestration</div>
        <h2 className="text-2xl tracking-tight">Engagement Orchestration</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mt-2 max-w-3xl">
          Design the smallest responsible pathway forward. How would you guide this engagement over time?
          Sequence future playbooks, workshop cadence, evidence checkpoints, stakeholder alignment moves, and
          coaching rhythm against real organizational readiness. This is orchestration thinking — not picking
          another playbook, and not tactical facilitation. The minimum structured pathway that creates
          meaningful progress beats the biggest engagement design.
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


