import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ExternalLink, RefreshCcw, Send } from "lucide-react";
import { toast } from "sonner";
import { Shell } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { BRIEF_FIELDS } from "@/lib/scope-brief";
import { customerProfileWork, reconcileTeamWork, type WorkSource } from "@/lib/team-work";
import {
  ALL_STEPS,
  TOTAL_STEPS,
  planBatch,
  isSettled,
  MAX_STEP_ATTEMPTS,
  type StepState,
} from "@/lib/assessment-job";
import { runBeginnerPilot } from "@/lib/beginner-pilot.functions";
import {
  PILOT_CASE,
  PILOT_PEOPLE,
  PILOT_PLAYBOOK_URL,
  beginMeetingOne,
  beginMeetingTwo,
  claimCheckpoint,
  completeCheckpoint,
  event,
  finishMeetingTwo,
  handoff,
  newPilot,
  profileWork,
  saveScope,
  stopPilot,
  turnSchema,
  type PilotState,
} from "@/lib/beginner-pilot";
import { mutatePilot, readPilot, writePilot } from "@/lib/beginner-pilot-storage";

export const Route = createFileRoute("/_authenticated/pilot")({
  head: () => ({
    meta: [
      { title: "ShiftNest Practice Pilot · Coach Compass" },
      {
        name: "description",
        content:
          "Opt-in beginner practice across two coaching meetings with a fictional Customer Profile team.",
      },
      { property: "og:title", content: "ShiftNest Practice Pilot · Coach Compass" },
      {
        property: "og:description",
        content:
          "Coach a fictional team through two Customer Profile meetings and compare its client update.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PilotPage,
});

function PilotPage() {
  const run = useServerFn(runBeginnerPilot);
  const [owner, setOwner] = useState<string | null>(null),
    [state, setState] = useState<PilotState | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [reason, setReason] = useState(""),
    [error, setError] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const id = data.user?.id ?? null;
      setOwner(id);
      if (id)
        try {
          const saved = readPilot(localStorage, id);
          setState(saved);
          if (saved?.pendingTurn) setMessage(saved.pendingTurn.text);
        } catch (e) {
          setError((e as Error).message);
        }
    });
  }, []);
  const commit = async (fn: (s: PilotState) => PilotState) => {
    if (!owner) return null;
    try {
      const next = await mutatePilot(owner, fn);
      setState(next);
      setError(null);
      return next;
    } catch (e) {
      const m = (e as Error).message;
      setError(m);
      toast.error(m);
      return null;
    }
  };
  const ai = async (
    s: PilotState,
    kind: "turn" | "update" | "assessment",
    text = "",
    step?: string,
  ) => {
    const r = await run({ data: { state: s, kind, message: text, step } });
    if (!r.ok) throw Object.assign(new Error(r.error), { status: r.status });
    return r.output;
  };
  const say = async () => {
    if (!state || !message.trim()) return;
    const meeting: "scope" | "one" | "two" =
      state.phase === "two" ? "two" : state.phase === "one" ? "one" : "scope";
    const pending =
      state.pendingTurn?.text === message.trim()
        ? state.pendingTurn
        : { key: crypto.randomUUID(), text: message.trim(), meeting };
    const queued = await commit((s) => ({ ...s, pendingTurn: pending }));
    if (!queued) return;
    setBusy(true);
    try {
      const raw = turnSchema.parse(await ai(queued, "turn", pending.text));
      await commit((s) => {
        if (s.pendingTurn?.key !== pending.key) return s;
        const names = new Set(PILOT_PEOPLE.map((p) => p.name));
        const coach = event(pending.meeting, "coach", "Coach", pending.text);
        const replies = raw.responses
          .filter((r) => names.has(r.participant) && r.text.trim())
          .slice(0, 3)
          .map((r) => event(pending.meeting, "team", r.participant, r.text.trim().slice(0, 900)));
        if (!replies.length)
          throw new Error("The team did not give a usable reply. Retry the same message.");
        if (pending.meeting === "scope")
          return { ...s, pendingTurn: null, events: [...s.events, coach, ...replies] };
        const sources: WorkSource[] = [
          ...s.events
            .filter((e) => e.actor === "team")
            .map((e) => ({ id: e.id, speaker: e.speaker, text: e.text, kind: "team" as const })),
          ...replies.map((r, i) => ({
            id: `response:${i}`,
            speaker: r.speaker,
            text: r.text,
            kind: "team" as const,
          })),
        ];
        const proposed = customerProfileWork(raw.work, sources),
          current = profileWork(s);
        const mapped = proposed && {
          ...proposed,
          sections: proposed.sections.map((sec) => ({
            ...sec,
            items: sec.items.map((item) =>
              item.sourceId.startsWith("response:")
                ? {
                    ...item,
                    sourceId: replies[Number(item.sourceId.split(":")[1])]?.id ?? item.sourceId,
                  }
                : item,
            ),
          })),
        };
        const work = reconcileTeamWork(
          current,
          mapped,
          replies.map((r) => ({
            id: r.id,
            speaker: r.speaker,
            text: r.text,
            kind: "team" as const,
          })),
        );
        const changed = JSON.stringify(work) !== JSON.stringify(current);
        return {
          ...s,
          pendingTurn: null,
          events: [...s.events, coach, ...replies],
          work: changed ? work : s.work,
          history: changed ? [...s.history, { revision: s.history.length + 1, work }] : s.history,
        };
      });
      setMessage("");
    } catch (e) {
      setError((e as Error).message);
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const generate = async () => {
    if (!state) return;
    const token = crypto.randomUUID(),
      claimed = await commit((s) => claimCheckpoint(s, token));
    if (!claimed || claimed.checkpoint?.status === "ready") return;
    setBusy(true);
    try {
      const raw = await ai(claimed, "update");
      const saved = await commit((s) => completeCheckpoint(s, token, raw));
      if (!saved)
        throw new Error("Client update validation failed; no generated artifact was saved.");
    } catch (e) {
      const err = e as Error & { status?: number };
      const retryable = err.status === 429 || (err.status ?? 0) >= 500;
      const blocked = [401, 402, 403].includes(err.status ?? 0);
      await commit((s) =>
        s.checkpoint?.token === token
          ? {
              ...s,
              checkpoint: {
                ...s.checkpoint,
                status: "failed",
                token: null,
                leaseUntil: 0,
                error: err.message,
                blocked,
                retryAt: retryable
                  ? Date.now() + Math.min(60000, 5000 * 2 ** (s.checkpoint.attempts - 1))
                  : Date.now(),
              },
            }
          : s,
      );
    } finally {
      setBusy(false);
    }
  };
  const assess = async () => {
    if (!state) return;
    let current = await commit((s) => {
      if (s.assessment?.lease_until && Date.parse(s.assessment.lease_until) > Date.now())
        throw new Error(
          "Assessment already running in another tab. Resume after its lease expires.",
        );
      return s.assessment
        ? {
            ...s,
            assessment:
              s.assessment.status === "failed"
                ? {
                    ...s.assessment,
                    steps: Object.fromEntries(
                      Object.entries(s.assessment.steps).filter(([, step]) => isSettled(step)),
                    ),
                    status: "running" as const,
                    error: null,
                    lease_until: new Date(Date.now() + 300000).toISOString(),
                  }
                : { ...s.assessment, lease_until: new Date(Date.now() + 300000).toISOString() },
          }
        : {
            ...s,
            assessmentInput: structuredClone(s),
            assessment: {
              id: crypto.randomUUID(),
              session_id: s.id,
              owner_id: s.ownerId,
              status: "running",
              steps: {},
              live_evidence: null,
              error: null,
              evaluation_id: null,
              lease_until: new Date(Date.now() + 300000).toISOString(),
              run_count: 1,
            },
          };
    });
    if (!current) return;
    setBusy(true);
    try {
      for (
        let batchCount = 0;
        batchCount < 12 && current?.assessment?.status === "running";
        batchCount++
      ) {
        const input = current.assessmentInput;
        if (!input) throw new Error("Frozen assessment input unavailable.");
        const batch = planBatch(current.assessment);
        if (batch[0] === "synthesis") {
          const report = await ai(
            { ...input, assessment: current.assessment },
            "assessment",
            "",
            "synthesis",
          );
          current = await commit((s) => ({
            ...s,
            report: report as Record<string, unknown>,
            assessment: s.assessment && {
              ...s.assessment,
              status: "completed",
              evaluation_id: s.id,
            },
          }));
          break;
        }
        const settled = await Promise.allSettled(
          batch.map((step) => ai(input, "assessment", "", step)),
        );
        current = await commit((s) => {
          if (!s.assessment) return s;
          const steps: Record<string, StepState> = { ...s.assessment.steps };
          settled.forEach((r, i) => {
            const attempts = (steps[batch[i]]?.attempts ?? 0) + 1;
            steps[batch[i]] =
              r.status === "fulfilled"
                ? { status: "done", attempts, result: r.value }
                : attempts >= MAX_STEP_ATTEMPTS
                  ? {
                      status: "placeholder",
                      attempts,
                      result: {
                        score: 0,
                        verdict: "insufficient",
                        confidence: "low",
                        reviewer_flag: true,
                        evidence: `Section scoring failed — rerun manually. ${(r.reason as Error).message}`,
                        strengths: [],
                        gaps: ["Automated scoring did not complete."],
                      },
                    }
                  : { status: "pending", attempts, error: (r.reason as Error).message };
          });
          const stop = settled.some(
            (r) =>
              r.status === "rejected" &&
              [401, 402, 403].includes((r.reason as { status?: number }).status ?? 0),
          );
          return {
            ...s,
            assessment: {
              ...s.assessment,
              steps,
              status: stop ? "failed" : "running",
              error: stop
                ? "Assessment paused by AI access or credits. Restore access before retrying."
                : null,
              lease_until: new Date(Date.now() + 300000).toISOString(),
            },
          };
        });
        if (settled.some((r) => r.status === "rejected"))
          await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    } catch (e) {
      await commit((s) =>
        s.assessment
          ? { ...s, assessment: { ...s.assessment, status: "failed", error: (e as Error).message } }
          : s,
      );
    } finally {
      await commit((s) =>
        s.assessment ? { ...s, assessment: { ...s.assessment, lease_until: null } } : s,
      );
      setBusy(false);
    }
  };
  if (!owner)
    return (
      <Shell>
        <p className="p-10 text-sm text-muted-foreground">Loading pilot…</p>
      </Shell>
    );
  if (!state)
    return (
      <Shell>
        <main className="mx-auto max-w-4xl px-6 py-16 space-y-6">
          <span className="chip">Opt-in beginner practice</span>
          <h1 className="text-4xl">ShiftNest Customer Profile pilot</h1>
          <p className="text-muted-foreground">{PILOT_CASE}</p>
          <p className="text-sm border border-input p-4">
            Preview-only practice: this browser stores the pilot. It never counts toward
            certification and is not a tamper-proof assessment record.
          </p>
          <Button
            onClick={() => {
              const next = newPilot(owner);
              writePilot(localStorage, owner, next);
              setState(next);
            }}
          >
            Start practice pilot
          </Button>
        </main>
      </Shell>
    );
  const scope = state.scopes.find((s) => s.id === state.boundScopeId) ?? state.scopes.at(-1),
    c = state.checkpoint,
    update = c?.update;
  return (
    <Shell>
      <main className="mx-auto max-w-[1400px] px-6 md:px-10 py-10 space-y-8">
        <header className="flex flex-wrap justify-between gap-4">
          <div>
            <span className="chip">Beginner practice · two meetings</span>
            <h1 className="text-3xl mt-3">ShiftNest Customer Profile pilot</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-3xl">{PILOT_CASE}</p>
          </div>
          <a
            className="inline-flex h-9 items-center gap-2 border border-input px-4 text-sm"
            href={PILOT_PLAYBOOK_URL}
            target="_blank"
            rel="noreferrer"
          >
            Open playbook preview <ExternalLink className="size-4" />
          </a>
        </header>
        <p className="text-xs text-muted-foreground">
          Playbook preview only: Coach Compass does not connect to or observe Strategyzer. Output is
          a Customer Profile; no Value Map is required.
        </p>
        {error && (
          <p role="alert" className="border border-destructive p-3 text-sm">
            {error}
          </p>
        )}
        <ol className="flex flex-wrap gap-2 text-xs uppercase">
          {["scope", "one", "handoff", "two", "advance"].map((p) => (
            <li
              key={p}
              className={`border px-3 py-1 ${state.phase === p ? "bg-primary text-primary-foreground" : ""}`}
            >
              {p === "one" ? "Meeting 1" : p === "two" ? "Meeting 2" : p}
            </li>
          ))}
        </ol>
        {state.phase === "scope" && <Scope state={state} commit={commit} />}
        {(state.phase === "scope" || state.phase === "one" || state.phase === "two") && (
          <section className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-6">
            <Transcript state={state} />
            <Profile state={state} />
          </section>
        )}
        {(state.phase === "scope" || state.phase === "one" || state.phase === "two") && (
          <section className="space-y-3">
            <Textarea
              aria-label="Speak to the client team"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={4000}
              placeholder={
                state.phase === "scope" ? "Ask the team a scoping question…" : "Speak to the room…"
              }
            />
            <div className="flex flex-wrap gap-2">
              <Button disabled={busy || !message.trim()} onClick={say}>
                <Send />
                {state.pendingTurn ? "Retry same message" : "Speak to the room"}
              </Button>
              {state.phase === "scope" && (
                <Button variant="outline" onClick={() => commit(beginMeetingOne)}>
                  Begin meeting 1
                </Button>
              )}
            </div>
            {state.phase !== "scope" && (
              <>
                <label className="text-sm block">
                  Reason for handoff or stop
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    maxLength={4000}
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  {state.phase === "one" && (
                    <Button disabled={busy} onClick={() => commit((s) => handoff(s, reason))}>
                      Conclude meeting 1 and hand off
                    </Button>
                  )}
                  {state.phase === "two" && (
                    <Button
                      disabled={busy}
                      onClick={() => commit((s) => finishMeetingTwo(s, reason))}
                    >
                      Conclude meeting 2
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={() => commit((s) => stopPilot(s, reason))}
                  >
                    Stop intentionally
                  </Button>
                </div>
              </>
            )}
          </section>
        )}
        {state.phase === "handoff" && c && (
          <section className="space-y-4">
            <h2 className="text-2xl">Between meetings</h2>
            <p className="text-sm">
              Bound Scope revision: {scope?.revision}. The team update is generated once from this
              frozen handoff.
            </p>
            {c.status !== "ready" && (
              <>
                <p role="status">
                  {c.status === "running"
                    ? "The team update is being prepared… If this page was closed, wait five minutes before resuming."
                    : c.status === "failed"
                      ? `Update failed: ${c.error}`
                      : "Ready to request the team's update."}
                </p>
                <Button disabled={busy || c.blocked} onClick={generate}>
                  <RefreshCcw />
                  {c.status === "failed" ? "Retry update" : "Prepare team update"}
                </Button>
              </>
            )}
            {update && <ClientUpdate state={state} />}
            {update && (
              <Button
                onClick={() =>
                  commit((s) =>
                    beginMeetingTwo({
                      ...s,
                      checkpoint: s.checkpoint && {
                        ...s.checkpoint,
                        seenAt: s.checkpoint.seenAt ?? new Date().toISOString(),
                      },
                    }),
                  )
                }
              >
                I’ve read this — begin meeting 2
              </Button>
            )}
          </section>
        )}
        {state.phase === "two" && update && (
          <details>
            <summary className="text-sm cursor-pointer">Review the saved client update</summary>
            <ClientUpdate state={state} />
          </details>
        )}
        {(state.phase === "advance" || state.phase === "stopped") && (
          <section className="space-y-4">
            <h2 className="text-2xl">Advance the outcome</h2>
            <p className="text-sm text-muted-foreground">
              Name your next coaching move in your own words. AI does not draft it.
            </p>
            <label className="text-sm block">
              Next coaching move
              <Textarea
                aria-label="Next coaching move"
                value={state.nextMove}
                disabled={!!state.assessment}
                onChange={(e) => {
                  const value = e.target.value;
                  void commit((s) => ({ ...s, nextMove: value }));
                }}
                maxLength={4000}
              />
            </label>
            <details>
              <summary className="text-sm cursor-pointer">
                Engagement pathway notes (optional)
              </summary>
              <div className="grid md:grid-cols-2 gap-3 mt-3">
                {[
                  ["situation_summary", "Situation summary"],
                  ["immediate_intervention", "Immediate intervention"],
                  ["pathway", "Pathway and decision gates"],
                  ["risks", "Risks and unresolved issues"],
                  ["success_criteria", "Success criteria"],
                ].map(([key, label]) => (
                  <label key={key} className="text-xs">
                    {label}
                    <Textarea
                      disabled={!!state.assessment}
                      value={state.advanceNotes?.[key] ?? ""}
                      maxLength={4000}
                      onChange={(e) => {
                        const value = e.target.value;
                        void commit((s) => ({
                          ...s,
                          advanceNotes: { ...s.advanceNotes, [key]: value },
                        }));
                      }}
                    />
                  </label>
                ))}
              </div>
            </details>
            <Button
              disabled={
                busy ||
                state.nextMove.trim().length < 10 ||
                state.assessment?.status === "completed"
              }
              onClick={assess}
            >
              {state.assessment?.status === "failed"
                ? "Retry assessment"
                : state.assessment?.status === "completed"
                  ? "Assessment generated"
                  : state.assessment
                    ? "Resume assessment"
                    : "Generate practice assessment"}
            </Button>
            {state.assessment && (
              <p role="status">
                {ALL_STEPS.filter((k) => isSettled(state.assessment?.steps[k])).length +
                  (state.report ? 1 : 0)}{" "}
                of {TOTAL_STEPS} steps · {state.assessment.status}
                {state.assessment.error ? ` · ${state.assessment.error}` : ""}
              </p>
            )}
            {state.report && <Report report={state.report} />}
          </section>
        )}
        <Link to="/scenarios" className="text-sm underline">
          Back to scenarios
        </Link>
      </main>
    </Shell>
  );
}
function Scope({
  state,
  commit,
}: {
  state: PilotState;
  commit: (fn: (s: PilotState) => PilotState) => Promise<PilotState | null>;
}) {
  const [brief, setBrief] = useState(state.brief),
    [approach, setApproach] = useState(state.approach || "playbook"),
    [rationale, setRationale] = useState(state.rationale);
  return (
    <section className="border border-input p-5 space-y-4">
      <h2 className="text-2xl">Scope the engagement</h2>
      <div className="grid md:grid-cols-2 gap-3">
        {BRIEF_FIELDS.map((f) => (
          <label key={f.key} className="text-xs">
            {f.label}
            <Textarea
              value={brief[f.key]}
              onChange={(e) => setBrief({ ...brief, [f.key]: e.target.value })}
              maxLength={4000}
            />
          </label>
        ))}
      </div>
      <label className="text-sm block">
        Approach
        <select
          className="block mt-1 border border-input bg-background p-2"
          value={approach}
          onChange={(e) => setApproach(e.target.value)}
        >
          <option value="playbook">Use Customer Profile playbook preview</option>
          <option value="defer">Defer the tool and coach first</option>
        </select>
      </label>
      <label className="text-sm block">
        Why this approach?
        <Textarea
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          maxLength={4000}
        />
      </label>
      <Button
        variant="outline"
        onClick={() => commit((s) => saveScope(s, brief, approach, rationale))}
      >
        Save Scope revision ({state.scopes.length})
      </Button>
    </section>
  );
}
function Transcript({ state }: { state: PilotState }) {
  return (
    <div
      className="border border-input p-4 h-[440px] overflow-y-auto space-y-3"
      aria-label="Pilot conversation"
    >
      {state.events.map((e) => (
        <div
          key={e.id}
          className={e.actor === "system" ? "text-xs text-center text-muted-foreground" : ""}
        >
          {e.actor !== "system" && (
            <p className="text-xs text-muted-foreground">
              {e.actor === "coach" ? "You" : e.speaker}
            </p>
          )}
          <p className="text-sm whitespace-pre-wrap">{e.text}</p>
        </div>
      ))}
    </div>
  );
}
function Profile({ state }: { state: PilotState }) {
  const work = profileWork(state);
  return (
    <aside className="border border-input p-4">
      <h2 className="text-lg">Team-owned Customer Profile</h2>
      <p className="text-xs text-muted-foreground mb-3">
        Read-only. The team's draft assumptions remain until the team changes them.
      </p>
      <ul className="text-sm space-y-2">
        {state.checkpoint?.input.profile.map((i) => (
          <li key={i.id}>
            <strong className="capitalize">{i.category}:</strong> {i.text}{" "}
            <span className="text-xs text-muted-foreground">— {i.speaker}</span>
          </li>
        )) ??
          work.sections.flatMap((s) =>
            s.items.map((i, n) => (
              <li key={`${s.key}${n}`}>
                <strong>{s.label}:</strong> {i.text}
              </li>
            )),
          )}
      </ul>
      {!state.checkpoint && (
        <p className="text-xs mt-3">
          Initial draft: shift workers and households; arranging meals around changing shifts;
          schedule changes create stress; predictable meals — all assumptions.
        </p>
      )}
    </aside>
  );
}
function ClientUpdate({ state, compact = false }: { state: PilotState; compact?: boolean }) {
  const checkpoint = state.checkpoint;
  const u = checkpoint?.update;
  if (!checkpoint || !u) return null;
  const prior = checkpoint.input.profile;
  return (
    <section className="border border-input p-5 space-y-4" aria-label="Client update">
      <div>
        <span className="chip">Simulated client update · read-only</span>
        <h2 className="text-xl mt-2">The team’s return update</h2>
        <p className="text-sm mt-2">{u.summary}</p>
        <p className="text-xs text-muted-foreground">
          Generated fictional stimulus, not verified research or approved changes.
        </p>
      </div>
      <details>
        <summary className="text-sm cursor-pointer">
          Compare prior profile and proposed changes ({u.changes.length})
        </summary>
        <div className="grid lg:grid-cols-2 gap-4 mt-3">
          <div>
            <h3 className="font-medium">Prior profile</h3>
            <ul className="text-sm">
              {prior.map((p) => (
                <li key={p.id}>
                  {p.category}: {p.text}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-medium">Proposed changes</h3>
            <ul className="text-sm space-y-2">
              {u.changes.map((c, i) => (
                <li key={i}>
                  <strong>{c.operation}</strong> {c.category}: {c.proposal}
                  <span className="text-xs block">
                    Prior: {prior.find((p) => p.id === c.targetId)?.text ?? "New proposed item"}
                  </span>{" "}
                  <span className="text-xs block text-muted-foreground">
                    {c.participant} · {c.reason}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </details>
      {!compact && (
        <>
          <div>
            <h3 className="font-medium">What the team did</h3>
            <ul className="text-sm">
              {u.actions.map((a, i) => (
                <li key={i}>
                  {a.participant}: {a.description} ({a.basis.replace("_", " ")})
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-medium">Simulated evidence and gaps</h3>
            <ul className="text-sm space-y-2">
              {u.evidence.map((e) => (
                <li key={e.id}>
                  <strong>{e.kind}</strong>: {e.report}
                  <span className="block text-xs text-muted-foreground">
                    {e.participant} · Limitation: {e.limitation}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
      <div>
        <h3 className="font-medium">Open questions</h3>
        <ul className="text-sm">
          {u.openQuestions.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
function Report({ report }: { report: Record<string, unknown> }) {
  const sections =
    (report.scores as { sections?: Record<string, { score: number; evidence: string }> })
      ?.sections ?? {};
  return (
    <section className="border border-input p-5">
      <h3 className="text-xl">Practice assessment · human review required</h3>
      <p className="text-sm text-muted-foreground">Preview-only and not certification evidence.</p>
      <p className="text-sm mt-3">{String(report.overall_summary ?? "")}</p>
      <dl className="grid md:grid-cols-3 gap-3 mt-4">
        {Object.entries(sections).map(([k, v]) => (
          <div key={k} className="border border-input p-3">
            <dt className="text-xs uppercase">{k.replaceAll("_", " ")}</dt>
            <dd className="text-lg">{v.score}/5</dd>
            <dd className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">{v.evidence}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
