import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { practiceIntakeSchema, sourceUploadSchema } from "./custom-scenario";
import { practiceStartSchema } from "./practice-access";

// Every entry point requires validated signed-in identity; launch uses owner-RLS RPCs.
export const extractCustomScenarioSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).inputValidator(d => sourceUploadSchema.parse(d))
  .handler(async ({ data }) => {
    const { extractPracticeSource } = await import("./custom-scenario.server");
    return extractPracticeSource(data);
  });
export const draftCustomScenario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).inputValidator(d => practiceIntakeSchema.parse(d))
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI drafting is not configured. Your source has not been saved.");
    const { generatePracticeDraft } = await import("./custom-scenario.server");
    return { draft: await generatePracticeDraft(data, key), ownerId: context.userId };
  });
export const startCustomPractice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).inputValidator(d => practiceStartSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { launchPrivatePractice } = await import("./private-practice.server");
    return launchPrivatePractice(context.supabase, context.userId, data);
  });

export const customPracticeCapability = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth]).handler(async ({ context }) => {
    const { privatePracticeAvailable } = await import("./private-practice.server");
    return { available: await privatePracticeAvailable(context.supabase) };
  });