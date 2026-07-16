// Input-narrowing and quality-signal helpers for the per-section evaluator.
// Each section gets ONLY the inputs that should bias its score, so the model
// can't "leak" one transcript moment into seven section scores.

export type SessionForEval = {
  candidate_name: string;
  framing_notes: string | null;
  methodology_choice: string | null;
  methodology_rationale: string | null;
  dialogue_commitments: string | null;
  application_canvas: Record<string, unknown> | null;
  playbook_application: Record<string, string> | null;
  intervention_recommendation: string | null;
  decision: string | null;
  playbook_suggestions: any[] | null;
  scenarios: { title: string; summary: string; context?: string; ambiguity_factors?: string[] };
  // Post-Patch-1 intervention model. The evaluator MUST rely on these
  // fields (and the resolved intervention row) rather than the legacy
  // `methodology_choice` string when judging pathway-fit and execution.
  chosen_intervention_slug: string | null;
  intervention_rationale: string | null;
  intervention_committed_at: string | null;
  alignment_workspace: Record<string, any> | null;
  evidence_gathering_plan: Record<string, any> | null;
  pause_justification: Record<string, any> | null;
  playbook_facilitation_plan: Record<string, any> | null;
  playbook_activity_run: Record<string, any> | null;
  playbook_interpretation: Record<string, any> | null;
  resolved_intervention: {
    slug: string;
    label: string;
    pathway_type: string;   // pre_playbook | playbook | evidence_gathering | deliberate_pause
    is_deep_vertical: boolean;
  } | null;
  // Patch 3: hidden per-stakeholder state trajectory. Fed as CONTEXT to the
  // Stakeholder Navigation section prompt. Reviewer's judgment, not a formula.
  stakeholder_state_trajectory?: Array<{
    stakeholder_id: string;
    engagement: string;
    trust: string;
    guardedness: string;
    turn_index: number;
    reasoning: string;
  }>;
};



export type TranscriptTurn = {
  role: string;
  stakeholder_name: string | null;
  content: string;
  created_at: string;
};

export function readCanvasCells(raw: unknown): Array<{ key: string; value: string; confidence: string; unresolved: boolean }> {
  if (!raw || typeof raw !== "object") return [];
  const c = raw as Record<string, unknown>;
  if (c.cells && typeof c.cells === "object") {
    return Object.entries(c.cells as Record<string, any>).map(([k, v]) => ({
      key: k,
      value: typeof v?.value === "string" ? v.value : String(v?.value ?? ""),
      confidence: v?.confidence ?? "unset",
      unresolved: !!v?.ambiguity,
    }));
  }
  const out: Array<{ key: string; value: string; confidence: string; unresolved: boolean }> = [];
  for (const [k, v] of Object.entries(c)) {
    if (k.startsWith("__meta__")) continue;
    const metaRaw = c[`__meta__${k}`];
    let meta: any = {};
    if (typeof metaRaw === "string") { try { meta = JSON.parse(metaRaw); } catch { /* noop */ } }
    out.push({
      key: k,
      value: typeof v === "string" ? v : JSON.stringify(v),
      confidence: meta.confidence ?? "unset",
      unresolved: !!meta.ambiguity,
    });
  }
  return out;
}

export function renderCanvasForPrompt(raw: unknown): string {
  const cells = readCanvasCells(raw);
  if (cells.length === 0) return "  (no cells captured)";
  return cells
    .map((c) => `  • ${c.key} [evidence: ${c.confidence}, unresolved: ${c.unresolved ? "yes" : "no"}]\n    ${c.value.replace(/\n/g, "\n    ") || "(blank)"}`)
    .join("\n");
}

export function renderTranscript(turns: TranscriptTurn[] | null | undefined): string {
  if (!turns || turns.length === 0) return "(no transcript)";
  return turns
    .map((m) => `${m.role === "candidate" ? "COACH" : (m.stakeholder_name ?? "STAKEHOLDER").toUpperCase()}: ${m.content}`)
    .join("\n\n");
}

export function extractInputQualitySignals(s: SessionForEval, turns: TranscriptTurn[] | null | undefined) {
  const charCount = (x: string | null | undefined) => (x ?? "").trim().length;
  const pa = s.playbook_application ?? {};
  const cells = readCanvasCells(s.application_canvas);
  const cellsWithContent = cells.filter((c) => c.value.trim().length > 0).length;
  const cellsWithEvidenceFlag = cells.filter((c) => c.confidence && c.confidence !== "unset" && c.confidence !== "none").length;
  const coachTurns = (turns ?? []).filter((t) => t.role === "candidate");

  return {
    framing_chars: charCount(s.framing_notes),
    methodology_rationale_chars: charCount(s.methodology_rationale),
    intervention_chars: charCount(s.intervention_recommendation),
    dialogue_commitments_chars: charCount(s.dialogue_commitments),
    pathway_sections_filled: ["situation_summary", "immediate_intervention", "pathway", "risks", "success_criteria"].filter(
      (k) => charCount((pa as any)[k]) > 0
    ).length,
    pathway_total_chars: ["situation_summary", "immediate_intervention", "pathway", "risks", "success_criteria"].reduce(
      (sum, k) => sum + charCount((pa as any)[k]),
      0
    ),
    canvas_cells_total: cells.length,
    canvas_cells_with_content: cellsWithContent,
    canvas_cells_with_evidence_marker: cellsWithEvidenceFlag,
    coach_transcript_turns: coachTurns.length,
    coach_transcript_total_chars: coachTurns.reduce((sum, t) => sum + charCount(t.content), 0),
    ai_suggestions_consulted: Array.isArray(s.playbook_suggestions) ? s.playbook_suggestions.length : 0,
  };
}

export type SectionKey =
  | "situation_framing"
  | "coaching_strategy"
  | "stakeholder_navigation"
  | "working_session_facilitation"
  | "methodological_soundness"
  | "intervention_discipline"
  | "engagement_pathway"
  | "intervention_fit"
  | "intervention_execution";


function renderAssistanceLog(log: any[] | null | undefined): string {
  if (!log || log.length === 0) {
    return "Candidate did NOT consult AI suggestions before committing. Methodology choice reflects independent reasoning.";
  }
  const lines: string[] = [`Candidate consulted AI ${log.length} time(s).`];
  log.forEach((entry: any, i: number) => {
    const sug = entry?.suggestion ?? {};
    const state = entry?.candidate_state_at_request ?? {};
    lines.push(`Request ${i + 1} (mode: ${entry?.requested_mode ?? "?"}): candidate had draft choice: ${state.had_draft_choice ? "yes" : "no"}; rationale at request: ${state.draft_rationale_chars ?? 0} chars. AI proposed ${sug.playbookId ?? "(no playbook)"}, confidence ${sug.confidence ?? "?"}. AI rationale: ${sug.rationale ?? "(none)"}`);
  });
  return lines.join("\n");
}

export function buildSectionInput(
  key: SectionKey,
  s: SessionForEval,
  turns: TranscriptTurn[] | null | undefined
): string {
  const scenario = s.scenarios;
  const header = `SCENARIO: ${scenario.title}\n${scenario.summary}\n\nCANDIDATE: ${s.candidate_name}\n\n`;
  const canvas = renderCanvasForPrompt(s.application_canvas);
  const transcript = renderTranscript(turns);

  switch (key) {
    case "situation_framing":
      return `${header}── SCENARIO AMBIGUITY (what the coach had to navigate) ──
${(scenario.ambiguity_factors ?? []).map((a) => `• ${a}`).join("\n") || "(none specified)"}

── CANDIDATE'S FRAMING NOTES (Step 1) ──
${s.framing_notes || "(no framing provided)"}

Score ONLY on framing quality: did the coach surface real ambiguity, separate evidence from opinion, name unknowns, and challenge or reframe unrealistic success expectations? Ignore later steps.`;

    case "coaching_strategy":
      return `${header}── FRAMING CONTEXT (Step 1) ──
${s.framing_notes || "(no framing provided)"}

── CANDIDATE'S COACHING APPROACH (Step 2) ──
Choice: ${s.methodology_choice || "(none)"}
Rationale: ${s.methodology_rationale || "(none)"}

── AI ASSISTANCE LOG (Coaching Approach step) ──
${renderAssistanceLog(s.playbook_suggestions)}

Score ONLY on coaching approach: methodology fit-for-purpose, restraint, sequencing logic, smallest-sufficient-intervention. Apply the AI-assistance penalty rule: a candidate who consulted AI BEFORE drafting their own rationale and then mirrored the AI's framing should NOT score above 'competent'. A candidate who drafted first and then diverged from or scoped the AI's suggestion can score 'strong' or 'exemplary'.`;

    case "stakeholder_navigation": {
      const traj = s.stakeholder_state_trajectory ?? [];
      const byStakeholder: Record<string, typeof traj> = {};
      for (const row of traj) {
        (byStakeholder[row.stakeholder_id] ??= []).push(row);
      }
      const trajectoryText = Object.keys(byStakeholder).length === 0
        ? "(no state trajectory recorded)"
        : Object.entries(byStakeholder).map(([id, rows]) => {
            const line = rows
              .map((r) => `    turn ${r.turn_index}: engagement=${r.engagement}, trust=${r.trust}, guardedness=${r.guardedness} — ${r.reasoning}`)
              .join("\n");
            return `  ${id}:\n${line}`;
          }).join("\n");

      return `${header}── STAKEHOLDER TRANSCRIPT (Step 3) ──
${transcript}

── COMMITMENTS & DECISIONS CAPTURED ──
${s.dialogue_commitments || "(none captured)"}

── HIDDEN STAKEHOLDER STATE TRAJECTORY (context, not a formula) ──
This is the hidden per-turn state assessor's read on each stakeholder's engagement / trust / guardedness after each coach turn. The trajectory below is CONTEXT for your reasoning about how the coach navigated stakeholders. Do NOT compute the score directly from the state values — a coach who ended with a cold Marcus might have made the right calls if Marcus was resistant for good reasons. Judge the coach's behavior in relation to the trajectory, not the trajectory alone.

${trajectoryText}

Score ONLY on stakeholder navigation: surfacing resistance, negotiating scope, challenging success expectations, capturing concrete commitments, managing politics without over-pleasing or solution-jumping. Watch specifically for: shuttle diplomacy (relaying messages instead of facilitating joint conversation), missing emotional beats, confrontational language ("cut through the bullshit"-style), failure to capture commitments. Do not score canvas work or pathway artifact here — those are separate sections.`;
    }


    case "working_session_facilitation":
      return `${header}── CANDIDATE'S COACHING APPROACH (for context only) ──
${s.methodology_choice || "(none)"}

── FACILITATED WORKING SESSION — canvas the coach ran with the team (Step 4) ──
Each cell may contain: what the coach captured, the evidence-confidence the coach assigned
(none / weak / moderate / strong), and whether the coach explicitly flagged the cell as
unresolved ambiguity. A coach who flagged "no evidence" honestly is doing the right thing —
do NOT penalize blanks that come with an explicit ambiguity flag.

${canvas}

Score ONLY on facilitation quality at the canvas: open-ended probing, evidence rigor, specificity, ownership transfer, ambiguity navigation, restraint. Penalize: leading questions, answering for the team, framework jargon, polished consulting narration, mechanically completed cells with no evidence trail. Do not score stakeholder dialogue or the engagement pathway here.`;

    case "intervention_discipline":
      return `${header}── COACHING APPROACH (for consistency context) ──
${s.methodology_choice || "(none)"}
Rationale: ${s.methodology_rationale || "(none)"}

── INTERVENTION RECOMMENDATION (Step 5) ──
${s.intervention_recommendation || "(none)"}

── FINAL DECISION ──
${s.decision || "(none)"}

Score ONLY on intervention discipline: tight scope, sequenced, aligned with stakeholder readiness. Reward restraint and clarity; penalize over-prescription and inconsistency with the chosen coaching approach.`;

    case "engagement_pathway":
      return `${header}── ENGAGEMENT PATHWAY ARTIFACT (Step 6) — the orchestration deliverable ──
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

Score ONLY on the pathway artifact: sequencing coherence, methodology restraint, lightweight executable interventions, evidence progression, stakeholder-readiness awareness, reframing of unrealistic success criteria. Penalize: framework stacking, bloated multi-week plans, sales/upsell framing, polished consulting language without operational detail, blank sections, generic recommendations. Multiple valid pathways exist — judge coherence, not a single "correct" sequence.`;

    case "methodological_soundness":
      return `${header}── FRAMING ──
${s.framing_notes || "(none)"}

── METHODOLOGY CHOICE & RATIONALE ──
${s.methodology_choice || "(none)"}
${s.methodology_rationale || "(none)"}

── COMMITMENTS ──
${s.dialogue_commitments || "(none)"}

── CANVAS WORK ──
${canvas}

── ENGAGEMENT PATHWAY ──
${s.playbook_application?.situation_summary || "(empty situation summary)"}
${s.playbook_application?.immediate_intervention || "(empty intervention)"}
${s.playbook_application?.pathway || "(empty pathway)"}
${s.playbook_application?.risks || "(empty risks)"}
${s.playbook_application?.success_criteria || "(empty success criteria)"}

── INTERVENTION ──
${s.intervention_recommendation || "(none)"}

Score on Strategyzer methodological rigor: evidence over opinion, test before scale, customer-first sequencing (ecosystem → profile → value map), discovery vs delivery, jobs/pains/gains being customer-not-team-centric, VPC/BMC understanding. Flag framework name-dropping without substance, skipped sequencing, and the VPC-misapplied-to-internal-team-issues failure pattern.`;

    case "intervention_fit": {
      // Post-Patch-1: pathway_type on the resolved intervention row is the
      // authoritative signal for what the coach committed to running.
      // `methodology_choice: "none"` is NO LONGER a reliable indicator of
      // "no playbook" — coaches can pick evidence_gathering, deliberate_pause,
      // pre_playbook (alignment), or a specific playbook via the intervention
      // picker. Do not infer pathway from methodology_choice alone.
      const iv = s.resolved_intervention;
      return `${header}── SCENARIO AMBIGUITY ──
${(scenario.ambiguity_factors ?? []).map((a) => `• ${a}`).join("\n") || "(none specified)"}

── FRAMING (Step 1) ──
${s.framing_notes || "(none)"}

── STAKEHOLDER COMMITMENTS CAPTURED (Step 3) ──
${s.dialogue_commitments || "(none captured)"}

── COMMITTED INTERVENTION (authoritative — from the intervention picker) ──
Chosen slug: ${s.chosen_intervention_slug || "(none committed)"}
Resolved intervention: ${iv ? `${iv.label} (pathway_type=${iv.pathway_type}${iv.is_deep_vertical ? ", deep_vertical" : ""})` : "(no resolved intervention row)"}
Committed at: ${s.intervention_committed_at || "(not committed)"}
Rationale: ${s.intervention_rationale || "(none)"}

── LEGACY methodology_choice (kept for backwards compat only — do NOT use as primary pathway signal) ──
${s.methodology_choice || "(none)"} — ${s.methodology_rationale || "(no rationale)"}

Score ONLY on INTERVENTION FIT: given what Chapter 1 surfaced (ambiguity, framing, stakeholder state, evidence quality), was the committed pathway_type the right choice? Reward:
• pre_playbook (alignment) when the team is misaligned or the sponsor question is unclear
• evidence_gathering when the team lacks the customer/market evidence a Playbook would need to land
• deliberate_pause when neither is ready and restraint serves the client better than activity
• a specific playbook only when framing + stakeholder readiness genuinely support it
Penalize: jumping to a playbook on top of unresolved alignment, evidence, or sponsor questions; picking evidence_gathering / pause as avoidance rather than judgment; a rationale that doesn't reference what Chapter 1 actually surfaced. Ignore HOW the intervention was executed — that is the intervention_execution section.`;
    }

    case "intervention_execution": {
      // Different pathway_types have different execution artifacts. Route
      // the prompt to whichever workspace is populated for this pathway.
      const iv = s.resolved_intervention;
      const pt = iv?.pathway_type ?? "(unknown — no intervention committed)";
      const alignment = s.alignment_workspace ?? {};
      const evidence = s.evidence_gathering_plan ?? {};
      const pause = s.pause_justification ?? {};
      const pbPlan = s.playbook_facilitation_plan ?? {};
      const pbRun = s.playbook_activity_run ?? {};
      const pbInterp = s.playbook_interpretation ?? {};
      const dump = (o: Record<string, any>) =>
        Object.keys(o).length === 0
          ? "  (empty)"
          : Object.entries(o)
              .map(([k, v]) => `  • ${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
              .join("\n");

      return `${header}── COMMITTED INTERVENTION ──
${iv ? `${iv.label} — pathway_type=${pt}${iv.is_deep_vertical ? " (deep vertical)" : ""}` : "(no intervention committed)"}

── PRE_PLAYBOOK / ALIGNMENT WORKSPACE ──
setup:
${dump((alignment as any).setup ?? {})}
facilitation:
${dump((alignment as any).facilitation ?? {})}
interpretation:
${dump((alignment as any).interpretation ?? {})}

── EVIDENCE_GATHERING PLAN ──
${dump(evidence)}

── DELIBERATE_PAUSE JUSTIFICATION ──
${dump(pause)}

── PLAYBOOK FACILITATION PLAN (deep vertical) ──
${dump(pbPlan)}

── PLAYBOOK ACTIVITY RUN (deep vertical) ──
${dump(pbRun)}

── PLAYBOOK INTERPRETATION (deep vertical) ──
${dump(pbInterp)}

── STAKEHOLDER TRANSCRIPT (for facilitation quality context) ──
${transcript}

Score ONLY on INTERVENTION EXECUTION for the pathway_type above — judge the workspace(s) that match this pathway and IGNORE the others:
• pre_playbook: quality of setup framing, alignment gaps named, aligned-enough definition, misalignment surfaced during facilitation, honest interpretation of where the team landed
• evidence_gathering: sharp evidence goals, realistic moves, named owners, bounded cadence, observable readiness signal, credible return trigger
• deliberate_pause: rationale grounded in observed Chapter 1 signals, concrete re-engage preconditions, signals watched, client-facing communication that frames restraint as service, real revisit checkpoint
• playbook: facilitation-plan coherence, activity-run quality (specificity, evidence flags, ambiguity honesty), interpretation that connects what emerged to a next move
Reward: fit-for-pathway execution, restraint, evidence rigor, honesty about what didn't land. Penalize: empty workspaces on the committed pathway, consulting-theater language, forcing a playbook when the workspace shows the team wasn't ready, treating the workspace as a form to fill.`;
    }
  }
}

