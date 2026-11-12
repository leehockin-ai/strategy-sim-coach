import { z } from "zod";
import { validateScreenshot } from "./team-attachment";

export const MATERIAL_FILE_LIMIT = 4 * 1024 * 1024;
export const MATERIAL_COUNT_LIMIT = 3;
export const MATERIAL_BLOCKER = "Reviewer materials are not available until private submission storage is installed and verified. You can still submit without supplementary materials.";
export const materialFileSchema = z.object({ name: z.string().trim().min(1).max(160).regex(/^[^/\\\x00-\x1f]+$/), type: z.enum(["application/pdf", "image/png", "image/jpeg", "image/webp"]), base64: z.string().max(Math.ceil(MATERIAL_FILE_LIMIT / 3) * 4) }).strict();
export const materialsSchema = z.object({ requestId: z.string().uuid(), note: z.string().trim().max(4000), files: z.array(materialFileSchema).max(MATERIAL_COUNT_LIMIT) }).strict();
export type ReviewerMaterialsDraft = z.infer<typeof materialsSchema>;
export function materialBytes(file: z.infer<typeof materialFileSchema>) {
  const f = materialFileSchema.parse(file);
  if (!f.base64 || f.base64.length % 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(f.base64)) throw new Error("Invalid file encoding.");
  const raw = atob(f.base64);
  if (!raw.length || raw.length > MATERIAL_FILE_LIMIT) throw new Error("Each file must be nonempty and at most 4 MB.");
  const bytes = Uint8Array.from(raw, c => c.charCodeAt(0));
  const ext = f.name.split(".").at(-1)?.toLowerCase();
  if (!({ "application/pdf": ["pdf"], "image/png": ["png"], "image/jpeg": ["jpg", "jpeg"], "image/webp": ["webp"] }[f.type]).includes(ext ?? "")) throw new Error("File extension does not match its type.");
  if (f.type === "application/pdf") {
    if (!raw.startsWith("%PDF-") || !raw.slice(-1024).includes("%%EOF")) throw new Error("Choose a complete PDF, not a renamed file.");
    if (/\/(JavaScript|JS|Launch|EmbeddedFile|Encrypt)\b/.test(raw)) throw new Error("Use a PDF without scripts, embedded files or encryption.");
  } else validateScreenshot(`data:${f.type};base64,${f.base64}`);
  return bytes;
}
export function hasReviewerMaterials(draft?: ReviewerMaterialsDraft) { return !!draft && (!!draft.note.trim() || draft.files.length > 0); }

export type SubmittedMaterials = { id: string; note: string; files: Array<{ name: string; type: string; size: number; path: string }>; submitted_at: string };