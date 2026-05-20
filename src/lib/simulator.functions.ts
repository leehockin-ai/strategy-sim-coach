import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
