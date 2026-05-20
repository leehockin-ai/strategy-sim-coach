import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PLAYBOOKS } from "@/lib/playbooks";

export const suggestPlaybook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sessionId: string }) => z.object({ sessionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSessionOwner(data.sessionId, context.userId);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const { data: session } = await supabaseAdmin
      .from("sessions")
      .select("framing_notes, scenarios(title, context, summary, ambiguity_factors)")
      .eq("id", data.sessionId)
      .single();
    if (!session) throw new Error("Session not found");

    const scenario = (session as any).scenarios;
    const playbookCatalog = PLAYBOOKS.map(
      (p) => `- ${p.id} — ${p.name} (${p.diagnosis}): "${p.whenToUse}" · Signals: ${p.signals.join("; ")} · Outcome: ${p.outcome}`,
    ).join("\n");

    const prompt = `You are a Strategyzer master coach evaluating a scoping conversation. Given the scenario and the candidate's framing, recommend ONE primary playbook from the official Strategyzer library. Do not mix playbooks.

SCENARIO: ${scenario.title}
${scenario.context}
Ambiguity: ${(scenario.ambiguity_factors ?? []).join(", ")}

CANDIDATE FRAMING:
${(session as any).framing_notes ?? "(no framing provided)"}

PLAYBOOK OPTIONS:
${playbookCatalog}

Return strict JSON: {"playbookId": "<id>", "confidence": "low|medium|high", "rationale": "<2-3 sentences citing the scoping signals>", "watchouts": ["<short risk if this playbook is misapplied>", "..."]}`;

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
    return { suggestion: parsed };
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
    return { session };
  });

export const listMySessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin
      .from("sessions")
      .select("*, scenarios(title, industry, difficulty)")
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { sessions: data ?? [] };
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
    return { session, messages: messages ?? [], evaluation };
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
  }) =>
    z.object({
      sessionId: z.string().uuid(),
      framingNotes: z.string().max(8000).optional(),
      methodologyChoice: z.string().max(500).optional(),
      methodologyRationale: z.string().max(4000).optional(),
      interventionRecommendation: z.string().max(8000).optional(),
      decision: z.string().max(60).optional(),
      status: z.string().max(40).optional(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    await assertSessionOwner(data.sessionId, context.userId);
    const patch: {
      framing_notes?: string;
      methodology_choice?: string;
      methodology_rationale?: string;
      intervention_recommendation?: string;
      decision?: string;
      status?: string;
    } = {};
    if (data.framingNotes !== undefined) patch.framing_notes = data.framingNotes;
    if (data.methodologyChoice !== undefined) patch.methodology_choice = data.methodologyChoice;
    if (data.methodologyRationale !== undefined) patch.methodology_rationale = data.methodologyRationale;
    if (data.interventionRecommendation !== undefined) patch.intervention_recommendation = data.interventionRecommendation;
    if (data.decision !== undefined) patch.decision = data.decision;
    if (data.status !== undefined) patch.status = data.status;

    const { data: session, error } = await supabaseAdmin
      .from("sessions")
      .update(patch)
      .eq("id", data.sessionId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { session };
  });

export const sendStakeholderMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sessionId: string; stakeholderName: string; candidateMessage: string }) =>
    z.object({
      sessionId: z.string().uuid(),
      stakeholderName: z.string().min(1).max(120),
      candidateMessage: z.string().min(1).max(4000),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    await assertSessionOwner(data.sessionId, context.userId);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    await supabaseAdmin.from("messages").insert({
      session_id: data.sessionId,
      role: "candidate",
      stakeholder_name: data.stakeholderName,
      content: data.candidateMessage,
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

    const systemPrompt = `${scenario.system_prompt}

SCENARIO CONTEXT:
${scenario.context}

YOU ARE PLAYING: ${persona.name} — ${persona.role}
CHARACTER POSTURE: ${persona.posture}

The candidate (coach) is currently addressing you directly. Respond in first person as ${persona.name}. Be authentic, conversational, 2-4 sentences. Do NOT coach the candidate. Do NOT break character. Do NOT mention frameworks. React as ${persona.name} would given the posture above.`;

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
      })
      .select()
      .single();

    return { message: saved };
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
- Stay in character. Real people on a scoping call are messy: they jump ahead, give vague answers, contradict each other, push back, share concerns the coach didn't ask about, mention internal politics. Posture above is your anchor.
- Replies should feel spoken (1-3 short sentences, contractions, sometimes a single line). Never a bullet list. Never coach the coach. Never mention frameworks.
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
