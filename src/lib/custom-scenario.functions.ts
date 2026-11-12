import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PRACTICE_START_BLOCKER, practiceDraftSchema, practiceIntakeSchema, sourceUploadSchema } from "./custom-scenario";

// Every entry point requires validated signed-in identity. No admin client or
// durable storage exists in this opt-in preview path.
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
  .middleware([requireSupabaseAuth]).inputValidator(d => practiceDraftSchema.parse(d))
  .handler(async () => { throw new Error(PRACTICE_START_BLOCKER); });