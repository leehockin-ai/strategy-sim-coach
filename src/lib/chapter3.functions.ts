import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { loadLiveEvaluationEvidence } from "./evaluation-live-evidence.server";
import { buildChapter3Summary } from "./chapter3-summary";
import { roomEligibility } from "./working-session";

// Candidate-facing Chapter 3 summary. Owner-only; reuses the bounded public evidence
// loader (RLS-scoped). Only room eligibility is read from server-managed config.
export const getChapter3Summary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sessionId: string }) => z.object({ sessionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: session, error } = await context.supabase.from("sessions")
      .select("id,owner_id,scenario_id,chosen_intervention_slug,working_session_skip,scope_revision").eq("id", data.sessionId).single();
    if (error || !session || session.owner_id !== context.userId) throw new Error("Forbidden");
    const evidence = await loadLiveEvaluationEvidence(context.supabase, session);
    const { data: allowed } = await context.supabase.rpc("activity_runtime_test_allowed", { _session: session.id, _candidate: context.userId });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: config } = await supabaseAdmin.from("team_activity_configs").select("poc,methodology_approved")
      .eq("scenario_id", session.scenario_id).eq("intervention_slug", session.chosen_intervention_slug ?? "").eq("status", "active")
      .order("version", { ascending: false }).limit(1).maybeSingle();
    return buildChapter3Summary({ evidence, skip: session.working_session_skip, roomUnavailable: session.chosen_intervention_slug ? roomEligibility(config ?? null, !!allowed) : null, latestScopeRevision: session.scope_revision ?? null });
  });
