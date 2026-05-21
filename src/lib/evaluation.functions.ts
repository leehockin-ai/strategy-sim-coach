import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Per-section rubric. Each section corresponds to a step in the simulation
// and is scored against its own focused criteria.
export const SECTION_RUBRIC = [
  {
    key: "framing",
    label: "Framing",
    step: "Step 2",
    focus:
      "Did the coach reframe the brief into clear problem statements & testable assumptions before prescribing anything? Strategyzer rigor: separates evidence from opinion, names the unknowns.",
  },
  {
    key: "methodology",
    label: "Methodology Judgment",
    step: "Step 3",
    focus:
      "Was the chosen methodology fit-for-purpose for the evidence at hand, and was the rationale specific (not generic Strategyzer vocabulary)?",
  },
  {
    key: "navigation",
    label: "Stakeholder Navigation",
    step: "Step 4",
    focus:
      "How well did the coach navigate stakeholders: surfacing concerns, securing concrete commitments, managing politics without over-pleasing or solution-jumping. Did agreements get captured cleanly?",
  },
  {
    key: "activity_ecosystem",
    label: "Activity 1 · Customer Ecosystem Map",
    step: "Step 6 · Activity 1",
    focus:
      "Quality of the ecosystem artifact: are end users, beneficiaries, economic buyers, decision makers, channel partners, influencers, recommenders and saboteurs separated and named specifically (not 'customers')? Did the coach guide the team to surface role disagreement rather than fill cells themselves?",
  },
  {
    key: "activity_customer_profile",
    label: "Activity 2 · Customer Profile",
    step: "Step 6 · Activity 2",
    focus:
      "Quality of the Jobs/Pains/Gains artifact: jobs are verbs and span functional/social/emotional, pains and gains are concrete and tied to the priority customer chosen from the ecosystem, assumptions are flagged vs evidence. Did the coach push back on vague language without taking over the pen?",
  },
  {
    key: "methodological_soundness",
    label: "Strategyzer Methodological Soundness",
    step: "Cross-cutting",
    focus:
      "Does the coaching consistently honor Strategyzer principles across the session: evidence over opinion, test before scale, customer-first sequencing (ecosystem → profile → value map), and separating discovery from delivery? Flag any methodology drift, framework name-dropping without substance, or skipped sequencing.",
  },
  {
    key: "intervention",
    label: "Intervention Discipline",
    step: "Step 5",
    focus:
      "Was the recommendation tight, evidence-based, and aligned to what was agreed in 1:1s and produced in the working session? Did commitments made in dialogue (e.g. CIO pitch) get reflected?",
  },
] as const;

// Legacy export so the report page still imports cleanly.
export const RUBRIC_DIMENSIONS = SECTION_RUBRIC.map((s) => ({ key: s.key, label: s.label }));

export const generateEvaluation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sessionId: string }) => z.object({ sessionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const { data: session, error } = await supabaseAdmin
      .from("sessions")
      .select("*, scenarios(*)")
      .eq("id", data.sessionId)
      .single();
    if (error || !session) throw new Error("Session not found");
    if ((session as any).owner_id !== context.userId) throw new Error("Forbidden");

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
You assess coaching JUDGMENT, not memorization. Multiple paths can be valid.

You will evaluate FIVE distinct checkpoints in the candidate's session, each against its OWN rubric focus.
For each section, return:
  • score 1-5 (1=absent/harmful, 2=weak, 3=competent, 4=strong, 5=exemplary)
  • 1-3 specific strengths observed in THAT section's artifacts/transcript
  • 1-3 specific gaps in THAT section
  • evidence: cite observable moments, quoting candidate text where useful
  • verdict: one of "exemplary" | "strong" | "competent" | "developing" | "insufficient"

Then return a FINAL ASSESSMENT:
  • overall_summary: 3-5 sentences synthesizing the pattern across sections
  • top_strengths: 2-4 cross-cutting strengths
  • top_gaps: 2-4 cross-cutting development areas
  • calibration_notes: what a human reviewer should sanity-check before signing off
  • recommendation: "certify" | "conditional" | "not_yet"
  • recommendation_rationale: 1-2 sentences justifying the call

Be specific. Generic praise ("good facilitation") is not acceptable — cite the moment.`;

    const sectionDescriptions = SECTION_RUBRIC.map(
      (sec) => `• ${sec.label} (${sec.step}) — ${sec.focus}`
    ).join("\n");

    const userPrompt = `SCENARIO: ${scenario.title}
${scenario.summary}

CANDIDATE: ${s.candidate_name}

SECTIONS TO EVALUATE:
${sectionDescriptions}

══════════════════════════════════════════
SECTION INPUTS
══════════════════════════════════════════

── FRAMING (Step 2) ──
${s.framing_notes || "(none)"}

── METHODOLOGY (Step 3) ──
Choice: ${s.methodology_choice || "(none)"}
Rationale: ${s.methodology_rationale || "(none)"}

── DIALOGUE (Step 4) ──
Commitments captured: ${s.dialogue_commitments || "(none captured)"}

Stakeholder transcript:
${transcriptText || "(no transcript)"}

── APPLICATION (Step 6) — Strategyzer playbook applied with the team ──
Playbook: Strong Value Propositions and Differentiation with Gen AI
Activities: (1) Customer ecosystem map, (2) Customer Profile (Jobs/Pains/Gains).
Team artifacts produced:
${s.playbook_application ? JSON.stringify(s.playbook_application, null, 2) : "(empty — activities not completed)"}

Application canvas notes:
${s.application_canvas ? JSON.stringify(s.application_canvas, null, 2) : "(none)"}

── INTERVENTION (Step 5) ──
Recommendation: ${s.intervention_recommendation || "(none)"}
Final decision: ${s.decision || "(none)"}`;

    const sectionSchema = {
      type: "object",
      properties: {
        score: { type: "integer", minimum: 1, maximum: 5 },
        verdict: {
          type: "string",
          enum: ["exemplary", "strong", "competent", "developing", "insufficient"],
        },
        evidence: { type: "string", description: "Cite specific observable behavior or quote artifact text." },
        strengths: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 },
        gaps: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 },
      },
      required: ["score", "verdict", "evidence", "strengths", "gaps"],
      additionalProperties: false,
    };

    const tool = {
      type: "function",
      function: {
        name: "submit_evaluation",
        description: "Return per-section rubric evaluations and a final assessment.",
        parameters: {
          type: "object",
          properties: {
            sections: {
              type: "object",
              properties: Object.fromEntries(SECTION_RUBRIC.map((sec) => [sec.key, sectionSchema])),
              required: SECTION_RUBRIC.map((sec) => sec.key),
              additionalProperties: false,
            },
            overall_summary: { type: "string" },
            top_strengths: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4 },
            top_gaps: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4 },
            calibration_notes: { type: "string", description: "What a human reviewer should double-check." },
            recommendation: { type: "string", enum: ["certify", "conditional", "not_yet"] },
            recommendation_rationale: { type: "string" },
          },
          required: [
            "sections",
            "overall_summary",
            "top_strengths",
            "top_gaps",
            "calibration_notes",
            "recommendation",
            "recommendation_rationale",
          ],
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

    // Flatten per-section scores into the legacy `scores` jsonb shape so older
    // consumers keep working, and stash the full structured payload alongside.
    const flatScores: Record<string, { score: number; evidence: string }> = {};
    for (const sec of SECTION_RUBRIC) {
      const sx = parsed.sections?.[sec.key];
      if (sx) flatScores[sec.key] = { score: sx.score, evidence: sx.evidence };
    }

    const { data: evaluation, error: eErr } = await supabaseAdmin
      .from("evaluations")
      .upsert(
        {
          session_id: data.sessionId,
          scores: { ...flatScores, sections: parsed.sections },
          strengths: parsed.top_strengths,
          gaps: parsed.top_gaps,
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
  .middleware([requireSupabaseAuth])
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

export const listReviewSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("sessions")
      .select(
        "id, candidate_name, candidate_email, status, created_at, completed_at, scenarios(title, slug), evaluations(recommendation, reviewer_decision)"
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { sessions: data ?? [] };
  });
