import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertReviewerAccess } from "./reviewer-access";
import { assertCertificationSession } from "./practice-access";
import { reviewerMaterialsAvailable } from "./reviewer-materials.server";

const sessionSchema = z.object({ sessionId: z.string().uuid() });
async function authorizedSession(client: any, userId: string, sessionId: string) {
  const result = await client.from("sessions").select("*").eq("id", sessionId).maybeSingle();
  if (result.error || !result.data) throw new Error("Session not found");
  if (result.data.owner_id !== userId) {
    await assertReviewerAccess(client, userId);
    if (!result.data.submission_requested_at) throw new Error("Not submitted for review");
  }
  assertCertificationSession(result.data);
  return result.data;
}

export const getReviewerMaterials = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(sessionSchema).handler(async ({ data, context }) => {
  await authorizedSession(context.supabase, context.userId, data.sessionId);
  if (!(await reviewerMaterialsAvailable(context.supabase))) return { available: false, materials: null };
  const result = await (context.supabase as any).from("reviewer_supplements").select("id,note,files,submitted_at").eq("session_id", data.sessionId).maybeSingle();
  if (result.error) throw new Error("Reviewer materials could not be loaded.");
  return { available: true, materials: result.data };
});

export const downloadReviewerMaterial = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(sessionSchema.extend({ materialId: z.string().uuid(), fileIndex: z.number().int().min(0).max(2) })).handler(async ({ data, context }) => {
  await authorizedSession(context.supabase, context.userId, data.sessionId);
  const result = await (context.supabase as any).from("reviewer_supplements").select("files,owner_id").eq("session_id", data.sessionId).eq("id", data.materialId).maybeSingle();
  const file = result.data?.files?.[data.fileIndex];
  if (result.error || !file || !file.path.startsWith(`reviewer-supplements/${result.data.owner_id}/${data.sessionId}/`)) throw new Error("File not found");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const downloaded = await supabaseAdmin.storage.from("playbooks").download(file.path);
  if (downloaded.error || !downloaded.data || downloaded.data.size !== file.size) throw new Error("File unavailable");
  const bytes = new Uint8Array(await downloaded.data.arrayBuffer());
  let encoded = "";
  for (let start = 0; start < bytes.length; start += 8192) encoded += String.fromCharCode(...bytes.subarray(start, start + 8192));
  return { name: file.name, type: file.type, base64: btoa(encoded) };
});