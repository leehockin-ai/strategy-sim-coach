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
  {
    key: "intervention_fit",
    label: "Intervention Fit",
    step: "Chapter 1 → 2 handoff",
    focus:
      "Was the committed intervention's pathway_type (pre_playbook / evidence_gathering / deliberate_pause / playbook) the right choice given what Chapter 1 surfaced? Judge FIT of the pathway to the situation — not how it was later executed. Use chosen_intervention_slug and the resolved intervention row (pathway_type) as the authoritative signal; methodology_choice is legacy context only.",
  },
  {
    key: "intervention_execution",
    label: "Intervention Execution",
    step: "Chapter 2 workspace",
    focus:
      "How well did the coach EXECUTE the committed pathway in its Chapter 2 workspace? Score only the workspace(s) that match pathway_type (alignment, evidence-gathering plan, pause justification, or Playbook facilitation/run/interpretation). Reward fit-for-pathway execution, restraint, evidence rigor, honesty about what didn't land. Penalize empty workspaces on the committed pathway, consulting theater, and workspace-as-form-to-fill.",
  },
] as const;

// Legacy export so the report page still imports cleanly.
export const RUBRIC_DIMENSIONS = SECTION_RUBRIC.map((s) => ({ key: s.key, label: s.label }));

// ────────────────────────────────────────────────────────────────────
// Per-section scoring (Stage A of the fan-out)
// ────────────────────────────────────────────────────────────────────
type SectionVerdict = {
  score: number;
  verdict: "exemplary" | "strong" | "competent" | "developing" | "insufficient";
  confidence: "low" | "medium" | "high";
  reviewer_flag: boolean;
  evidence: string;
  strengths: string[];
  gaps: string[];
};

const SECTION_SCORING_SYSTEM = `You are an expert Strategyzer certification reviewer scoring ONE rubric section.

${STRATEGYZER_INTELLIGENCE}

CRITICAL: You are evaluating ONLY the section you are asked about. Do NOT speculate about other sections you cannot see. Do NOT let the perceived overall quality of the candidate bias this single-section score — you have not seen the other sections.

PHILOSOPHY:
- Reward simplification, evidence rigor, sequencing quality, methodology restraint, realistic facilitation.
- Penalize forced framework application, over-engineering, canvas-as-goal thinking, framework dumping, consulting theater, vague customer language.
- A deliberately partial artifact with a clear "we stopped here because…" rationale is valid and can score well.
- Actively flag AI-generated-sounding outputs, suspiciously confident specificity with no evidence trail, and mechanically filled sections.

For this section, return strict JSON:
{
  "score": <1-5: 1=absent/harmful, 2=weak, 3=competent, 4=strong, 5=exemplary>,
  "verdict": "exemplary" | "strong" | "competent" | "developing" | "insufficient",
  "confidence": "low" | "medium" | "high",
  "reviewer_flag": <true if a human reviewer should double-check>,
  "evidence": "<cite specific observable behavior or quote artifact text — what made you assign this score>",
  "strengths": ["1-3 specific strengths in THIS section, or empty if none"],
  "gaps": ["1-3 specific gaps in THIS section"]
}

Be specific. Generic praise is not acceptable — cite the moment.`;

function clamp(n: any, min: number, max: number): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, Math.round(v)));
}

async function scoreSection(
  apiKey: string,
  sec: (typeof SECTION_RUBRIC)[number],
  userPrompt: string
): Promise<SectionVerdict> {
  const sectionFocus = `SECTION: ${sec.label} (${sec.step})\nWHAT THIS SECTION ASSESSES: ${sec.focus}\n\n${userPrompt}`;
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SECTION_SCORING_SYSTEM },
        { role: "user", content: sectionFocus },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    if (res.status === 429) throw new Error("Rate limit — retry shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted.");
    throw new Error(`Section scoring failed (${sec.key}): ${res.status}`);
  }
  const json = await res.json();
  const content = json.choices?.[0]?.message?.content ?? "{}";
  let parsed: any = {};
  try { parsed = JSON.parse(content); } catch {
    throw new Error(`Section ${sec.key} returned non-JSON`);
  }
  return {
    score: clamp(parsed.score, 1, 5),
    verdict: parsed.verdict ?? "developing",
    confidence: parsed.confidence ?? "medium",
    reviewer_flag: !!parsed.reviewer_flag,
    evidence: typeof parsed.evidence === "string" ? parsed.evidence : "(no evidence cited)",
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 3) : [],
    gaps: Array.isArray(parsed.gaps) ? parsed.gaps.slice(0, 3) : [],
  };
}

// ────────────────────────────────────────────────────────────────────
// Skills scoring (Stage B)
// ────────────────────────────────────────────────────────────────────
type SkillItem = { key: string; label: string; rating: "strength" | "mixed" | "concern"; explanation: string; evidence: string };

const SOFT_SKILLS_PROMPT = `Assess SOFT facilitation skills only, observed across the stakeholder transcript and canvas work.
Cover: active_listening, open_questioning, psychological_safety, stakeholder_empathy, neutrality, handling_resistance, avoiding_dominating, redirecting_ownership.
Flag concerns like overly directive tone, missed emotional cues, ignored resistance, excessive explaining, premature advice-giving, confrontational language, shuttle-diplomacy as a substitute for facilitation.
Return JSON: { "skills": [ { "key", "label", "rating": "strength"|"mixed"|"concern", "explanation", "evidence" } ] } — 6 to 8 items.`;

const METHODOLOGY_SKILLS_PROMPT = `Assess STRATEGYZER METHODOLOGY skills only.
Cover: strategyzer_fluency, playbook_selection, playbook_sequencing, vpc_bmc_understanding, jobs_pains_gains_quality, evidence_rigor, assumption_identification, tool_facilitation, restraint_when_not_to_playbook.
Flag concerns like weak customer specificity, confusing jobs with solutions, vague pains/gains, treating assumptions as evidence, forcing a playbook prematurely, over-completing artifacts, generic consulting recommendations, VPC misapplied to internal-team issues.
Return JSON: { "skills": [ { "key", "label", "rating": "strength"|"mixed"|"concern", "explanation", "evidence" } ] } — 6 to 9 items.`;

async function scoreSkills(
  apiKey: string,
  kind: "soft" | "methodology",
  s: SessionForEval,
  transcriptText: string,
  canvasText: string
): Promise<SkillItem[]> {
  const prompt = kind === "soft" ? SOFT_SKILLS_PROMPT : METHODOLOGY_SKILLS_PROMPT;
  const userPrompt = `SCENARIO: ${s.scenarios.title}\n${s.scenarios.summary}

── STAKEHOLDER TRANSCRIPT ──
${transcriptText}

── CANVAS WORK ──
${canvasText}

── FRAMING NOTES ──
${s.framing_notes ?? "(none)"}

── METHODOLOGY CHOICE ──
${s.methodology_choice ?? "(none)"} — ${s.methodology_rationale ?? "(no rationale)"}

── ENGAGEMENT PATHWAY ARTIFACT ──
${["situation_summary", "immediate_intervention", "pathway", "risks", "success_criteria"]
  .map((k) => `${k}: ${s.playbook_application?.[k] ?? "(empty)"}`)
  .join("\n")}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: `You are a Strategyzer certification reviewer.\n\n${STRATEGYZER_INTELLIGENCE}\n\n${prompt}` },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`Skills scoring failed (${kind}): ${res.status}`);
  const json = await res.json();
  const content = json.choices?.[0]?.message?.content ?? "{}";
  let parsed: any = {};
  try { parsed = JSON.parse(content); } catch { parsed = { skills: [] }; }
  const arr = Array.isArray(parsed.skills) ? parsed.skills : [];
  return arr.map((x: any) => ({
    key: String(x.key ?? "unknown"),
    label: String(x.label ?? x.key ?? "Unknown"),
    rating: ["strength", "mixed", "concern"].includes(x.rating) ? x.rating : "mixed",
    explanation: String(x.explanation ?? ""),
    evidence: String(x.evidence ?? ""),
  }));
}

// ────────────────────────────────────────────────────────────────────
// Synthesis (Stage C) — sees verdicts, NOT raw transcript or artifacts.
// ────────────────────────────────────────────────────────────────────
type SynthesisOut = {
  overall_summary: string;
  top_strengths: string[];
  top_gaps: string[];
  calibration_notes: string;
  reviewer_focus: string;
  confidence: "low" | "medium" | "high";
  recommendation: "pass" | "conditional_pass" | "human_review_required" | "retry_recommended" | "not_yet_certified";
  recommendation_rationale: string;
  coach_feedback_draft: string;
};

async function synthesizeFinal(
  apiKey: string,
  input: {
    candidateName: string;
    scenarioTitle: string;
    sections: Record<string, SectionVerdict>;
    softSkills: SkillItem[];
    methodologySkills: SkillItem[];
    inputQualitySignals: ReturnType<typeof extractInputQualitySignals>;
    aiAssistanceCount: number;
  }
): Promise<SynthesisOut> {
  const sectionDigest = SECTION_RUBRIC.map((sec) => {
    const v = input.sections[sec.key];
    if (!v) return `${sec.label}: (no verdict)`;
    return `${sec.label} (${sec.step}): score ${v.score}/5, verdict ${v.verdict}, confidence ${v.confidence}${v.reviewer_flag ? " ⚑ flagged" : ""}
  evidence: ${v.evidence}
  strengths: ${v.strengths.join(" | ") || "(none)"}
  gaps: ${v.gaps.join(" | ") || "(none)"}`;
  }).join("\n\n");

  const softSkillsDigest = input.softSkills.map((sk) => `  ${sk.rating === "concern" ? "⚠" : sk.rating === "strength" ? "✓" : "·"} ${sk.label}: ${sk.explanation}`).join("\n");
  const methSkillsDigest = input.methodologySkills.map((sk) => `  ${sk.rating === "concern" ? "⚠" : sk.rating === "strength" ? "✓" : "·"} ${sk.label}: ${sk.explanation}`).join("\n");

  const q = input.inputQualitySignals;
  const qualityDigest = `framing: ${q.framing_chars} chars · methodology rationale: ${q.methodology_rationale_chars} chars · intervention: ${q.intervention_chars} chars · commitments captured: ${q.dialogue_commitments_chars} chars · pathway sections filled: ${q.pathway_sections_filled}/5 (${q.pathway_total_chars} chars total) · canvas cells: ${q.canvas_cells_with_content}/${q.canvas_cells_total} with content, ${q.canvas_cells_with_evidence_marker} with evidence marker · coach transcript: ${q.coach_transcript_turns} turns, ${q.coach_transcript_total_chars} chars · AI suggestions consulted: ${q.ai_suggestions_consulted}`;

  const systemPrompt = `You are an expert Strategyzer certification reviewer producing a FINAL assessment.

You are working ONLY from per-section verdicts and skills assessments that other reviewers have already produced. You do NOT have access to the raw transcript or artifacts. Trust the per-section evidence. Do NOT invent specifics that don't appear in the verdicts.

Your job is to:
1. Synthesize the pattern across sections — name the dominant coaching mode honestly.
2. Identify cross-cutting strengths and gaps that appear in multiple sections.
3. Make a recommendation grounded in the section scores, NOT in a holistic re-judgment.
4. Write developmental coach feedback that quotes from the section evidence.

Apply input-quality signals when relevant: a candidate who submitted blank or 3-word answers on critical sections cannot be certified regardless of other section quality. A candidate with low character counts AND low scores has demonstrated minimum-viable engagement, not certification-level work.

Recommendation thresholds (apply consistently):
- "pass": no section scores below 3; methodological_soundness ≥ 4; majority of sections at 4+
- "conditional_pass": at most one section below 3; methodological_soundness ≥ 3; specific developmental gaps
- "human_review_required": mixed signals across sections, or any section flagged with reviewer_flag=true that affects the outcome
- "retry_recommended": multiple sections at 2 or below; methodological misunderstanding evident; recoverable with rework
- "not_yet_certified": methodological_soundness ≤ 2, OR multiple sections at 1, OR engagement_pathway insufficient, OR foundational misapplication (e.g. VPC on internal team)`;

  const userPrompt = `CANDIDATE: ${input.candidateName}
SCENARIO: ${input.scenarioTitle}

══════════════════════════════════════════
PER-SECTION VERDICTS (from independent scoring passes)
══════════════════════════════════════════
${sectionDigest}

══════════════════════════════════════════
SOFT SKILLS
══════════════════════════════════════════
${softSkillsDigest}

══════════════════════════════════════════
METHODOLOGY SKILLS
══════════════════════════════════════════
${methSkillsDigest}

══════════════════════════════════════════
INPUT-QUALITY SIGNALS
══════════════════════════════════════════
${qualityDigest}

AI assistance consultations during Coaching Approach: ${input.aiAssistanceCount}

Return strict JSON:
{
  "overall_summary": "<3-5 sentences synthesizing the pattern. Name the dominant coaching mode (e.g. 'evidence-disciplined facilitator', 'framework-dumping consultant', 'premature solutioner', 'shuttle diplomat'). Do NOT invent transcript specifics — work from the section evidence provided.>",
  "top_strengths": ["2-4 cross-cutting strengths"],
  "top_gaps": ["2-4 cross-cutting gaps"],
  "calibration_notes": "<what a human reviewer should sanity-check. Mention any section flagged with reviewer_flag.>",
  "reviewer_focus": "<1-2 sentences on where the reviewer should spend attention>",
  "confidence": "low" | "medium" | "high",
  "recommendation": "pass" | "conditional_pass" | "human_review_required" | "retry_recommended" | "not_yet_certified",
  "recommendation_rationale": "<1-2 sentences tying recommendation to the section scores you saw>",
  "coach_feedback_draft": "<Developmental coach-facing feedback in markdown. Use headings: ## What you did well / ## Where to improve / ## Methodology guidance / ## Facilitation guidance / ## Recommended next step. Quote section evidence; do not invent new specifics.>"
}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    if (res.status === 429) throw new Error("Rate limit on synthesis — retry shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted.");
    throw new Error(`Synthesis call failed: ${res.status}`);
  }
  const json = await res.json();
  const content = json.choices?.[0]?.message?.content ?? "{}";
  let parsed: any = {};
  try { parsed = JSON.parse(content); } catch {
    throw new Error("Synthesis returned non-JSON");
  }
  return {
    overall_summary: String(parsed.overall_summary ?? ""),
    top_strengths: Array.isArray(parsed.top_strengths) ? parsed.top_strengths.slice(0, 4) : [],
    top_gaps: Array.isArray(parsed.top_gaps) ? parsed.top_gaps.slice(0, 4) : [],
    calibration_notes: String(parsed.calibration_notes ?? ""),
    reviewer_focus: String(parsed.reviewer_focus ?? ""),
    confidence: ["low", "medium", "high"].includes(parsed.confidence) ? parsed.confidence : "medium",
    recommendation: ["pass", "conditional_pass", "human_review_required", "retry_recommended", "not_yet_certified"].includes(parsed.recommendation)
      ? parsed.recommendation
      : "human_review_required",
    recommendation_rationale: String(parsed.recommendation_rationale ?? ""),
    coach_feedback_draft: String(parsed.coach_feedback_draft ?? ""),
  };
}

// ────────────────────────────────────────────────────────────────────
// Orchestrator
// ────────────────────────────────────────────────────────────────────
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

    const { data: stakeholderStates } = await supabaseAdmin
      .from("stakeholder_states" as any)
      .select("stakeholder_id, engagement, trust, guardedness, turn_index, reasoning")
      .eq("session_id", data.sessionId)
      .order("stakeholder_id", { ascending: true })
      .order("turn_index", { ascending: true });

    const s = session as unknown as SessionForEval & { id: string };
    const turns = transcript as TranscriptTurn[] | null;
    s.stakeholder_state_trajectory = (stakeholderStates ?? []) as any;

    // Resolve the committed intervention row so the intervention_fit and
    // intervention_execution dimensions can read pathway_type directly
    // instead of inferring pathway from the legacy methodology_choice string.
    s.resolved_intervention = null;
    // Backward-compat: pre-Patch-1 sessions have methodology_choice but no
    // chosen_intervention_slug. Fall back to the legacy field so the
    // intervention_fit / intervention_execution dimensions can still resolve
    // a pathway_type for older sessions.
    const explicitSlug = (s as any).chosen_intervention_slug as string | null | undefined;
    const legacyChoice = ((s as any).methodology_choice as string | null | undefined) ?? "";
    const resolvedSlug =
      explicitSlug ||
      (legacyChoice && legacyChoice !== "none" ? legacyChoice : null);
    if (resolvedSlug) {
      const { data: ivRow } = await supabaseAdmin
        .from("interventions")
        .select("slug, label, pathway_type, is_deep_vertical")
        .eq("slug", resolvedSlug)
        .maybeSingle();
      if (ivRow) {
        s.resolved_intervention = {
          slug: ivRow.slug,
          label: ivRow.label,
          pathway_type: ivRow.pathway_type,
          is_deep_vertical: !!ivRow.is_deep_vertical,
        };
      }
    }

    const inputQualitySignals = extractInputQualitySignals(s, turns);

    // STAGE A: per-section fan-out (parallel, blind to each other).
    // Patch 3: use allSettled so a single failed sub-call doesn't kill the
    // whole evaluation — surface the failure as a placeholder verdict.
    const sectionSettled = await Promise.allSettled(
      SECTION_RUBRIC.map(async (sec) => {
        const userPrompt = buildSectionInput(sec.key as SectionKey, s, turns);
        const verdict = await scoreSection(apiKey, sec, userPrompt);
        return [sec.key, verdict] as const;
      })
    );
    const sections: Record<string, SectionVerdict> = {};
    sectionSettled.forEach((r, i) => {
      const sec = SECTION_RUBRIC[i];
      if (r.status === "fulfilled") {
        sections[r.value[0]] = r.value[1];
      } else {
        const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
        console.error(`[generateEvaluation] section ${sec.key} failed:`, msg);
        sections[sec.key] = {
          score: 0,
          verdict: "insufficient",
          confidence: "low",
          reviewer_flag: true,
          evidence: `Section scoring failed — rerun manually. Error: ${msg}`,
          strengths: [],
          gaps: [`Automated scoring for this section did not complete.`],
        };
      }
    });


    // STAGE B: skills (parallel with each other; uses transcript + canvas).
    // Same resilience treatment: don't let one skill call kill the evaluation.
    const transcriptText = renderTranscript(turns);
    const canvasText = renderCanvasForPrompt(s.application_canvas);
    const skillsSettled = await Promise.allSettled([
      scoreSkills(apiKey, "soft", s, transcriptText, canvasText),
      scoreSkills(apiKey, "methodology", s, transcriptText, canvasText),
    ]);
    const softSkills: SkillItem[] =
      skillsSettled[0].status === "fulfilled"
        ? skillsSettled[0].value
        : (console.error("[generateEvaluation] soft skills failed:", skillsSettled[0].reason), []);
    const methodologySkills: SkillItem[] =
      skillsSettled[1].status === "fulfilled"
        ? skillsSettled[1].value
        : (console.error("[generateEvaluation] methodology skills failed:", skillsSettled[1].reason), []);


    // STAGE C: synthesis from verdicts only (no raw transcript/artifacts)
    const synthesis = await synthesizeFinal(apiKey, {
      candidateName: s.candidate_name,
      scenarioTitle: s.scenarios.title,
      sections,
      softSkills,
      methodologySkills,
      inputQualitySignals,
      aiAssistanceCount: Array.isArray(s.playbook_suggestions) ? s.playbook_suggestions.length : 0,
    });

    const flatScores: Record<string, { score: number; evidence: string }> = {};
    const aiSectionVerdicts: Record<string, { score: number; verdict: string; confidence: string }> = {};
    for (const sec of SECTION_RUBRIC) {
      const sx = sections[sec.key];
      if (sx) {
        flatScores[sec.key] = { score: sx.score, evidence: sx.evidence };
        aiSectionVerdicts[sec.key] = { score: sx.score, verdict: sx.verdict, confidence: sx.confidence };
      }
    }

    const rawResponse = {
      sections,
      soft_skills: softSkills,
      methodology_skills: methodologySkills,
      ...synthesis,
      input_quality_signals: inputQualitySignals,
      architecture: "fanout_v1" as const,
    };

    const { data: evaluation, error: eErr } = await supabaseAdmin
      .from("evaluations")
      .upsert(
        {
          session_id: data.sessionId,
          scores: { ...flatScores, sections },
          strengths: synthesis.top_strengths,
          gaps: synthesis.top_gaps,
          recommendation: synthesis.recommendation,
          overall_summary: synthesis.overall_summary,
          soft_skills: softSkills,
          methodology_skills: methodologySkills,
          coach_feedback: synthesis.coach_feedback_draft,
          raw_response: rawResponse,
          ai_section_verdicts: aiSectionVerdicts,
          input_quality_signals: inputQualitySignals,
          evaluation_architecture: "fanout_v1",
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
        "id, candidate_name, candidate_email, status, created_at, completed_at, submission_requested_at, scenarios(title, slug, difficulty, industry), evaluations(recommendation, reviewer_decision, reviewer_name, reviewed_at)"
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { sessions: data ?? [] };
  });
