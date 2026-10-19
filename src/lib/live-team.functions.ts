import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import { PUBLIC_EVENT_COLUMNS } from "./activity-runtime";
import { initialRoom, publicTeamConfig, roomPhase, sanitizeTurn, type RawTurn, type RoomState, type TeamConfig } from "./live-team";

type Ctx = { supabase: any; userId: string };

// Owner + eligibility check through the candidate's own RLS-scoped client before any privileged read.
async function loadEligibleRun(ctx: Ctx, runId: string) {
  const { data: run } = await ctx.supabase.from("activity_runs").select("id,session_id,scenario_id,intervention_slug,runtime_type,status,candidate_id").eq("id", runId).maybeSingle();
  if (!run || run.candidate_id !== ctx.userId || run.runtime_type !== "strategyzer_external") throw new Error("Forbidden");
  const { data: allowed } = await ctx.supabase.rpc("activity_runtime_test_allowed", { _session: run.session_id, _candidate: ctx.userId });
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: cfg } = await supabaseAdmin.from("team_activity_configs").select("*").eq("scenario_id", run.scenario_id).eq("intervention_slug", run.intervention_slug).eq("status", "active").order("version", { ascending: false }).limit(1).maybeSingle();
  const config = cfg as unknown as TeamConfig | null;
  // POC configuration is unapproved content: only explicitly allowlisted disposable sessions may use it.
  if (!config || (config.poc && !allowed) || (!config.poc && !config.methodology_approved)) return { run, config: null, admin: supabaseAdmin };
  return { run, config, admin: supabaseAdmin };
}

async function connected(ctx: Ctx, runId: string) {
  const { data } = await ctx.supabase.from("activity_external_connections").select("id").eq("run_id", runId).eq("status", "connected").limit(1);
  return !!data?.length;
}

export const getLiveTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { runId: string }) => z.object({ runId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { config } = await loadEligibleRun(context, data.runId);
    if (!config) return { available: false as const };
    const { data: events, error } = await context.supabase.from("activity_events").select(PUBLIC_EVENT_COLUMNS).eq("run_id", data.runId).order("sequence");
    if (error) throw new Error("Working session could not be loaded");
    const room = (events ?? []).filter(e => e.metadata && typeof e.metadata === "object" && "team_kind" in (e.metadata as object));
    return { available: true as const, config: publicTeamConfig(config), phase: roomPhase(room), events: room, connected: await connected(context, data.runId) };
  });

async function priorScopeContext(admin: any, sessionId: string, names: string[]) {
  const { data: msgs } = await admin.from("messages").select("role,stakeholder_name,content,phase,created_at").eq("session_id", sessionId).order("created_at");
  const { data: states } = await admin.from("stakeholder_states").select("stakeholder_id,trust,engagement,guardedness,turn_index").eq("session_id", sessionId).order("turn_index");
  const { data: s } = await admin.from("sessions").select("dialogue_commitments").eq("id", sessionId).single();
  const byName: Record<string, string[]> = {}; const prior: Record<string, { trust?: string }> = {};
  for (const n of names) {
    const lines = (msgs ?? []).filter((m: any) => m.stakeholder_name === n).slice(-12).map((m: any) => `${m.role === "candidate" ? "Coach" : n}: ${String(m.content).slice(0, 400)}`);
    if (lines.length) byName[n] = lines;
    const st = (states ?? []).filter((x: any) => x.stakeholder_id === n && x.turn_index > 0).at(-1);
    if (st) prior[n] = { trust: st.trust === "low" || st.trust === "high" ? st.trust : "medium" };
  }
  return { byName, prior, commitments: s?.dialogue_commitments ?? "" };
}

export const beginWorkingSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { runId: string; requestKey: string }) => z.object({ runId: z.string().uuid(), requestKey: z.string().uuid() }).strict().parse(d))
  .handler(async ({ data, context }) => {
    const { run, config, admin } = await loadEligibleRun(context, data.runId);
    if (!config || run.status !== "active") throw new Error("Working session not available");
    if (!(await connected(context, data.runId))) throw new Error("Connect your Strategyzer Playbook first");
    const { data: existing } = await admin.from("activity_run_private").select("internal_configuration").eq("run_id", run.id).maybeSingle();
    if ((existing?.internal_configuration as any)?.team) return { ok: true };
    const scope = await priorScopeContext(admin, run.session_id, config.participants.map(p => p.name));
    const room = initialRoom(config, scope.prior as any);
    const { error } = await admin.rpc("append_team_events", {
      _run: run.id, _request: data.requestKey,
      _events: [{ type: "system_event", actor: "system", content: `Working session started: ${config.title}`, metadata: { team_kind: "session_started", team_config_version: config.version, expected_duration_minutes: config.expected_duration_minutes } }] as unknown as Json,
      _participant_state: { team: room } as unknown as Json,
      _internal: { team: { config_id: config.id, version: config.version, poc: config.poc, scope_engaged: Object.keys(scope.byName), level0_limitation: "Strategyzer artifact not observable; activity assignment not verified" } } as unknown as Json,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const startSynthesis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { runId: string; requestKey: string }) => z.object({ runId: z.string().uuid(), requestKey: z.string().uuid() }).strict().parse(d))
  .handler(async ({ data, context }) => {
    const { config, admin } = await loadEligibleRun(context, data.runId);
    if (!config) throw new Error("Working session not available");
    const { error } = await admin.rpc("append_team_events", { _run: data.runId, _request: data.requestKey, _events: [{ type: "activity_transition", actor: "system", content: "Synthesis checkpoint: the coach brings the team back together.", metadata: { team_kind: "synthesis_started" } }] as unknown as Json });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const concludeWorkingSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { runId: string; requestKey: string; rationale: string }) => z.object({ runId: z.string().uuid(), requestKey: z.string().uuid(), rationale: z.string().trim().min(10).max(4000) }).strict().parse(d))
  .handler(async ({ data, context }) => {
    const { config, admin } = await loadEligibleRun(context, data.runId);
    if (!config) throw new Error("Working session not available");
    const { error } = await admin.rpc("append_team_events", { _run: data.runId, _request: data.requestKey, _events: [{ type: "decision", actor: "coach", actor_id: context.userId, content: data.rationale, metadata: { team_kind: "concluded" } }] as unknown as Json });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const MODEL = "google/gemini-3-flash-preview";

function buildPrompt(config: TeamConfig, room: RoomState, scope: Awaited<ReturnType<typeof priorScopeContext>>, transcript: string, phase: string) {
  const people = config.participants.map(p => {
    const st = room.participants[p.name];
    const ev = config.truth.evidence.filter(e => e.holder === p.name).map(e => `  - [${e.id}] ${room.surfaced.includes(e.id) ? "(ALREADY SHARED)" : "(not yet shared)"} ${e.claim ? `Says: "${e.claim}". ` : ""}Private truth: ${e.reality} Share only when: ${e.reveal_when}`).join("\n");
    const prior = scope.byName[p.name] ? `Earlier 1:1 conversation with this coach during scoping (real, remember it):\n${scope.byName[p.name].join("\n")}` : "Has NOT spoken with this coach before today. Do not invent prior contact.";
    return `### ${p.name} — ${p.role}\nPersonality: ${p.personality}\nParticipation tendency: ${p.tendency}\nBeliefs (stated as fact by them): ${p.beliefs.join("; ")}\nCurrent state: engagement ${st.engagement}, trust ${st.trust}, defensiveness ${st.defensiveness}, willingness to contribute ${st.willingness_to_contribute}${st.note ? ` (${st.note})` : ""}\nPrivately knows:\n${ev || "  - nothing beyond shared facts"}\n${prior}`;
  }).join("\n\n");
  return `You simulate a real CLIENT TEAM in a live working session. A coach is facilitating them through the Strategyzer activity "${config.title}" (${config.exercise_label}). The team is doing the real canvas work in another tool; you only produce what people SAY in the room.

ABSOLUTE RULES
- You are client team members, never an assistant, coach or evaluator. Never advise the coach on facilitation, never name their mistakes, never mention scoring, never suggest which concept to use, never steer the room back to the objective on the coach's behalf.
- Follow a weak coach weakly: leading questions get agreement; supplied answers get accepted with little ownership; contradictory facts do NOT appear to rescue the coach.
- Only reveal private knowledge when the holder speaks AND the conversational conditions genuinely meet "share only when". Judge the meaning of what was asked and who was invited, never keywords. Partial or hedged hints are fine when conditions are only partly met.
- Decide who speaks. Usually 1 person, sometimes 2, rarely 3. A dominant person answers general questions first; a quiet person stays quiet unless addressed personally and made safe. Nobody needs to speak if nothing is useful — but return at least one response.
- Keep it human and short: 1–3 sentences each, conversational, occasionally interrupting or reacting to each other. No lists, no headings, no stage directions beyond a brief *pause* if needed.
- If the coach over-explains methodology the team already understands, show it humanly: shorter replies, "yeah, we get it", wanting to start. Never say they are over-explaining.
- People may raise realistic tangents (see below) when engagement drifts or the topic invites it; follow the coach if they chase a tangent. Do not self-correct.
- Stay consistent with each person's state; update states gradually (one step at a time) based on HOW the coach behaves.
${phase === "synthesis" ? "- The coach has brought the team together to synthesize. React honestly to their summary: confirm what is fair, push back on anything overstated, stay quiet if unsure." : ""}

SHARED FACTS: ${config.truth.shared.join("; ")}
TEAM ASSUMPTIONS (treated as facts by holder): ${config.truth.assumptions.map(a => `${a.holder}: "${a.statement}"`).join("; ")}
POSSIBLE TANGENTS: ${config.truth.tangents.map(t => `${t.holder}: ${t.topic}`).join("; ")}
${scope.commitments ? `COMMITMENTS FROM SCOPING: ${scope.commitments}` : ""}

PARTICIPANTS
${people}

TRANSCRIPT SO FAR
${transcript || "(the session has just started)"}

Return strict JSON only:
{"coach_act":"one of open_question|leading_question|probe|explain_method|prescribe|invite_participant|redirect|park|summarize|challenge|test_understanding|tangent_follow|transition|other",
"responses":[{"participant":"<exact name>","text":"..."}],
"state":{"<name>":{"engagement":"low|medium|high","trust":"low|medium|high","defensiveness":"low|medium|high","willingness_to_contribute":"low|medium|high","note":"short private reason"}},
"surfaced":[{"evidence_id":"<id>","by":"<holder name>","reason":"why conditions were met"}],
"assumptions_reinforced":["<assumption id>"],"assumptions_challenged":["<assumption id>"],
"reasoning":"private 1-3 sentences"}`;
}

export const facilitateTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { runId: string; requestKey: string; message: string }) => z.object({ runId: z.string().uuid(), requestKey: z.string().uuid(), message: z.string().trim().min(1).max(4000) }).strict().parse(d))
  .handler(async ({ data, context }) => {
    const { run, config, admin } = await loadEligibleRun(context, data.runId);
    if (!config || run.status !== "active") throw new Error("Working session not available");
    const { data: dup } = await admin.from("activity_events").select("id").eq("run_id", run.id).eq("request_key", data.requestKey).maybeSingle();
    if (dup) return { duplicate: true };
    const { data: evs } = await admin.from("activity_events").select("event_type,actor_type,actor_id,content,metadata").eq("run_id", run.id).order("sequence");
    const room = (evs ?? []).filter((e: any) => e.metadata?.team_kind);
    const phase = roomPhase(room as any);
    if (phase === "not_started" || phase === "concluded") throw new Error("The working session is not open");
    const { data: priv } = await admin.from("activity_run_private").select("participant_state").eq("run_id", run.id).single();
    const state = (priv?.participant_state as any)?.team as RoomState;
    const transcript = room.filter((e: any) => e.metadata.team_kind === "utterance" || e.metadata.team_kind === "response")
      .slice(-40).map((e: any) => `${e.actor_type === "coach" ? "Coach" : e.actor_id}: ${e.content}`).join("\n");
    const scope = await priorScopeContext(admin, run.session_id, config.participants.map(p => p.name));
    const t0 = Date.now();
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST", headers: { Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, response_format: { type: "json_object" }, messages: [
        { role: "system", content: buildPrompt(config, state, scope, transcript, phase) },
        { role: "user", content: `Coach says to the room: ${data.message}` },
      ] }),
    });
    if (!res.ok) throw new Error(res.status === 429 ? "The team needs a moment — try again shortly." : res.status === 402 ? "AI credits exhausted." : "The team could not respond. Try again.");
    const json = await res.json();
    let raw: RawTurn = {};
    try { raw = JSON.parse(String(json.choices?.[0]?.message?.content ?? "{}").replace(/^```(json)?|```$/g, "")); } catch { raw = {}; }
    const turn = sanitizeTurn(raw, config, state);
    if (!turn.responses.length) throw new Error("The team could not respond. Try again.");
    const coachType = phase === "synthesis" ? "synthesis" : "coach_message";
    const events = [
      { type: coachType, actor: "coach", actor_id: context.userId, content: data.message, metadata: { team_kind: "utterance" }, private: { state: Object.fromEntries(turn.changes.map(n => [n, turn.next.participants[n]])), evaluator: { coach_act: turn.coachAct, state_changed: turn.changes, reinforced: turn.reinforced, challenged: turn.challenged, reasoning: turn.reasoning, latency_ms: Date.now() - t0 } } },
      ...turn.responses.map(r => ({ type: "team_response", actor: "team", actor_id: r.participant, content: r.text, metadata: { team_kind: "response" },
        private: { evaluator: { surfaced: turn.surfaced.filter(s => s.by === r.participant) }, state: turn.next.participants[r.participant] } })),
    ];
    const { error } = await admin.rpc("append_team_events", { _run: run.id, _request: data.requestKey, _events: events as unknown as Json, _participant_state: { team: turn.next } as unknown as Json });
    if (error) throw new Error(error.message);
    return { duplicate: false };
  });
