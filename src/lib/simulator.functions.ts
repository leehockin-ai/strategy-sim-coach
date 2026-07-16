import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PLAYBOOKS, CANVASES, canvasForPlaybook } from "@/lib/playbooks";
import { STRATEGYZER_INTELLIGENCE } from "@/lib/strategyzer-methodology";
import { notify } from "@/lib/notifications.functions";

export const suggestPlaybook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sessionId: string; mode?: string; candidateDraft?: { choice?: string; rationale?: string } }) =>
    z.object({
      sessionId: z.string().uuid(),
      mode: z.string().optional(),
      candidateDraft: z
        .object({ choice: z.string().optional(), rationale: z.string().optional() })
        .optional(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    await assertSessionOwner(data.sessionId, context.userId);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const { data: session } = await supabaseAdmin
      .from("sessions")
      .select("framing_notes, playbook_suggestions, scenarios(title, context, summary, ambiguity_factors)")
      .eq("id", data.sessionId)
      .single();
    if (!session) throw new Error("Session not found");

    const scenario = (session as any).scenarios;
    const playbookCatalog = PLAYBOOKS.map(
      (p) => `- ${p.id} — ${p.name} (${p.diagnosis}): "${p.whenToUse}" · Signals: ${p.signals.join("; ")} · Outcome: ${p.outcome}`,
    ).join("\n");

    const mode = data.mode ?? "single";
    const prompt = `You are a Strategyzer master coach evaluating a scoping conversation. Apply the methodology intelligence below to recommend the smallest sufficient intervention. Methodology restraint is a virtue: if the evidence is too weak or the real bottleneck is alignment, recommend NO playbook yet and name the evidence/alignment moves to do first.

${STRATEGYZER_INTELLIGENCE}

SCENARIO: ${scenario.title}
${scenario.context}
Ambiguity: ${(scenario.ambiguity_factors ?? []).join(", ")}

CANDIDATE FRAMING:
${(session as any).framing_notes ?? "(no framing provided)"}

COACH'S REQUESTED MODE: ${mode}  (single = one playbook; multi = sequenced combination; none = evidence/alignment moves before any playbook)

PLAYBOOK OPTIONS:
${playbookCatalog}

Return strict JSON:
{
  "mode": "single" | "multi" | "none",
  "playbookId": "<id or null if mode=none>",
  "sequence": ["<id>", "..."],
  "confidence": "low" | "medium" | "high",
  "rationale": "<2-3 sentences citing scoping signals, evidence quality, and sequencing logic>",
  "evidence_gaps": ["<what we still don't know that would change the recommendation>", "..."],
  "pre_work": ["<alignment or evidence move to do BEFORE any playbook, especially when mode=none>", "..."],
  "watchouts": ["<risk if this playbook is misapplied — over-canvasing, premature BMC, etc.>", "..."]
}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      if (res.status === 429) throw new Error("Rate limit — try again shortly.");
      if (res.status === 402) throw new Error("AI credits exhausted.");
      throw new Error(`AI gateway error: ${res.status}`);
    }
    const json = await res.json();
    const content = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = { playbookId: null, rationale: content }; }

    const priorLog = Array.isArray((session as any).playbook_suggestions)
      ? ((session as any).playbook_suggestions as any[])
      : [];

    const entry = {
      shown_at: new Date().toISOString(),
      requested_mode: mode,
      candidate_state_at_request: {
        had_draft_choice: !!data.candidateDraft?.choice,
        draft_choice: data.candidateDraft?.choice ?? null,
        draft_rationale_chars: (data.candidateDraft?.rationale ?? "").trim().length,
      },
      suggestion: parsed,
    };

    await supabaseAdmin
      .from("sessions")
      .update({ playbook_suggestions: [...priorLog, entry] })
      .eq("id", data.sessionId);

    return { suggestion: parsed, logIndex: priorLog.length };
  });


async function assertSessionOwner(sessionId: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .select("owner_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Session not found");
  if (data.owner_id !== userId) throw new Error("Forbidden");
}

// ────────────────────────────────────────────────────────────────────
// Stakeholder state (Patch 3): hidden per-stakeholder trust/engagement/
// guardedness state that accumulates across dialogue turns. Seeded at
// session creation, updated on every coach turn to a stakeholder.
// ────────────────────────────────────────────────────────────────────
export async function seedInitialStakeholderStates(sessionId: string, scenarioId: string) {
  const { data: scen } = await supabaseAdmin
    .from("scenarios")
    .select("stakeholders")
    .eq("id", scenarioId)
    .maybeSingle();
  const stakeholders = ((scen as any)?.stakeholders ?? []) as Array<{ name: string }>;
  if (stakeholders.length === 0) return;
  const rows = stakeholders.map((s) => ({
    session_id: sessionId,
    stakeholder_id: s.name,
    engagement: "medium" as const,
    trust: "medium" as const,
    guardedness: "measured" as const,
    turn_index: 0,
    reasoning: "initial state",
  }));
  await supabaseAdmin.from("stakeholder_states" as any).insert(rows as any);
}

type StakeholderState = {
  engagement: "low" | "medium" | "high";
  trust: "low" | "medium" | "high";
  guardedness: "open" | "measured" | "guarded";
  reasoning: string;
};

async function assessStakeholderStateUpdate(input: {
  apiKey: string;
  priorState: StakeholderState;
  coachTurn: string;
  stakeholderPersona: { name: string; role: string; posture: string };
}): Promise<StakeholderState | null> {
  const system = `You track hidden state for a single stakeholder in a coaching simulation.

Given the stakeholder's persona, their PRIOR state (engagement/trust/guardedness), and the coach's most recent single message to them, return the UPDATED state after this one exchange.

State moves gradually — one turn rarely swings state by more than one step. Persona posture matters: a naturally guarded exec doesn't become "open" from one warm question. But a genuinely extractive, dismissive, or manipulative move CAN drop trust or push guardedness up quickly.

Return strict JSON:
{
  "engagement": "low" | "medium" | "high",
  "trust": "low" | "medium" | "high",
  "guardedness": "open" | "measured" | "guarded",
  "reasoning": "<one sentence explaining what in the coach's message moved (or held) state>"
}`;
  const user = `STAKEHOLDER: ${input.stakeholderPersona.name} — ${input.stakeholderPersona.role}
POSTURE: ${input.stakeholderPersona.posture}

PRIOR STATE:
engagement=${input.priorState.engagement}, trust=${input.priorState.trust}, guardedness=${input.priorState.guardedness}

COACH'S MOST RECENT MESSAGE TO ${input.stakeholderPersona.name}:
${input.coachTurn}`;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${input.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const raw = json.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);
    const eng = ["low", "medium", "high"].includes(parsed.engagement) ? parsed.engagement : null;
    const tr = ["low", "medium", "high"].includes(parsed.trust) ? parsed.trust : null;
    const gd = ["open", "measured", "guarded"].includes(parsed.guardedness) ? parsed.guardedness : null;
    if (!eng || !tr || !gd) return null;
    return {
      engagement: eng,
      trust: tr,
      guardedness: gd,
      reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning.slice(0, 500) : "",
    };
  } catch (err) {
    console.error("[assessStakeholderStateUpdate] failed", err);
    return null;
  }
}

function toneModulatorForState(state: StakeholderState): string {
  const parts: string[] = [];
  // engagement
  if (state.engagement === "high") {
    parts.push("You are ENGAGED: you ask clarifying questions of your own, and occasionally offer context the coach didn't explicitly ask for (still concise).");
  } else if (state.engagement === "low") {
    parts.push("You are DISENGAGED: replies are minimal. You look for reasons to end the conversation ('I have another call in 5'). You don't volunteer anything.");
  } else {
    parts.push("You are MODERATELY engaged: you answer what's asked, professionally, without extra energy or extra reticence.");
  }
  // trust
  if (state.trust === "high") {
    parts.push("You TRUST the coach: you're candid about doubts, internal politics, and things you're unsure of. You take their questions at face value.");
  } else if (state.trust === "low") {
    parts.push("You DISTRUST the coach's motives: you test them. You may deflect direct questions, reframe them back, or ask what they're really trying to get at.");
  } else {
    parts.push("You are NEUTRAL on trust: you engage in good faith but don't overshare, and you notice if the coach is fishing.");
  }
  // guardedness
  if (state.guardedness === "open") {
    parts.push("You are OPEN: replies can run a touch longer (still under 3 sentences). You share context and connect dots when it's genuinely useful.");
  } else if (state.guardedness === "guarded") {
    parts.push("You are GUARDED: replies are SHORTER (often one sentence). You don't volunteer information. You respond to what's asked but don't expand.");
  } else {
    parts.push("You are MEASURED: you share what's asked but pause before adding more. No monologuing.");
  }
  return parts.join("\n");
}

export const createSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { scenarioId: string; candidateName: string; candidateEmail: string; framingNotes?: string }) =>
    z.object({
      scenarioId: z.string().uuid(),
      candidateName: z.string().min(1).max(120),
      candidateEmail: z.string().email().max(200),
      framingNotes: z.string().max(4000).optional(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { data: session, error } = await supabaseAdmin
      .from("sessions")
      .insert({
        scenario_id: data.scenarioId,
        candidate_name: data.candidateName,
        candidate_email: data.candidateEmail,
        framing_notes: data.framingNotes ?? null,
        status: "framing",
        owner_id: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    try {
      await seedInitialStakeholderStates((session as any).id, data.scenarioId);
    } catch (err) {
      console.error("[createSession] seedInitialStakeholderStates failed", err);
    }
    return { session };
  });


export const listMySessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin
      .from("sessions")
      .select(`
        *,
        scenarios(title, industry, difficulty),
        evaluations(id, recommendation, reviewer_decision, reviewer_name, reviewed_at)
      `)
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { sessions: data ?? [] };
  });

// ──────────────────────────────────────────────────────────────────
// Coach explicitly submits their completed work for Strategyzer
// reviewer assessment. This is the moment the session enters the
// reviewer queue. Idempotent: re-clicking does nothing if already
// submitted.
// ──────────────────────────────────────────────────────────────────
export const requestSubmissionForAssessment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sessionId: string }) =>
    z.object({ sessionId: z.string().uuid() }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { data: existing } = await supabaseAdmin
      .from("sessions")
      .select("owner_id, submission_requested_at, status")
      .eq("id", data.sessionId)
      .single();
    if (!existing) throw new Error("Session not found");
    if ((existing as any).owner_id !== context.userId) throw new Error("Forbidden");

    const { data: ev } = await supabaseAdmin
      .from("evaluations")
      .select("id")
      .eq("session_id", data.sessionId)
      .maybeSingle();
    if (!ev) {
      throw new Error("Generate the AI rubric first before submitting for Strategyzer assessment.");
    }

    if ((existing as any).submission_requested_at) {
      return { alreadySubmitted: true, submittedAt: (existing as any).submission_requested_at };
    }

    const submittedAt = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("sessions")
      .update({ submission_requested_at: submittedAt } as any)
      .eq("id", data.sessionId);
    if (error) throw new Error(error.message);

    try {
      await notify({
        recipientId: context.userId,
        kind: "submission_received",
        title: "Submitted for Strategyzer assessment",
        body: "Your work is now in the Strategyzer reviewer queue. You'll be notified when a reviewer signs off.",
        deepLink: `/sessions/${data.sessionId}/report`,
        metadata: { session_id: data.sessionId },
      });
    } catch {
      // notifications must never fail the operation that emitted them
    }

    return { alreadySubmitted: false, submittedAt };
  });

export const getSessionForReviewer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sessionId: string }) => z.object({ sessionId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: session, error } = await supabaseAdmin
      .from("sessions")
      .select("*, scenarios(*)")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!session) throw new Error("Session not found");
    const { data: messages } = await supabaseAdmin
      .from("messages").select("*").eq("session_id", data.sessionId).order("created_at", { ascending: true });
    const { data: evaluation } = await supabaseAdmin
      .from("evaluations").select("*").eq("session_id", data.sessionId).maybeSingle();
    const { data: stakeholderStates } = await supabaseAdmin
      .from("stakeholder_states" as any)
      .select("*")
      .eq("session_id", data.sessionId)
      .order("stakeholder_id", { ascending: true })
      .order("turn_index", { ascending: true });
    return { session, messages: messages ?? [], evaluation, stakeholderStates: stakeholderStates ?? [] };
  });


export const getSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sessionId: string }) => z.object({ sessionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: session, error } = await supabaseAdmin
      .from("sessions")
      .select("*, scenarios(*)")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!session) throw new Error("Session not found");
    if ((session as any).owner_id !== context.userId) throw new Error("Forbidden");

    const { data: messages } = await supabaseAdmin
      .from("messages")
      .select("*")
      .eq("session_id", data.sessionId)
      .order("created_at", { ascending: true });

    const { data: evaluation } = await supabaseAdmin
      .from("evaluations")
      .select("*")
      .eq("session_id", data.sessionId)
      .maybeSingle();

    return { session, messages: messages ?? [], evaluation };
  });

export const updateSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    sessionId: string;
    framingNotes?: string;
    methodologyChoice?: string;
    methodologyRationale?: string;
    interventionRecommendation?: string;
    decision?: string;
    status?: string;
    dialogueCommitments?: string;
    chosenInterventionSlug?: string;
    interventionRationale?: string;
    commitIntervention?: boolean;
    alignmentWorkspacePatch?: Record<string, unknown>;
    playbookFacilitationPlanPatch?: Record<string, unknown>;
    playbookActivityRunPatch?: Record<string, unknown>;
    playbookInterpretationPatch?: Record<string, unknown>;
    evidenceGatheringPlanPatch?: Record<string, unknown>;
    pauseJustificationPatch?: Record<string, unknown>;
  }) =>
    z.object({
      sessionId: z.string().uuid(),
      framingNotes: z.string().max(8000).optional(),
      methodologyChoice: z.string().max(500).optional(),
      methodologyRationale: z.string().max(4000).optional(),
      interventionRecommendation: z.string().max(8000).optional(),
      decision: z.string().max(60).optional(),
      status: z.string().max(40).optional(),
      dialogueCommitments: z.string().max(8000).optional(),
      chosenInterventionSlug: z.string().max(120).optional(),
      interventionRationale: z.string().max(8000).optional(),
      commitIntervention: z.boolean().optional(),
      alignmentWorkspacePatch: z.record(z.string(), z.unknown()).optional(),
      playbookFacilitationPlanPatch: z.record(z.string(), z.unknown()).optional(),
      playbookActivityRunPatch: z.record(z.string(), z.unknown()).optional(),
      playbookInterpretationPatch: z.record(z.string(), z.unknown()).optional(),
      evidenceGatheringPlanPatch: z.record(z.string(), z.unknown()).optional(),
      pauseJustificationPatch: z.record(z.string(), z.unknown()).optional(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    await assertSessionOwner(data.sessionId, context.userId);
    const patch: Record<string, unknown> = {};
    if (data.framingNotes !== undefined) patch.framing_notes = data.framingNotes;
    if (data.methodologyChoice !== undefined) patch.methodology_choice = data.methodologyChoice;
    if (data.methodologyRationale !== undefined) patch.methodology_rationale = data.methodologyRationale;
    if (data.interventionRecommendation !== undefined) patch.intervention_recommendation = data.interventionRecommendation;
    if (data.decision !== undefined) patch.decision = data.decision;
    if (data.status !== undefined) patch.status = data.status;
    if (data.dialogueCommitments !== undefined) patch.dialogue_commitments = data.dialogueCommitments;
    if (data.chosenInterventionSlug !== undefined) patch.chosen_intervention_slug = data.chosenInterventionSlug;
    if (data.interventionRationale !== undefined) patch.intervention_rationale = data.interventionRationale;
    if (data.commitIntervention) patch.intervention_committed_at = new Date().toISOString();

    const jsonbColumnPatches: Array<[string, Record<string, unknown> | undefined]> = [
      ["alignment_workspace", data.alignmentWorkspacePatch],
      ["playbook_facilitation_plan", data.playbookFacilitationPlanPatch],
      ["playbook_activity_run", data.playbookActivityRunPatch],
      ["playbook_interpretation", data.playbookInterpretationPatch],
      ["evidence_gathering_plan", data.evidenceGatheringPlanPatch],
      ["pause_justification", data.pauseJustificationPatch],
    ];
    const activePatches = jsonbColumnPatches.filter(([, v]) => v !== undefined);
    if (activePatches.length > 0) {
      const cols = activePatches.map(([c]) => c).join(", ");
      const { data: existing } = await supabaseAdmin
        .from("sessions")
        .select(cols)
        .eq("id", data.sessionId)
        .single();
      for (const [col, incoming] of activePatches) {
        const prev = ((existing as any)?.[col] ?? {}) as Record<string, unknown>;
        patch[col] = { ...prev, ...(incoming as Record<string, unknown>) };
      }
    }


    const { data: session, error } = await supabaseAdmin
      .from("sessions")
      .update(patch as any)
      .eq("id", data.sessionId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { session };
  });

export const listInterventions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("interventions")
      .select("slug, label, short_description, long_description, pathway_type, phase, is_deep_vertical, sort_order, default_activity_list")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return { interventions: data ?? [] };
  });


export const sendStakeholderMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sessionId: string; stakeholderName: string; candidateMessage: string; phase?: string }) =>
    z.object({
      sessionId: z.string().uuid(),
      stakeholderName: z.string().min(1).max(120),
      candidateMessage: z.string().min(1).max(4000),
      phase: z.string().max(80).optional(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const stateAssessmentStart = Date.now();
    await assertSessionOwner(data.sessionId, context.userId);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    await supabaseAdmin.from("messages").insert({
      session_id: data.sessionId,
      role: "candidate",
      stakeholder_name: data.stakeholderName,
      content: data.candidateMessage,
      ...(data.phase ? { phase: data.phase } : {}),
    });


    const { data: session, error: sErr } = await supabaseAdmin
      .from("sessions")
      .select("*, scenarios(*)")
      .eq("id", data.sessionId)
      .single();
    if (sErr || !session) throw new Error("Session not found");

    const { data: transcript } = await supabaseAdmin
      .from("messages")
      .select("role, stakeholder_name, content")
      .eq("session_id", data.sessionId)
      .order("created_at", { ascending: true });

    const scenario = (session as any).scenarios;
    const stakeholders = (scenario.stakeholders ?? []) as Array<{ name: string; role: string; posture: string }>;
    const persona = stakeholders.find((s) => s.name === data.stakeholderName) ?? stakeholders[0];

    // ── Patch 3: fetch prior hidden state for THIS stakeholder, then run
    // a state-assessment call before we generate the reply. Serial pipeline;
    // the reply prompt depends on the assessed state.
    const { data: priorRows } = await supabaseAdmin
      .from("stakeholder_states" as any)
      .select("engagement, trust, guardedness, reasoning, turn_index")
      .eq("session_id", data.sessionId)
      .eq("stakeholder_id", persona.name)
      .order("turn_index", { ascending: false })
      .limit(1);
    const priorRow = (priorRows ?? [])[0] as any;
    const priorState: StakeholderState = priorRow
      ? {
          engagement: priorRow.engagement,
          trust: priorRow.trust,
          guardedness: priorRow.guardedness,
          reasoning: priorRow.reasoning ?? "",
        }
      : { engagement: "medium", trust: "medium", guardedness: "measured", reasoning: "initial state (no prior row)" };
    const nextTurnIndex = ((priorRow?.turn_index as number | undefined) ?? 0) + 1;

    const stateAssessmentT0 = Date.now();
    const assessed = await assessStakeholderStateUpdate({
      apiKey,
      priorState,
      coachTurn: data.candidateMessage,
      stakeholderPersona: persona,
    });
    const stateAssessmentMs = Date.now() - stateAssessmentT0;

    let currentState: StakeholderState;
    if (assessed) {
      currentState = assessed;
      const { error: insErr } = await supabaseAdmin.from("stakeholder_states" as any).insert({
        session_id: data.sessionId,
        stakeholder_id: persona.name,
        engagement: assessed.engagement,
        trust: assessed.trust,
        guardedness: assessed.guardedness,
        turn_index: nextTurnIndex,
        reasoning: assessed.reasoning,
      });
      if (insErr) console.error("[sendStakeholderMessage] state insert failed", insErr);
    } else {
      currentState = priorState;
      console.warn(`[sendStakeholderMessage] state assessment failed for ${persona.name}; carrying prior state forward`);
    }

    const toneModulator = toneModulatorForState(currentState);

    const systemPrompt = `${scenario.system_prompt}

SCENARIO CONTEXT:
${scenario.context}

WHAT YOUR TEAM CURRENTLY BELIEVES SUCCESS LOOKS LIKE:
${(scenario as any).success_definition ?? "(not articulated)"}

PRESSURE SHAPING THAT BELIEF:
${(scenario as any).success_pressure ?? "(unspecified)"}

YOU ARE PLAYING: ${persona.name} — ${persona.role}
CHARACTER POSTURE: ${persona.posture}

This is a one-on-one between you and the coach, and the coach may return to you multiple times across the engagement. Speak in first person as ${persona.name}.

CURRENT STATE — how you feel about this coach right now (HIDDEN from the coach; let it shape TONE, not content you announce):
${toneModulator}

Tone and rhythm:
- Keep replies SHORT (1-3 sentences, ~40 words). Real execs are concise.
- Do NOT drive the conversation. Answer what was asked, then stop.
- Do NOT monologue about politics, history, or other stakeholders unless directly asked. Hint, don't dump.
- It's fine to be uncertain ("I haven't thought about that") or redirect ("ask [other stakeholder]").
- NEVER explicitly name your engagement, trust, or guardedness level. NEVER say "I trust you less now." Let the coach FEEL it through tone.

Political realism (important):
- You remember the full prior transcript with the coach. Reference past commitments or things you said before when it's natural.
- You may evolve emotionally across the engagement: warm up, cool off, get impatient, get curious.
- You may resist or push back when the coach proposes something that conflicts with the success definition or pressure above.
- You may contradict yourself slightly when probed, the way real stakeholders do — don't be artificially consistent.
- If the coach challenges your success definition thoughtfully, take it seriously; if they challenge it crudely, get defensive.

What you CAN do:
- Answer methodology-flavored questions plainly from your role's lens (say "what customers are trying to get done", not "jobs-to-be-done").
- When the coach asks for something concrete (a meeting, an intro, time with your team, a pilot slot), make a realistic small commitment if it fits your posture and the moment — e.g. "I could give you 15 minutes next week". Don't offer these unprompted.

Hard rules:
- Do NOT coach the candidate. Do NOT break character. Do NOT name Strategyzer frameworks.`;




    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...(transcript ?? []).map((m: any) => ({
        role: m.role === "candidate" ? "user" : "assistant",
        content: m.role === "candidate"
          ? `[Coach to ${m.stakeholder_name}]: ${m.content}`
          : `[${m.stakeholder_name}]: ${m.content}`,
      })),
    ];

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: chatMessages,
      }),
    });

    if (!res.ok) {
      if (res.status === 429) throw new Error("Rate limit hit — please wait a moment and try again.");
      if (res.status === 402) throw new Error("AI credits exhausted. Top up in Settings → Workspace → Usage.");
      throw new Error(`AI gateway error: ${res.status}`);
    }

    const json = await res.json();
    const reply: string = json.choices?.[0]?.message?.content ?? "...";

    const { data: saved } = await supabaseAdmin
      .from("messages")
      .insert({
        session_id: data.sessionId,
        role: "stakeholder",
        stakeholder_name: persona.name,
        content: reply,
        ...(data.phase ? { phase: data.phase } : {}),
      })
      .select()
      .single();


    const totalMs = Date.now() - stateAssessmentStart;
    console.log(`[sendStakeholderMessage] stakeholder=${persona.name} stateAssessmentMs=${stateAssessmentMs} totalMs=${totalMs}`);
    return { message: saved, _timing: { stateAssessmentMs, totalMs } };
  });


// ---------- Scoping call (group video-call simulation) ----------

export const sendScopingTurn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sessionId: string; candidateMessage: string }) =>
    z.object({
      sessionId: z.string().uuid(),
      candidateMessage: z.string().min(1).max(4000),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    await assertSessionOwner(data.sessionId, context.userId);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    // Save coach turn
    const { data: coachMsg } = await supabaseAdmin.from("messages").insert({
      session_id: data.sessionId,
      role: "candidate",
      stakeholder_name: "(group)",
      content: data.candidateMessage,
      phase: "scoping",
    }).select().single();

    const { data: session } = await supabaseAdmin
      .from("sessions")
      .select("*, scenarios(*)")
      .eq("id", data.sessionId)
      .single();
    if (!session) throw new Error("Session not found");

    const { data: transcript } = await supabaseAdmin
      .from("messages")
      .select("role, stakeholder_name, content")
      .eq("session_id", data.sessionId)
      .eq("phase", "scoping")
      .order("created_at", { ascending: true });

    const scenario: any = (session as any).scenarios;
    const stakeholders = (scenario.stakeholders ?? []) as Array<{ name: string; role: string; posture: string }>;
    const roster = stakeholders.map((s) => `- ${s.name} (${s.role}) — posture: ${s.posture}`).join("\n");

    const systemPrompt = `You are simulating a Strategyzer SCOPING CALL — the first kick-off video meeting between a coach (the user) and a team that hired them.

SCENARIO: ${scenario.title}
${scenario.context}

TEAM ON THE CALL:
${roster}

YOUR JOB: pick the ONE most-natural stakeholder to respond to the coach's last message, then speak AS that person. Multiple people don't talk at once.

Selection rule:
- If the coach addresses someone by name → that person responds.
- Otherwise pick the person whose role/posture is most relevant to what was just asked.
- Vary speakers across the call; don't let one person dominate.

Character rules:
- Stay in character. Real people on a scoping call are sometimes messy: they jump ahead, give vague answers, or share concerns the coach didn't ask about. Posture above is your anchor.
- Surface political subtext, turf battles, or hidden agendas ONLY when that's literally in your posture AND it's a natural reaction to what was just asked. Do not invent political drama that isn't in your character brief.
- Replies should feel spoken (1-3 short sentences, contractions, sometimes a single line). Never a bullet list. Never coach the coach. Never name frameworks.
- If the coach hasn't earned the answer yet (asked a closed question, too soon, missed context), give a partial / deflecting answer the way a real busy executive would.

Return STRICT JSON only:
{"speaker": "<exact stakeholder name>", "reply": "<their spoken line>"}`;

    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...(transcript ?? []).map((m: any) => ({
        role: m.role === "candidate" ? "user" : "assistant",
        content: m.role === "candidate"
          ? `Coach: ${m.content}`
          : `${m.stakeholder_name}: ${m.content}`,
      })),
    ];

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: chatMessages,
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      if (res.status === 429) throw new Error("Rate limit — try again shortly.");
      if (res.status === 402) throw new Error("AI credits exhausted.");
      throw new Error(`AI gateway error: ${res.status}`);
    }
    const json = await res.json();
    const content = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: { speaker?: string; reply?: string } = {};
    try { parsed = JSON.parse(content); } catch { /* ignore */ }
    const speaker = stakeholders.find((s) => s.name === parsed.speaker)?.name ?? stakeholders[0]?.name ?? "Stakeholder";
    const reply = (parsed.reply ?? "…").toString().slice(0, 1200);

    const { data: stakeholderMsg } = await supabaseAdmin
      .from("messages")
      .insert({
        session_id: data.sessionId,
        role: "stakeholder",
        stakeholder_name: speaker,
        content: reply,
        phase: "scoping",
      })
      .select()
      .single();

    return { coachMessage: coachMsg, stakeholderMessage: stakeholderMsg };
  });

export const extractFraming = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sessionId: string }) => z.object({ sessionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSessionOwner(data.sessionId, context.userId);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const { data: transcript } = await supabaseAdmin
      .from("messages")
      .select("role, stakeholder_name, content")
      .eq("session_id", data.sessionId)
      .eq("phase", "scoping")
      .order("created_at", { ascending: true });

    if (!transcript || transcript.length === 0) {
      throw new Error("No scoping conversation yet — talk to the team first.");
    }

    const convo = transcript
      .map((m: any) => (m.role === "candidate" ? `Coach: ${m.content}` : `${m.stakeholder_name}: ${m.content}`))
      .join("\n");

    const prompt = `You just observed a Strategyzer scoping call between a coach and a client team. Extract the five scoping fields strictly from what the TEAM said (not the coach's own guesses).

If a field was never adequately covered, leave it empty ("") and note it in "gaps".

TRANSCRIPT:
${convo}

Return strict JSON:
{
  "decision": "the single decision the team must make in the next ~90 days",
  "unclear": "what they said is currently unclear / ambiguous",
  "tried": "what they've already tried, frameworks, past attempts",
  "nothing": "what they said happens if they do nothing — cost of inaction",
  "success": "concrete success criteria for the engagement",
  "gaps": ["short note for each field the coach failed to surface"]
}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      if (res.status === 429) throw new Error("Rate limit — try again shortly.");
      if (res.status === 402) throw new Error("AI credits exhausted.");
      throw new Error(`AI gateway error: ${res.status}`);
    }
    const json = await res.json();
    const content = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = {}; }
    return { draft: parsed };
  });

// ---------- Application step: AI fills a canvas cell from the team's perspective ----------



// Facilitation Prompt Assist — formerly "Ask team".
// Does NOT autofill cells. Returns:
//   - team_says: a realistic WEAK team response for this cell (vague / feature-first /
//                solutioning / unsupported confidence) the coach must redirect
//   - probing_questions: 2-4 open-ended probes to push specificity and evidence
//   - evidence_gaps: what's still unsupported and needs a behavioral observation
//   - reframe: one short line the coach could use to redirect weak thinking
//   - contradiction: an inconsistency vs other cells / transcript, or null
// The coach remains responsible for facilitation, interpretation, sequencing, judgment.
export const suggestCanvasCell = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sessionId: string; cellKey: string }) =>
    z.object({
      sessionId: z.string().uuid(),
      cellKey: z.string().min(1).max(80),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    await assertSessionOwner(data.sessionId, context.userId);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const { data: session } = await supabaseAdmin
      .from("sessions")
      .select("framing_notes, methodology_choice, methodology_rationale, application_canvas, scenarios(title, context, summary, stakeholders, ambiguity_factors)")
      .eq("id", data.sessionId)
      .single();
    if (!session) throw new Error("Session not found");

    const canvas = canvasForPlaybook((session as any).methodology_choice);
    if (!canvas) throw new Error("No canvas mapped — pick a playbook first.");
    const cell = canvas.cells.find((c) => c.key === data.cellKey);
    if (!cell) throw new Error(`Unknown cell: ${data.cellKey}`);

    const { data: transcript } = await supabaseAdmin
      .from("messages")
      .select("role, stakeholder_name, content, phase")
      .eq("session_id", data.sessionId)
      .order("created_at", { ascending: true });

    const convo = (transcript ?? [])
      .map((m: any) => (m.role === "candidate" ? `Coach: ${m.content}` : `${m.stakeholder_name}: ${m.content}`))
      .join("\n");

    const scenario: any = (session as any).scenarios;
    const existing = (session as any).application_canvas ?? {};
    const existingPretty = Object.entries(existing)
      .map(([k, v]) => `- ${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
      .join("\n");

    const prompt = `You are simulating a live Strategyzer working session for the coach to FACILITATE in real time. The coach is currently on the "${cell.label}" cell of a "${canvas.name}".

${STRATEGYZER_INTELLIGENCE}

Your job is NOT to draft polished cell content. Your job is to give the coach the messy, realistic raw material of a live working session so they can practice facilitation.

Return STRICT JSON with this exact shape:
{
  "team_says": "<one short, realistic WEAK team response someone might say for this cell — vague ('everyone is our customer'), feature-first ('let's just add AI'), solutioning, generic, or unsupported confidence. 1-2 sentences, spoken voice, no bullets.>",
  "probing_questions": ["<2-4 open-ended probing questions the coach could ask to push specificity, behavior, and evidence>"],
  "evidence_gaps": ["<1-3 specific things that are unsupported and need a behavioral observation or interview to validate>"],
  "reframe": "<one short line the coach could use to redirect weak thinking back to customer specificity / evidence>",
  "contradiction": "<one inconsistency between what was just said and other cells / what stakeholders said in the transcript — or null if none>"
}

Rules:
- The "team_says" line should sound like a real, slightly defensive, busy team — not a polished strategist. It is a facilitation stimulus, not an answer.
- Probing questions must be OPEN-ENDED and BEHAVIORAL. Never "would customers want X" or "should we add X".
- If the transcript has real evidence for this cell, the contradiction may reference it. Otherwise, contradiction can be null.
- Do NOT fill in the cell. Do NOT propose a "suggestion" field. The coach writes the cell themselves.

SCENARIO: ${scenario.title}
${scenario.context}

STAKEHOLDERS: ${JSON.stringify(scenario.stakeholders)}

CURRENT CELL: ${cell.label} — ${cell.hint}

FRAMING NOTES: ${(session as any).framing_notes ?? "(none)"}

CONVERSATION SO FAR:
${convo || "(no conversation yet)"}

EXISTING CANVAS CELLS (for contradiction detection):
${existingPretty || "(empty)"}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      if (res.status === 429) throw new Error("Rate limit — try again shortly.");
      if (res.status === 402) throw new Error("AI credits exhausted.");
      throw new Error(`AI gateway error: ${res.status}`);
    }
    const json = await res.json();
    const content = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = {}; }
    return {
      cellKey: cell.key,
      team_says: parsed.team_says ?? "",
      probing_questions: Array.isArray(parsed.probing_questions) ? parsed.probing_questions : [],
      evidence_gaps: Array.isArray(parsed.evidence_gaps) ? parsed.evidence_gaps : [],
      reframe: parsed.reframe ?? "",
      contradiction: parsed.contradiction ?? null,
    };
  });


// ---------- Live facilitation moment: coach moves, team replies ----------

export const respondAsTeamCell = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    sessionId: string;
    cellKey: string;
    history: { role: "team" | "coach"; content: string }[];
    coachMove: string;
  }) =>
    z.object({
      sessionId: z.string().uuid(),
      cellKey: z.string().min(1).max(64),
      history: z.array(z.object({
        role: z.enum(["team", "coach"]),
        content: z.string().min(1).max(4000),
      })).max(12),
      coachMove: z.string().min(1).max(4000),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    await assertSessionOwner(data.sessionId, context.userId);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const { data: session } = await supabaseAdmin
      .from("sessions")
      .select("framing_notes, methodology_choice, application_canvas, scenarios(title, context, stakeholders)")
      .eq("id", data.sessionId)
      .single();
    if (!session) throw new Error("Session not found");

    const canvas = canvasForPlaybook((session as any).methodology_choice);
    if (!canvas) throw new Error("No canvas mapped");
    const cell = canvas.cells.find((c) => c.key === data.cellKey);
    if (!cell) throw new Error(`Unknown cell: ${data.cellKey}`);

    const scenario: any = (session as any).scenarios;
    const stakeholders = (scenario.stakeholders ?? []) as Array<{ name: string; role: string; posture: string }>;

    const transcript = [
      ...data.history.map((h) => (h.role === "coach" ? `Coach: ${h.content}` : `Team: ${h.content}`)),
      `Coach: ${data.coachMove}`,
    ].join("\n");

    const prompt = `You are simulating a LIVE Strategyzer working session. The coach is facilitating the "${cell.label}" cell of a "${canvas.name}".

${STRATEGYZER_INTELLIGENCE}

Reply AS ONE TEAM MEMBER reacting to the coach's last move. Prefix with "[Name]". Stay in character — busy, slightly defensive, half-formed, sometimes solution-jumping, sometimes confused, sometimes pushing back. NOT polished. NOT consultant-speak.

Then return STRICT JSON with this exact shape:
{
  "team_reply": "<the spoken team reply, prefixed with [Name]. 1-3 sentences. Keep realistic facilitation tension: vague answer, deflection, sub-question, mild disagreement, or a real but partial signal>",
  "facilitation_flag": "<one of: 'recovered' | 'still_vague' | 'evidence_gap' | 'solution_jumping' | 'team_tension' | 'genuine_progress'>",
  "coach_signal": "<one short sentence naming what the coach's move did well or missed — e.g. 'open-ended probe surfaced a behavioral example' or 'closed yes/no question pulled the team into agreement theater'>"
}

Rules:
- If the coach asks an open behavioral question, the team may give a partial real example BUT keep evidence ambiguous.
- If the coach asks leading / yes-no / hypothetical questions, the team agrees superficially or deflects.
- Never wrap up the cell. Leave something unresolved unless the coach has explicitly closed the moment.
- Never use Strategyzer jargon unless the coach introduced it.

TEAM MEMBERS:
${stakeholders.map((s) => `- ${s.name} (${s.role}) — ${s.posture}`).join("\n")}

SCENARIO: ${scenario.title}
${scenario.context}

CURRENT CELL: ${cell.label} — ${cell.hint}

FACILITATION TRANSCRIPT SO FAR:
${transcript}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      if (res.status === 429) throw new Error("Rate limit — try again shortly.");
      if (res.status === 402) throw new Error("AI credits exhausted.");
      throw new Error(`AI gateway error: ${res.status}`);
    }
    const json = await res.json();
    const content = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = {}; }
    return {
      cellKey: cell.key,
      team_reply: parsed.team_reply ?? "",
      facilitation_flag: parsed.facilitation_flag ?? "still_vague",
      coach_signal: parsed.coach_signal ?? "",
    };
  });





export const saveCanvas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sessionId: string; canvas: Record<string, unknown> }) =>
    z.object({
      sessionId: z.string().uuid(),
      canvas: z.record(z.string(), z.union([z.string().max(8000), z.array(z.string().max(2000)).max(50)])),

    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    await assertSessionOwner(data.sessionId, context.userId);
    const { error } = await supabaseAdmin
      .from("sessions")
      .update({ application_canvas: data.canvas, status: "application" })
      .eq("id", data.sessionId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Playbook working session: simulate the team doing an activity with the coach ----------

import { BUILTIN_PLAYBOOK } from "@/lib/playbooks";

export const sendPlaybookTeamTurn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sessionId: string; activityKey: string; coachMessage: string }) =>
    z.object({
      sessionId: z.string().uuid(),
      activityKey: z.string().min(1).max(64),
      coachMessage: z.string().min(1).max(4000),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    await assertSessionOwner(data.sessionId, context.userId);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const activity = BUILTIN_PLAYBOOK.activities.find((a) => a.key === data.activityKey);
    if (!activity) throw new Error("Unknown activity");

    const phase = `playbook:${data.activityKey}`;

    await supabaseAdmin.from("messages").insert({
      session_id: data.sessionId,
      role: "candidate",
      stakeholder_name: "(team)",
      content: data.coachMessage,
      phase,
    });

    const { data: session } = await supabaseAdmin
      .from("sessions")
      .select("*, scenarios(*)")
      .eq("id", data.sessionId)
      .single();
    if (!session) throw new Error("Session not found");

    const scenario = (session as any).scenarios;
    const stakeholders = (scenario.stakeholders ?? []) as Array<{ name: string; role: string; posture: string }>;

    const { data: transcript } = await supabaseAdmin
      .from("messages")
      .select("role, stakeholder_name, content")
      .eq("session_id", data.sessionId)
      .eq("phase", phase)
      .order("created_at", { ascending: true });

    const systemPrompt = `You are simulating the project team in a paper-and-pen working session with a Strategyzer coach.

SCENARIO: ${scenario.title}
${scenario.context}

TEAM MEMBERS in this working session:
${stakeholders.map((s) => `- ${s.name} (${s.role}) — ${s.posture}`).join("\n")}

ACTIVITY THE COACH IS RUNNING:
"${activity.title}" — ${activity.objective}
Why it matters: ${activity.whyItMatters}

RULES:
- Respond as ONE team member at a time (pick whichever member would most naturally respond to what the coach just said). Prefix the reply with the speaker's name in brackets, e.g. "[Maya] ...".
- Stay in character. Bring their actual job context, examples, and (where appropriate) disagreements with each other.
- This is a working session, not an interview. Speak naturally: half-formed ideas, "I think...", "actually that's a good question for ${'$'}{otherName}", pushback, examples from real work.
- Do NOT use Strategyzer jargon. Don't say "jobs to be done", "pains", "gains", "value proposition" unless the coach has already explained it. Use plain language.
- Do NOT coach the coach. If the coach asks a vague or leading question, answer it but show the team getting a bit stuck — that's the coach's cue to reframe.
- 2-5 sentences. One speaker per turn unless a quick back-and-forth between two members genuinely fits.`;

    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...(transcript ?? []).map((m: any) => ({
        role: m.role === "candidate" ? "user" : "assistant",
        content: m.role === "candidate" ? `[Coach]: ${m.content}` : m.content,
      })),
    ];

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: chatMessages,
      }),
    });
    if (!res.ok) {
      if (res.status === 429) throw new Error("Rate limit — try again shortly.");
      if (res.status === 402) throw new Error("AI credits exhausted.");
      throw new Error(`AI gateway error: ${res.status}`);
    }
    const json = await res.json();
    const reply: string = json.choices?.[0]?.message?.content ?? "...";

    // Try to extract speaker name from "[Name] ..." prefix
    const match = reply.match(/^\s*\[([^\]]+)\]\s*(.*)$/s);
    const speaker = match?.[1]?.trim() || "Team";
    const body = match?.[2]?.trim() || reply;

    const { data: saved } = await supabaseAdmin
      .from("messages")
      .insert({
        session_id: data.sessionId,
        role: "stakeholder",
        stakeholder_name: speaker,
        content: body,
        phase,
      })
      .select()
      .single();

    return { message: saved };
  });



