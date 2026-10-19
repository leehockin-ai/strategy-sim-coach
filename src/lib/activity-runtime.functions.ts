import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertReviewerAccess } from "@/lib/reviewer-access";
import { activityEventSchema, PUBLIC_EVENT_COLUMNS, type ActivityEventInput } from "./activity-runtime";

const sessionInput = z.object({ sessionId: z.string().uuid() });

export const getActivityRuntime = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sessionId: string }) => sessionInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: session, error } = await context.supabase.from("sessions")
      .select("id,owner_id,scenario_id,chosen_intervention_slug,scope_revision,status").eq("id", data.sessionId).single();
    if (error || !session || session.owner_id !== context.userId) throw new Error("Forbidden");
    const { data: intervention } = await context.supabase.from("interventions").select("id,label").eq("slug", session.chosen_intervention_slug ?? "").maybeSingle();
    const { data: testAllowed, error: testError } = await context.supabase.rpc("activity_runtime_test_allowed", { _session: session.id, _candidate: context.userId });
    if (testError) throw new Error("Activity access could not be checked");
    const definitions = intervention ? await context.supabase.from("activity_definitions").select("*").eq("intervention_id", intervention.id).eq("status", "active").order("sort_order") : { data: [], error: null };
    if (definitions.error) throw new Error("Activities could not be loaded");
    const { data: runs, error: runsError } = await context.supabase.from("activity_runs").select("*").eq("session_id", session.id).order("started_at");
    if (runsError) throw new Error("Activity runs could not be loaded");
    const ids = (runs ?? []).map(r => r.id);
    const events = ids.length ? await context.supabase.from("activity_events").select(PUBLIC_EVENT_COLUMNS).in("run_id", ids).order("sequence") : { data: [], error: null };
    const artifacts = ids.length ? await context.supabase.from("activity_artifact_history").select("*").in("run_id", ids).order("revision") : { data: [], error: null };
    if (events.error || artifacts.error) throw new Error("Activity evidence could not be loaded");
    return { session, intervention, testAllowed: !!testAllowed, definitions: (definitions.data ?? []).filter(d => d.test_only ? !!testAllowed : d.methodology_approved), runs: runs ?? [], events: events.data ?? [], artifacts: artifacts.data ?? [] };
  });

export const startActivityRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sessionId: string; definitionId: string; requestKey: string }) => sessionInput.extend({ definitionId: z.string().uuid(), requestKey: z.string().uuid() }).strict().parse(d))
  .handler(async ({ data, context }) => {
    const { data: runId, error } = await context.supabase.rpc("start_activity_run", { _session: data.sessionId, _definition: data.definitionId, _request: data.requestKey });
    if (error || !runId) throw new Error(error?.message ?? "Activity could not be started");
    return { runId };
  });

export const appendActivityEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ActivityEventInput) => activityEventSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: eventId, error } = await context.supabase.rpc("append_activity_event", {
      _run: data.runId, _request: data.requestKey, _type: data.type, _content: data.content,
      ...(data.artifact !== undefined ? { _artifact: data.artifact as import("@/integrations/supabase/types").Json } : {}),
      ...(data.expectedRevision !== undefined ? { _expected_revision: data.expectedRevision } : {}),
      _confidence: data.confidence, _ambiguity: data.ambiguity,
    });
    if (error || !eventId) throw new Error(error?.message ?? "Event could not be saved");
    return { eventId };
  });

// Private truth has no candidate-accessible table or callable unguarded function.
export const getActivityEvidenceForReviewer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { runId: string }) => z.object({ runId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertReviewerAccess(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: run, error } = await context.supabase.from("activity_runs").select("*").eq("id", data.runId).single();
    if (error || !run) throw new Error("Run not found");
    const { data: privateRun, error: privateError } = await supabaseAdmin.from("activity_run_private").select("*").eq("run_id", run.id).single();
    const { data: events, error: eventError } = await context.supabase.from("activity_events").select(PUBLIC_EVENT_COLUMNS).eq("run_id", run.id).order("sequence");
    if (privateError || eventError) throw new Error("Reviewer evidence could not be loaded");
    const truth = privateRun?.simulation_truth_id ? await supabaseAdmin.from("activity_simulation_truth").select("*").eq("id", privateRun.simulation_truth_id).single() : { data: null, error: null };
    const ids = (events ?? []).map(e => e.id);
    const annotations = ids.length ? await supabaseAdmin.from("activity_event_private").select("*").in("event_id", ids) : { data: [], error: null };
    const artifacts = await context.supabase.from("activity_artifact_history").select("*").eq("run_id", run.id).order("revision");
    if (truth.error || annotations.error || artifacts.error) throw new Error("Reviewer evidence could not be loaded");
    return { run, events, artifacts: artifacts.data ?? [], privateRun, truth: truth.data, annotations: annotations.data ?? [] };
  });