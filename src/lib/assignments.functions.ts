import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { seedInitialStakeholderStates } from "@/lib/simulator.functions";


// ──────────────────────────────────────────────────────────────────
// Coach: list my assignments across all programs I'm a member of
// ──────────────────────────────────────────────────────────────────
export const listMyAssignments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin
      .from("assignments" as any)
      .select(
        `id, status, admin_note, due_at, created_at,
         programs:program_id (id, slug, name, kind),
         scenarios:scenario_id (id, slug, title, difficulty, industry, summary)`,
      )
      .eq("assigned_to_user_id", context.userId)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const ids = (data ?? []).map((a: any) => a.id);
    const sessionsByAssignment: Record<string, any[]> = {};
    if (ids.length > 0) {
      const { data: sess } = await supabaseAdmin
        .from("sessions")
        .select("id, status, created_at, completed_at, assignment_id")
        .in("assignment_id", ids)
        .eq("owner_id", context.userId)
        .order("created_at", { ascending: false });
      for (const s of (sess ?? []) as any[]) {
        const aid = s.assignment_id as string;
        (sessionsByAssignment[aid] ??= []).push(s);
      }
    }

    return {
      assignments: ((data ?? []) as any[]).map((a) => ({
        ...a,
        sessions: sessionsByAssignment[a.id] ?? [],
      })),
    };
  });

// ──────────────────────────────────────────────────────────────────
// Coach: fetch one assignment in detail
// ──────────────────────────────────────────────────────────────────
export const getAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { assignmentId: string }) =>
    z.object({ assignmentId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: a, error } = await supabaseAdmin
      .from("assignments" as any)
      .select(
        `id, status, admin_note, due_at, created_at,
         program_id, scenario_id, assigned_to_user_id,
         programs:program_id (name, kind),
         scenarios:scenario_id (id, slug, title, difficulty, industry, summary, context, ambiguity_factors, stakeholders)`,
      )
      .eq("id", data.assignmentId)
      .single();
    if (error || !a) throw new Error("Assignment not found");
    if ((a as any).assigned_to_user_id !== context.userId) throw new Error("Forbidden");
    return { assignment: a };
  });

// ──────────────────────────────────────────────────────────────────
// Coach: start a new session linked to an assignment (or resume)
// ──────────────────────────────────────────────────────────────────
export const startSessionFromAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { assignmentId: string; resumeIfPossible?: boolean }) =>
      z
        .object({
          assignmentId: z.string().uuid(),
          resumeIfPossible: z.boolean().optional(),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: a } = await supabaseAdmin
      .from("assignments" as any)
      .select(
        "id, program_id, scenario_id, assigned_to_user_id, status, scenarios:scenario_id (title)",
      )
      .eq("id", data.assignmentId)
      .single();
    if (!a) throw new Error("Assignment not found");
    const ax = a as any;
    if (ax.assigned_to_user_id !== context.userId) throw new Error("Forbidden");
    if (ax.status === "cancelled") throw new Error("This assignment has been cancelled.");

    if (data.resumeIfPossible) {
      const { data: existing } = await supabaseAdmin
        .from("sessions")
        .select("id, status")
        .eq("assignment_id", data.assignmentId)
        .eq("owner_id", context.userId)
        .not(
          "status",
          "in",
          '("evaluated","approved","conditional","not_approved","retry","escalated")',
        )
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing) return { sessionId: (existing as any).id, resumed: true };
    }

    const { data: userRow } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const email = userRow.user?.email ?? "";
    const displayName =
      (userRow.user?.user_metadata?.full_name as string | undefined) ??
      email.split("@")[0] ??
      "Coach";

    const { data: session, error } = await supabaseAdmin
      .from("sessions")
      .insert({
        owner_id: context.userId,
        scenario_id: ax.scenario_id,
        candidate_name: displayName,
        candidate_email: email,
        status: "intake",
        assignment_id: data.assignmentId,
      } as any)
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    return { sessionId: (session as any).id, resumed: false };
  });
