import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { PUBLIC_SCENARIO_COLUMNS, publicScenario } from "@/lib/scenario-visibility";

export const listScenarios = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("scenarios")
    .select(PUBLIC_SCENARIO_COLUMNS)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  // Narrow each row to public client context — private assessment truth
  // (ambiguity factors, hidden dynamics) never reaches candidates.
  return { scenarios: (data ?? []).map((s) => publicScenario(s as Record<string, unknown>)).filter((s) => s !== null) };
});

export const getScenario = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { data: scenario, error } = await supabaseAdmin
      .from("scenarios")
      .select(PUBLIC_SCENARIO_COLUMNS)
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!scenario) throw new Error("Scenario not found");
    return { scenario: publicScenario(scenario as Record<string, unknown>) };
  });
