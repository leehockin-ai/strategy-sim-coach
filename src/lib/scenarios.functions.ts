import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const listScenarios = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("scenarios")
    .select("id, slug, title, industry, difficulty, summary, ambiguity_factors, stakeholders")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return { scenarios: data ?? [] };
});

export const getScenario = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { data: scenario, error } = await supabaseAdmin
      .from("scenarios")
      .select("*")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!scenario) throw new Error("Scenario not found");
    return { scenario };
  });
