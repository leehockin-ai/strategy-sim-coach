import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const RUBRIC = [
  { key: "problem_framing", label: "Problem Framing" },
  { key: "methodology_judgment", label: "Methodology Judgment" },
  { key: "facilitation_posture", label: "Facilitation & Coaching Posture" },
  { key: "evidence_thinking", label: "Evidence-Based Thinking" },
  { key: "intervention_discipline", label: "Intervention Discipline" },
  { key: "stakeholder_navigation", label: "Stakeholder Navigation" },
];

export const RUBRIC_DIMENSIONS = RUBRIC;

export const generateEvaluation = createServerFn({ method: "POST" })
  .inputValidator((d: { sessionId: string }) => z.object({ sessionId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const { data: session, error } = await supabaseAdmin
      .from("sessions")
      .select("*, scenarios(*)")
      .eq("id", data.sessionId)
      .single();
    if (error || !session) throw new Error("Session not found");

    const { data: transcript } = await supabaseAdmin
      .from("messages")
      .select("role, stakeholder_name, content, created_at")
      .eq("session_id", data.sessionId)
      .order("created_at", { ascending: true });

    const scenario = (session as any).scenarios;
    const s: any = session;

    const transcriptText = (transcript ?? [])
      .map((m: any) => `${m.role === "candidate" ? "COACH" : m.stakeholder_name?.toUpperCase()}: ${m.content}`)
      .join("\n\n");

    const systemPrompt = `You are an expert Strategyzer certification reviewer.
You assess coaching judgment, not memorization or "correct" answers.
Multiple paths can be valid. Evaluate OBSERVABLE BEHAVIOR.

GOOD SIGNALS: clarifying before prescribing, reframing assumptions into testable hypotheses, redirecting ownership, simplifying next steps, identifying evidence gaps, appropriate escalation.
BAD SIGNALS: solution-jumping, overfacilitating, dominating, prescribing without context, unnecessary scope expansion, closed/directive questioning.

Score each rubric dimension 1–5:
1 = absent / harmful, 2 = weak, 3 = competent, 4 = strong, 5 = exemplary.

Be specific. Cite observable moments from the transcript and written artifacts.`;

    const userPrompt = `SCENARIO: ${scenario.title}
${scenario.summary}

CANDIDATE: ${s.candidate_name}

— Framing notes —
${s.framing_notes || "(none)"}

— Methodology choice —
${s.methodology_choice || "(none)"}
Rationale: ${s.methodology_rationale || "(none)"}

— Intervention recommendation —
${s.intervention_recommendation || "(none)"}

— Final decision —
${s.decision || "(none)"}

— Stakeholder transcript —
${transcriptText || "(no transcript)"}`;

    const tool = {
      type: "function",
      function: {
        name: "submit_evaluation",
        description: "Return a rubric-based coaching evaluation.",
        parameters: {
          type: "object",
          properties: {
            scores: {
              type: "object",
              properties: Object.fromEntries(
                RUBRIC.map((r) => [
                  r.key,
                  {
                    type: "object",
                    properties: {
                      score: { type: "integer", minimum: 1, maximum: 5 },
                      evidence: { type: "string", description: "Cite specific observable behavior." },
                    },
                    required: ["score", "evidence"],
                    additionalProperties: false,
                  },
                ])
              ),
              required: RUBRIC.map((r) => r.key),
              additionalProperties: false,
            },
            strengths: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 6 },
            gaps: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 6 },
            recommendation: { type: "string", enum: ["certify", "conditional", "not_yet"] },
            overall_summary: { type: "string", description: "2-4 sentence overall judgment." },
          },
          required: ["scores", "strengths", "gaps", "recommendation", "overall_summary"],
          additionalProperties: false,
        },
      },
    };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "submit_evaluation" } },
      }),
    });

    if (!res.ok) {
      if (res.status === 429) throw new Error("Rate limit hit — please wait and retry.");
      if (res.status === 402) throw new Error("AI credits exhausted. Top up in Settings → Workspace → Usage.");
      throw new Error(`AI gateway error: ${res.status}`);
    }

    const json = await res.json();
    const call = json.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) throw new Error("AI did not return an evaluation");
    const parsed = JSON.parse(call.function.arguments);

    const { data: evaluation, error: eErr } = await supabaseAdmin
      .from("evaluations")
      .upsert(
        {
          session_id: data.sessionId,
          scores: parsed.scores,
          strengths: parsed.strengths,
          gaps: parsed.gaps,
          recommendation: parsed.recommendation,
          overall_summary: parsed.overall_summary,
          raw_response: parsed,
        },
        { onConflict: "session_id" }
      )
      .select()
      .single();
    if (eErr) throw new Error(eErr.message);

    await supabaseAdmin
      .from("sessions")
      .update({ status: "evaluated", completed_at: new Date().toISOString() })
      .eq("id", data.sessionId);

    return { evaluation };
  });

export const setReviewerDecision = createServerFn({ method: "POST" })
  .inputValidator((d: { sessionId: string; reviewerNotes?: string; reviewerDecision: string }) =>
    z.object({
      sessionId: z.string().uuid(),
      reviewerNotes: z.string().max(8000).optional(),
      reviewerDecision: z.enum(["certify", "conditional", "not_yet"]),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const { data: evaluation, error } = await supabaseAdmin
      .from("evaluations")
      .update({
        reviewer_notes: data.reviewerNotes ?? null,
        reviewer_decision: data.reviewerDecision,
      })
      .eq("session_id", data.sessionId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { evaluation };
  });

export const listReviewSessions = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .select("id, candidate_name, candidate_email, status, created_at, completed_at, scenarios(title, slug), evaluations(recommendation, reviewer_decision)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return { sessions: data ?? [] };
});
