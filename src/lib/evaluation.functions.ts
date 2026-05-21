import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { STRATEGYZER_INTELLIGENCE } from "@/lib/strategyzer-methodology";

// Per-section rubric aligned to the coaching-judgment philosophy:
// reward simplification, evidence rigor, sequencing, alignment, restraint.
// Penalize forced playbook application, over-engineering, canvas-completion thinking.
export const SECTION_RUBRIC = [
  {
    key: "situation_framing",
    label: "Situation Framing",
    step: "Step 1",
    focus:
      "Did the coach surface real ambiguity, separate evidence from opinion, and explicitly challenge or reframe the team's success definition where it was unrealistic? Reward naming the unknowns over pretending to know.",
  },
  {
    key: "coaching_strategy",
    label: "Coaching Strategy",
    step: "Step 2",
    focus:
      "Was the chosen approach fit-for-purpose — one playbook, sequenced combination, or deliberately no playbook yet? Reward methodology restraint, sequencing logic, and the smallest sufficient intervention. Penalize forced playbook application.",
  },
  {
    key: "stakeholder_navigation",
    label: "Stakeholder Navigation",
    step: "Step 3 (persistent)",
    focus:
      "How well did the coach use the persistent stakeholder workspace: surfacing resistance, negotiating scope, challenging success expectations, capturing concrete commitments, managing politics without over-pleasing or solution-jumping.",
  },
  {
    key: "working_session_facilitation",
    label: "Working Session Facilitation",
    step: "Step 4",
    focus:
      "Did the coach exercise fidelity judgment — going deep where it mattered, stopping early when the evidence wasn't there, avoiding over-canvasing? Reward incomplete artifacts when justified; penalize canvas-completion-as-goal.",
  },
  {
    key: "methodological_soundness",
    label: "Strategyzer Methodological Soundness",
    step: "Cross-cutting",
    focus:
      "Strategyzer rigor across every section: evidence over opinion, test before scale, customer-first sequencing (ecosystem → profile → value map), discovery vs delivery. Flag framework name-dropping without substance and skipped sequencing.",
  },
  {
    key: "intervention_discipline",
    label: "Intervention Discipline",
    step: "Step 5",
    focus:
      "Was the recommendation tight, scope-disciplined, sequenced, and aligned with stakeholder readiness and commitments from the workspace? Reward restraint and clarity; penalize over-prescription.",
  },
  {
    key: "engagement_pathway",
    label: "Engagement Pathway",
    step: "Step 6",
    focus:
      "How responsibly did the coach ORCHESTRATE Strategyzer methodology over time across the 5 pathway sections (Situation Summary, Immediate Intervention, Pathway, Risks, Success Criteria)? Reward sequencing coherence, methodology restraint, lightweight executable interventions, evidence progression, stakeholder readiness awareness, and reframing of unrealistic success criteria. Penalize framework stacking, bloated multi-week plans, sales/upsell framing, polished consulting language without operational detail, and assuming smooth progress. Multiple valid pathways exist — judge coherence, not a single 'correct' sequence.",
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
You assess coaching JUDGMENT under ambiguity, not framework memorization or canvas completion.

${STRATEGYZER_INTELLIGENCE}

PHILOSOPHY (apply consistently):
- Reward simplification, evidence rigor, sequencing quality, stakeholder alignment, methodology restraint, realistic facilitation.
- Penalize forced playbook application, over-engineering, canvas-as-goal thinking, sales/upsell framing, ignoring stakeholder readiness, framework dumping, consulting theater, vague customer language.
- A coach who deliberately did LESS but did it WELL — challenged the success definition, gathered evidence, ran a partial artifact with rationale — should be rated ABOVE a coach who applied every framework end-to-end without judgment.
- Incomplete artifacts with a clear "we stopped here because…" rationale are valid and often preferable.
- When scoring artifacts, actively look for AI-generated-sounding outputs, suspiciously confident specificity with no evidence trail, and mechanically filled canvases — flag these in 'gaps' and lower the score for that section.

For each section, return:
  • score 1-5 (1=absent/harmful, 2=weak, 3=competent, 4=strong, 5=exemplary)
  • 1-3 specific strengths in THAT section
  • 1-3 specific gaps in THAT section
  • evidence: cite observable moments, quoting candidate text where useful. Reference the facilitation signals above when relevant ("the prompt 'would customers want this' is a weak, hypothetical question").
  • verdict: one of "exemplary" | "strong" | "competent" | "developing" | "insufficient"

Then return a FINAL ASSESSMENT:
  • overall_summary: 3-5 sentences synthesizing the pattern. Name the dominant coaching mode (e.g. "evidence-disciplined facilitator", "framework-dumping consultant", "premature solutioner").
  • top_strengths / top_gaps: 2-4 cross-cutting items each
  • calibration_notes: what a human reviewer should sanity-check
  • recommendation: "certify" | "conditional" | "not_yet"
  • recommendation_rationale: 1-2 sentences tying the recommendation to evidence rigor, methodology restraint, and facilitation quality — not artifact completeness.

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

── NAVIGATION (Step 4) — stakeholder 1:1s ──
Commitments captured: ${s.dialogue_commitments || "(none captured)"}

Stakeholder transcript:
${transcriptText || "(no transcript)"}

── APPLICATION (Step 6) — Strategyzer playbook applied with the team ──
Playbook: Strong Value Propositions and Differentiation with Gen AI

Activity 1 — Customer Ecosystem Map
Expected: separate end users, beneficiaries, economic buyers, decision makers, channel partners, influencers, recommenders, saboteurs. Specific named people/roles, not generic.
Artifact:
${s.playbook_application?.ecosystem ? JSON.stringify(s.playbook_application.ecosystem, null, 2) : "(empty — activity not completed)"}

Activity 2 — Customer Profile (Jobs / Pains / Gains)
Expected: priority customer named specifically; Jobs as verbs spanning functional/social/emotional; Pains/Gains concrete and tied to that customer; assumptions flagged vs evidence.
Artifact:
${s.playbook_application?.customer_profile ? JSON.stringify(s.playbook_application.customer_profile, null, 2) : "(empty — activity not completed)"}

Additional canvas notes:
${s.application_canvas ? JSON.stringify(s.application_canvas, null, 2) : "(none)"}

── METHODOLOGICAL SOUNDNESS (cross-cutting) ──
Assess across ALL inputs above: framing, methodology rationale, navigation commitments, both activity artifacts, and intervention. Look for Strategyzer rigor (evidence-first, customer-first sequencing, discovery vs delivery) and flag drift.


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
