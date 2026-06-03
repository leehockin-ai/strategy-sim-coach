import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { notify } from "@/lib/notifications.functions";

// ──────────────────────────────────────────────────────────────────
// Authorization helpers
// ──────────────────────────────────────────────────────────────────
async function assertProgramAdmin(programId: string, userId: string) {
  const { data } = await supabaseAdmin
    .from("program_admins" as any)
    .select("program_id")
    .eq("program_id", programId)
    .eq("user_id", userId)
    .maybeSingle();
  if (data) return;
  const { data: globalAdmin } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (globalAdmin) return;
  throw new Error("Forbidden — not a program admin");
}

// ──────────────────────────────────────────────────────────────────
// Admin: list programs I administer
// ──────────────────────────────────────────────────────────────────
export const listPrograms = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin
      .from("programs" as any)
      .select(
        `id, slug, name, kind, description, archived_at, created_at,
         program_admins!inner(user_id)`,
      )
      .eq("program_admins.user_id", context.userId)
      .is("archived_at", null)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { programs: data ?? [] };
  });

// ──────────────────────────────────────────────────────────────────
// Admin: program detail — members, recent assignments
// ──────────────────────────────────────────────────────────────────
export const getProgramDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { programId: string }) =>
    z.object({ programId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertProgramAdmin(data.programId, context.userId);

    const [{ data: program }, { data: admins }, { data: members }, { data: assignments }] =
      await Promise.all([
        supabaseAdmin.from("programs" as any).select("*").eq("id", data.programId).single(),
        supabaseAdmin
          .from("program_admins" as any)
          .select("user_id, added_at")
          .eq("program_id", data.programId),
        supabaseAdmin
          .from("program_members" as any)
          .select("user_id, display_name, cohort_label, joined_at")
          .eq("program_id", data.programId)
          .order("joined_at", { ascending: false }),
        supabaseAdmin
          .from("assignments" as any)
          .select(
            `id, status, admin_note, due_at, created_at,
             assigned_to_user_id, assigned_by_user_id,
             scenarios:scenario_id (id, slug, title, difficulty, industry)`,
          )
          .eq("program_id", data.programId)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

    return {
      program: program ?? null,
      admins: admins ?? [],
      members: members ?? [],
      assignments: assignments ?? [],
    };
  });

// ──────────────────────────────────────────────────────────────────
// Admin: program-level rollup (methodology-drift signal)
// ──────────────────────────────────────────────────────────────────
export const getProgramRollup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { programId: string }) =>
    z.object({ programId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertProgramAdmin(data.programId, context.userId);

    const { data: rows, error } = await supabaseAdmin
      .from("sessions")
      .select(
        `id, status, scenario_id,
         scenarios:scenario_id (slug, title),
         assignment_id,
         assignments:assignment_id!inner (program_id),
         evaluations (scores, ai_section_verdicts, recommendation, reviewer_decision)`,
      )
      .eq("assignments.program_id", data.programId);
    if (error) throw new Error(error.message);

    type Bucket = {
      scenario_slug: string;
      scenario_title: string;
      session_count: number;
      section_avgs: Record<string, { sum: number; n: number }>;
      recommendations: Record<string, number>;
    };
    const buckets = new Map<string, Bucket>();

    for (const r of (rows ?? []) as any[]) {
      const scenarioId = r.scenario_id as string;
      const sx = r.scenarios;
      let b = buckets.get(scenarioId);
      if (!b) {
        b = {
          scenario_slug: sx?.slug ?? "",
          scenario_title: sx?.title ?? "",
          session_count: 0,
          section_avgs: {},
          recommendations: {},
        };
        buckets.set(scenarioId, b);
      }
      b.session_count += 1;

      const ev = (r.evaluations ?? [])[0];
      if (ev?.ai_section_verdicts) {
        for (const [k, v] of Object.entries(ev.ai_section_verdicts as Record<string, any>)) {
          if (typeof v?.score === "number") {
            const acc = b.section_avgs[k] ?? { sum: 0, n: 0 };
            acc.sum += v.score;
            acc.n += 1;
            b.section_avgs[k] = acc;
          }
        }
      }
      const rec = ev?.recommendation ?? "unscored";
      b.recommendations[rec] = (b.recommendations[rec] ?? 0) + 1;
    }

    const rollup = Array.from(buckets.values()).map((b) => ({
      scenario_slug: b.scenario_slug,
      scenario_title: b.scenario_title,
      session_count: b.session_count,
      section_averages: Object.fromEntries(
        Object.entries(b.section_avgs).map(([k, v]) => [
          k,
          v.n > 0 ? +(v.sum / v.n).toFixed(2) : null,
        ]),
      ),
      recommendations: b.recommendations,
    }));

    return { rollup };
  });

// ──────────────────────────────────────────────────────────────────
// Admin: add a member to a program
// ──────────────────────────────────────────────────────────────────
export const addProgramMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      programId: string;
      userEmail: string;
      displayName?: string;
      cohortLabel?: string;
    }) =>
      z
        .object({
          programId: z.string().uuid(),
          userEmail: z.string().email(),
          displayName: z.string().max(200).optional(),
          cohortLabel: z.string().max(80).optional(),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertProgramAdmin(data.programId, context.userId);

    // Resolve email -> user_id via the admin auth API.
    let resolvedUserId: string | null = null;
    // Page through up to a few hundred users; for larger orgs we can move to
    // an indexed lookup table later.
    for (let page = 1; page <= 5 && !resolvedUserId; page++) {
      const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      if (listErr) throw new Error("Could not look up user: " + listErr.message);
      const match = list.users.find(
        (u) => u.email?.toLowerCase() === data.userEmail.toLowerCase(),
      );
      if (match) resolvedUserId = match.id;
      if (list.users.length < 200) break;
    }
    if (!resolvedUserId) {
      throw new Error(
        "No user found with that email. They must sign in once before being added to a program.",
      );
    }

    const { error: insErr } = await supabaseAdmin.from("program_members" as any).insert({
      program_id: data.programId,
      user_id: resolvedUserId,
      display_name: data.displayName ?? null,
      cohort_label: data.cohortLabel ?? null,
      invited_by: context.userId,
    });
    if (insErr && !insErr.message.includes("duplicate")) throw new Error(insErr.message);

    return { ok: true, userId: resolvedUserId };
  });

// ──────────────────────────────────────────────────────────────────
// Admin: create an assignment
// ──────────────────────────────────────────────────────────────────
export const createAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      programId: string;
      scenarioId: string;
      assigneeUserId: string;
      adminNote?: string;
      dueAt?: string;
    }) =>
      z
        .object({
          programId: z.string().uuid(),
          scenarioId: z.string().uuid(),
          assigneeUserId: z.string().uuid(),
          adminNote: z.string().max(2000).optional(),
          dueAt: z.string().datetime().optional(),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertProgramAdmin(data.programId, context.userId);

    const { data: assignment, error } = await supabaseAdmin
      .from("assignments" as any)
      .insert({
        program_id: data.programId,
        scenario_id: data.scenarioId,
        assigned_to_user_id: data.assigneeUserId,
        assigned_by_user_id: context.userId,
        admin_note: data.adminNote ?? null,
        due_at: data.dueAt ?? null,
      })
      .select(
        `id, program_id, scenario_id,
         scenarios:scenario_id (title),
         programs:program_id (name)`,
      )
      .single();
    if (error) {
      if (error.message.includes("duplicate")) {
        throw new Error(
          "This scenario is already assigned to this coach in this program. Cancel the existing assignment first.",
        );
      }
      if (error.message.includes("not a member")) {
        throw new Error(
          "That user is not a member of this program. Add them as a member first.",
        );
      }
      throw new Error(error.message);
    }

    const a = assignment as any;
    const sx = a.scenarios;
    const pg = a.programs;
    await notify({
      recipientId: data.assigneeUserId,
      kind: "assignment_received",
      title: `New assignment: ${sx?.title ?? "scenario"}`,
      body: `${pg?.name ?? "A Strategyzer program"} has assigned ${
        sx?.title ?? "a scenario"
      } to you${
        data.adminNote
          ? ` — note: "${data.adminNote.slice(0, 120)}${
              data.adminNote.length > 120 ? "…" : ""
            }"`
          : ""
      }. Open Assignments to begin.`,
      deepLink: `/assignments`,
      metadata: {
        assignment_id: a.id,
        program_id: data.programId,
        scenario_id: data.scenarioId,
      },
    });

    return { assignment };
  });

// ──────────────────────────────────────────────────────────────────
// Admin: cancel an assignment
// ──────────────────────────────────────────────────────────────────
export const cancelAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { assignmentId: string }) =>
    z.object({ assignmentId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: a } = await supabaseAdmin
      .from("assignments" as any)
      .select("program_id")
      .eq("id", data.assignmentId)
      .single();
    if (!a) throw new Error("Assignment not found");
    await assertProgramAdmin((a as any).program_id, context.userId);

    const { error } = await supabaseAdmin
      .from("assignments" as any)
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", data.assignmentId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
