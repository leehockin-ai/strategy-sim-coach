import { hasReviewerMaterials, MATERIAL_BLOCKER, materialBytes, materialsSchema } from "./reviewer-materials";
import { assertCertificationSession } from "./practice-access";

export async function reviewerMaterialsAvailable(client: any) {
  const result = await client.rpc("reviewer_materials_capability");
  return !result.error && result.data === 1;
}

// Authenticated handler supplies an already-authorized owner session; service-only RPC
// rechecks owner/evaluation under a row lock. No client-chosen recipient or storage path.
export async function submitReviewerMaterials(admin: any, session: any, userId: string, input: unknown) {
  if (session.owner_id !== userId) throw new Error("Forbidden");
  assertCertificationSession(session);
  const draft = materialsSchema.parse(input);
  if (!hasReviewerMaterials(draft)) throw new Error("No supplementary materials supplied.");
  if (!(await reviewerMaterialsAvailable(admin))) throw new Error(MATERIAL_BLOCKER);
  const prior = await admin.from("reviewer_supplements").select("request_id").eq("session_id",session.id).maybeSingle();
  if (prior.error) throw new Error("Submission storage could not be checked. Your draft is retained.");
  if (session.submission_requested_at && prior.data?.request_id !== draft.requestId) throw new Error("This submission is already frozen; supplementary materials cannot be added later.");
  const validated = draft.files.map(file => ({ file, bytes: materialBytes(file) }));
  const metadata = [];
  for (const [index, { file, bytes }] of validated.entries()) {
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))).map(b => b.toString(16).padStart(2, "0")).join("");
    const path = `reviewer-supplements/${userId}/${session.id}/${draft.requestId}/${index}-${digest}`;
    const { error } = await admin.storage.from("playbooks").upload(path, bytes, { contentType: file.type, upsert: false });
    // Identical retry uses the same immutable content-addressed key, never overwrite.
    if (error && !["409", "Duplicate"].includes(String(error.statusCode ?? error.error))) throw new Error("A file could not be saved. Your draft is retained; retry explicitly.");
    metadata.push({ name: file.name, type: file.type, size: bytes.length, path });
  }
  const result = await admin.rpc("submit_reviewer_materials", { _session: session.id, _owner: userId, _request: draft.requestId, _note: draft.note, _files: metadata });
  if (result.error || !result.data) throw new Error("Submission could not finish. Your draft is retained; retry explicitly.");
  return result.data;
}