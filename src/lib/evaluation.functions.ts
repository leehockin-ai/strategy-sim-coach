import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { STRATEGYZER_INTELLIGENCE } from "@/lib/strategyzer-methodology";
import {
  buildSectionInput,
  extractInputQualitySignals,
  renderCanvasForPrompt,
  renderTranscript,
  type SectionKey,
  type SessionForEval,
  type TranscriptTurn,
} from "@/lib/evaluation.io";

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
- When an AI assistance log is present in the inputs, treat AI-shaped reasoning as a Coaching Strategy concern unless the candidate's rationale shows clear independent thinking (divergence from AI suggestion, additional scoping, original framing, or evidence the rationale predated the AI consultation).

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

── AI ASSISTANCE LOG (Coaching Approach step) ──
${(() => {
  const log = Array.isArray(s.playbook_suggestions) ? s.playbook_suggestions : [];
  if (log.length === 0) {
    return "Candidate did NOT consult AI suggestions before committing to a coaching approach. Their methodology choice and rationale below reflect independent reasoning.";
  }
  const lines: string[] = [
    `Candidate consulted AI suggestions ${log.length} time(s) during Coaching Approach.`,
    `For each, judge whether the candidate's final choice and rationale below reflect INDEPENDENT REASONING that may have been validated by the AI, or whether they appear to mirror the AI's framing without their own thinking.`,
    ``,
  ];
  log.forEach((entry: any, i: number) => {
    const sug = entry?.suggestion ?? {};
    const state = entry?.candidate_state_at_request ?? {};
    lines.push(`Suggestion ${i + 1} (requested mode: ${entry?.requested_mode ?? "?"}):`);
    lines.push(`  At time of request — candidate had drafted choice: ${state.had_draft_choice ? "yes" : "no"}; rationale length: ${state.draft_rationale_chars ?? 0} chars.`);
    lines.push(`  AI proposed: ${sug.playbookId ?? "(no playbook)"} · confidence ${sug.confidence ?? "?"}`);
    if (sug.rationale) lines.push(`  AI rationale: ${sug.rationale}`);
    if (Array.isArray(sug.pre_work) && sug.pre_work.length) lines.push(`  AI pre_work: ${sug.pre_work.join("; ")}`);
    lines.push(``);
  });
  lines.push(`When scoring 'coaching_strategy', factor in: a candidate who consulted AI BEFORE drafting their own rationale (had_draft_choice=no, draft_rationale_chars<40) and then submitted a rationale closely mirroring the AI's framing should NOT score above 'competent'. A candidate who drafted their own thinking first and used AI to pressure-test it — and whose final rationale shows independent reasoning, divergence, or specific scoping of the AI's suggestion — can score 'strong' or 'exemplary' on this dimension.`);
  return lines.join("\n");
})()}

── METHODOLOGY (Step 3) ──
Choice: ${s.methodology_choice || "(none)"}
Rationale: ${s.methodology_rationale || "(none)"}

── NAVIGATION (Step 4) — stakeholder 1:1s ──
Commitments captured: ${s.dialogue_commitments || "(none captured)"}

Stakeholder transcript:
${transcriptText || "(no transcript)"}

── FACILITATED WORKING SESSION (Step 4) — live Strategyzer playbook facilitation ──
Methodology: ${s.methodology_choice || "(none)"}
This is where the coach facilitated live with the (simulated) team, cell by cell. Each cell may
contain: what the coach captured, the evidence-confidence the coach assigned (none/weak/moderate/strong),
and whether the coach explicitly flagged the cell as unresolved ambiguity. Reward open-ended probing,
specificity, evidence rigor, ownership transfer, ambiguity navigation, and facilitation restraint.
Penalize leading questions, answering for the team, framework jargon, polished consulting narration,
and mechanically completed cells with no evidence trail.
${(() => {
  const c = (s.application_canvas ?? {}) as Record<string, unknown>;
  const cells: string[] = [];
  for (const [k, v] of Object.entries(c)) {
    if (k.startsWith("__meta__")) continue;
    const metaRaw = c[`__meta__${k}`];
    let meta: any = {};
    if (typeof metaRaw === "string") { try { meta = JSON.parse(metaRaw); } catch {} }
    const confidence = meta.confidence ?? "unset";
    const unresolved = meta.ambiguity ? "yes" : "no";
    cells.push(`  • ${k} [evidence: ${confidence}, unresolved: ${unresolved}]\n    ${typeof v === "string" ? v.replace(/\n/g, "\n    ") || "(blank)" : JSON.stringify(v)}`);
  }
  return cells.length ? cells.join("\n") : "  (no cells captured)";
})()}


── ENGAGEMENT PATHWAY (Step 6) — the coach's orchestration artifact ──
The coach must produce a 5-section pathway. Evaluate each section against the engagement-pathway
intelligence: reward restraint, sequencing coherence, evidence progression, readiness awareness,
operational/facilitation realism. Penalize framework stacking, bloated plans, sales framing,
and polished consulting language without operational detail.

01 — Current Situation Summary:
${s.playbook_application?.situation_summary || "(empty)"}

02 — Recommended Immediate Intervention:
${s.playbook_application?.immediate_intervention || "(empty)"}

03 — Recommended Engagement Pathway (sequenced interventions over time):
${s.playbook_application?.pathway || "(empty)"}

04 — Risk Factors:
${s.playbook_application?.risks || "(empty)"}

05 — Success Criteria (realistic, evidence-anchored):
${s.playbook_application?.success_criteria || "(empty)"}

── METHODOLOGICAL SOUNDNESS (cross-cutting) ──
Assess across ALL inputs above: framing, methodology rationale, navigation commitments, the
engagement pathway artifact, and intervention. Look for Strategyzer rigor (evidence-first,
customer-first sequencing, discovery vs delivery) and flag drift.


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
        confidence: { type: "string", enum: ["low", "medium", "high"] },
        reviewer_flag: { type: "boolean", description: "True if a human reviewer should pay extra attention to this section." },
        evidence: { type: "string", description: "Cite specific observable behavior or quote artifact text." },
        strengths: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 },
        gaps: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 },
      },
      required: ["score", "verdict", "confidence", "reviewer_flag", "evidence", "strengths", "gaps"],
      additionalProperties: false,
    };

    const skillItemSchema = {
      type: "object",
      properties: {
        key: { type: "string" },
        label: { type: "string" },
        rating: { type: "string", enum: ["strength", "mixed", "concern"] },
        explanation: { type: "string" },
        evidence: { type: "string", description: "Quote or paraphrase a specific moment from transcript or artifact." },
      },
      required: ["key", "label", "rating", "explanation", "evidence"],
      additionalProperties: false,
    };

    const tool = {
      type: "function",
      function: {
        name: "submit_evaluation",
        description: "Return per-section rubric, soft skills, methodology skills, and a final assessment.",
        parameters: {
          type: "object",
          properties: {
            sections: {
              type: "object",
              properties: Object.fromEntries(SECTION_RUBRIC.map((sec) => [sec.key, sectionSchema])),
              required: SECTION_RUBRIC.map((sec) => sec.key),
              additionalProperties: false,
            },
            soft_skills: {
              type: "array",
              minItems: 6,
              maxItems: 8,
              description: "Cover: active_listening, open_questioning, psychological_safety, stakeholder_empathy, neutrality, handling_resistance, avoiding_dominating, redirecting_ownership. Flag concerns like overly directive tone, missed emotional cues, ignored resistance, excessive explaining, premature advice-giving.",
              items: skillItemSchema,
            },
            methodology_skills: {
              type: "array",
              minItems: 6,
              maxItems: 9,
              description: "Cover: strategyzer_fluency, playbook_selection, playbook_sequencing, vpc_bmc_understanding, jobs_pains_gains_quality, evidence_rigor, assumption_identification, tool_facilitation, restraint_when_not_to_playbook. Flag concerns like weak customer specificity, confusing jobs with solutions, vague pains/gains, treating assumptions as evidence, forcing a playbook prematurely, over-completing artifacts, generic consulting recommendations.",
              items: skillItemSchema,
            },
            overall_summary: { type: "string" },
            top_strengths: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4 },
            top_gaps: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4 },
            calibration_notes: { type: "string", description: "What a human reviewer should double-check." },
            reviewer_focus: { type: "string", description: "1-2 sentences guiding the human reviewer where to spend attention." },
            confidence: { type: "string", enum: ["low", "medium", "high"] },
            recommendation: { type: "string", enum: ["pass", "conditional_pass", "human_review_required", "retry_recommended", "not_yet_certified"] },
            recommendation_rationale: { type: "string" },
            coach_feedback_draft: {
              type: "string",
              description: "Constructive, developmental coach-facing feedback. Use headings: What you did well / Where to improve / Methodology guidance / Facilitation guidance / Recommended next step. Specific, grounded in observable behavior, not harsh.",
            },
          },
          required: [
            "sections",
            "soft_skills",
            "methodology_skills",
            "overall_summary",
            "top_strengths",
            "top_gaps",
            "calibration_notes",
            "reviewer_focus",
            "confidence",
            "recommendation",
            "recommendation_rationale",
            "coach_feedback_draft",
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
          soft_skills: parsed.soft_skills,
          methodology_skills: parsed.methodology_skills,
          coach_feedback: parsed.coach_feedback_draft,
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
  .inputValidator((d: {
    sessionId: string;
    reviewerName?: string;
    reviewerNotes?: string;
    internalNotes?: string;
    coachFeedback?: string;
    reviewerDecision: string;
  }) =>
    z.object({
      sessionId: z.string().uuid(),
      reviewerName: z.string().max(200).optional(),
      reviewerNotes: z.string().max(8000).optional(),
      internalNotes: z.string().max(8000).optional(),
      coachFeedback: z.string().max(16000).optional(),
      reviewerDecision: z.enum([
        "approved",
        "conditional_approval",
        "retry_required",
        "not_approved",
        "escalate",
      ]),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const { data: evaluation, error } = await supabaseAdmin
      .from("evaluations")
      .update({
        reviewer_name: data.reviewerName ?? null,
        reviewer_notes: data.reviewerNotes ?? null,
        internal_notes: data.internalNotes ?? null,
        coach_feedback: data.coachFeedback ?? null,
        reviewer_decision: data.reviewerDecision,
        reviewed_at: new Date().toISOString(),
      })
      .eq("session_id", data.sessionId)
      .select()
      .single();
    if (error) throw new Error(error.message);

    const sessionStatus =
      data.reviewerDecision === "approved" ? "approved"
      : data.reviewerDecision === "conditional_approval" ? "conditional"
      : data.reviewerDecision === "retry_required" ? "retry"
      : data.reviewerDecision === "escalate" ? "escalated"
      : "not_approved";
    await supabaseAdmin.from("sessions").update({ status: sessionStatus }).eq("id", data.sessionId);

    return { evaluation };
  });

export const listReviewSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("sessions")
      .select(
        "id, candidate_name, candidate_email, status, created_at, completed_at, scenarios(title, slug, difficulty, industry), evaluations(recommendation, reviewer_decision, reviewer_name, reviewed_at)"
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { sessions: data ?? [] };
  });
