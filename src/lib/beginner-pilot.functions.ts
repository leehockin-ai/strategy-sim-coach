import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PILOT_ID, PILOT_CASE, PILOT_ASSESSMENT_RULES, type PilotState } from "./beginner-pilot";
import { readEngagementBrief } from "./scope-brief";
import {
  extractInputQualitySignals,
  type SessionForEval,
  type TranscriptTurn,
} from "./evaluation.io";
// The current adapter deliberately never imports an admin client or writes Cloud data.
// Local evidence is candidate-provided, not a trusted certification record.
function validateInput(d: {
  state: PilotState;
  kind: "turn" | "update" | "assessment";
  message?: string;
  step?: string;
}) {
  const envelope = z
    .object({
      state: z.custom<PilotState>(
        (s) => !!s && typeof s === "object" && (s as PilotState).version === PILOT_ID,
      ),
      kind: z.enum(["turn", "update", "assessment"]),
      message: z.string().max(4000).optional(),
      step: z.string().optional(),
    })
    .parse(d);
  if (JSON.stringify(envelope.state).length > 200000)
    throw new Error("Preview evidence exceeds the bounded input size.");
  return envelope;
}
export const runBeginnerPilot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateInput)
  .handler(async ({ data, context }) => {
    if (process.env.NODE_ENV === "production")
      return {
        ok: false as const,
        error: "This browser-local pilot is available in development preview only.",
        status: 403,
      };
    if (data.state.ownerId !== context.userId) throw new Error("Forbidden");
    try {
      if (data.kind !== "assessment") {
        const { pilotStructuredCall } = await import("./beginner-pilot-ai.server");
        return {
          ok: true as const,
          output: await pilotStructuredCall(data.kind, data.state, data.message ?? ""),
        };
      }
      const { executeEvaluationStep, composeEvaluationRow } =
        await import("./evaluation.functions");
      const key = process.env.LOVABLE_API_KEY;
      if (!key) throw new Error("Lovable AI is not configured.");
      const s = data.state;
      const brief = s.scopes.find((r) => r.id === s.boundScopeId)?.brief ?? readEngagementBrief({});
      const playbook = s.approach === "playbook";
      const live = {
        version: "public_live_v1" as const,
        assessmentPolicy: "three_chapter_v1" as const,
        runs: [],
        omittedRuns: 0,
      };
      const session: SessionForEval & { id: string } = {
        id: s.id,
        pilot_preview: s,
        candidate_name: "Preview pilot coach",
        live_evidence: live,
        framing_notes: brief.coaching_challenge,
        engagement_brief: brief,
        methodology_choice: s.approach,
        methodology_rationale: s.rationale,
        dialogue_commitments: null,
        application_canvas: null,
        playbook_application: { ...s.advanceNotes, pathway: s.advanceNotes?.pathway ?? s.nextMove },
        intervention_recommendation: s.nextMove,
        decision: s.nextMove,
        playbook_suggestions: [],
        scenarios: { title: "ShiftNest · Beginner practice", summary: PILOT_CASE },
        chosen_intervention_slug: playbook
          ? "map_out_customer_profile_with_ai"
          : "deliberate_pause",
        intervention_rationale: s.rationale,
        intervention_committed_at: s.createdAt,
        alignment_workspace: null,
        evidence_gathering_plan: null,
        pause_justification: playbook ? null : { rationale: s.rationale },
        playbook_facilitation_plan: null,
        playbook_activity_run: null,
        playbook_interpretation: null,
        resolved_intervention: {
          slug: playbook ? "map_out_customer_profile_with_ai" : "deliberate_pause",
          label: s.approach,
          pathway_type: playbook ? "playbook" : "deliberate_pause",
          is_deep_vertical: false,
        },
      };
      const turns: TranscriptTurn[] = s.events.map((e) => ({
        role: e.actor === "coach" ? "candidate" : "stakeholder",
        stakeholder_name: e.speaker,
        content: e.text,
        phase: e.meeting === "scope" ? "scoping" : "working_session",
        created_at: e.at,
      }));
      const signals = extractInputQualitySignals(session, turns);
      // The local adapter has no legacy canvas; do not advertise it as required.
      signals.legacy_canvas_applicable = false;
      const input = { s: session, turns, inputQualitySignals: signals };
      if (data.step === "synthesis") {
        const row = await composeEvaluationRow(key, s.id, s.assessment?.steps ?? {}, input, live);
        return {
          ok: true as const,
          output: {
            ...row,
            preview_only: true,
            certification_decision: null,
            pilot_evidence: s,
            assessment_notice: PILOT_ASSESSMENT_RULES,
          },
        };
      }
      return {
        ok: true as const,
        output: await executeEvaluationStep(key, data.step ?? "", input, live),
      };
    } catch (error) {
      const e = error as { status?: number; message?: string };
      return {
        ok: false as const,
        error: (e.message ?? "Generation failed.").slice(0, 400),
        status:
          e.status ??
          (/402|credits exhausted/i.test(e.message ?? "")
            ? 402
            : /403/.test(e.message ?? "")
              ? 403
              : 0),
      };
    }
  });
