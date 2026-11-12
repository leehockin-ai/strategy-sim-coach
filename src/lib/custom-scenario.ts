import { z } from "zod";

export const INTAKE_LIMIT = 24000;
export const UPLOAD_LIMIT = 4 * 1024 * 1024;
export const practiceIntakeSchema = z.object({
  situation: z.string().trim().min(20).max(INTAKE_LIMIT),
  complexity: z.enum(["beginner", "intermediate", "advanced"]),
  dynamics: z.string().trim().max(2000), outcome: z.string().trim().max(2000), constraints: z.string().trim().max(2000),
  clientSafe: z.literal(true),
}).strict();
export const practiceDraftSchema = z.object({
  title: z.string().trim().min(1).max(160),
  brief: z.string().trim().min(20).max(5000),
  team: z.array(z.object({ name: z.string().trim().min(1).max(100), role: z.string().trim().min(1).max(160), description: z.string().max(1000) }).strict()).min(2).max(6),
  tensions: z.string().max(2000), scope: z.string().max(2000),
  outcome: z.string().max(2000), constraints: z.string().max(2000), challenge: z.string().max(2000),
}).strict();
export type PracticeIntake = z.infer<typeof practiceIntakeSchema>;
export type PracticeDraft = z.infer<typeof practiceDraftSchema>;
export const PRACTICE_START_BLOCKER = "Starting custom practice is unavailable until owner-private storage is installed and verified. This draft has not been saved; no session has been created.";

export function assertPracticeOwner(actualOwner: string, requestingOwner: string) {
  if (!actualOwner || actualOwner !== requestingOwner) throw new Error("Private practice not found");
}

// Explicitly marked private sections are omitted before the model call, not
// passed to a model with a request to hide them. Unmarked sensitive text still
// needs the coach's client-safe confirmation and editable review.
export function clientSafeSource(text: string) {
  const safe = text.replace(/\[private\][\s\S]*?(?:\[\/private\]|$)/gi, "")
    .split("\n").filter(line => !/^\s*(private notes?|assessment criteria|evaluator notes?|system prompt)\s*:/i.test(line)).join("\n").trim();
  if (safe.length < 20) throw new Error("Add at least 20 characters of client-visible situation, without private notes.");
  return safe;
}

export const sourceUploadSchema = z.object({
  name: z.string().min(1).max(180), type: z.string().max(100), base64: z.string().min(1).max(Math.ceil(UPLOAD_LIMIT / 3) * 4),
}).strict();
export function sourceBytes(input: z.infer<typeof sourceUploadSchema>) {
  const d = sourceUploadSchema.parse(input);
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(d.base64)) throw new Error("Invalid document encoding");
  const bytes = Uint8Array.from(atob(d.base64), c => c.charCodeAt(0));
  if (!bytes.length || bytes.length > UPLOAD_LIMIT) throw new Error("Document must be nonempty and at most 4 MB");
  const ext = d.name.split(".").pop()?.toLowerCase();
  const allowed: Record<string, string[]> = { pdf: ["application/pdf"], txt: ["text/plain", ""], md: ["text/markdown", "text/plain", ""], vtt: ["text/vtt", "text/plain", ""], srt: ["application/x-subrip", "text/plain", ""] };
  if (!ext || !allowed[ext]?.includes(d.type)) throw new Error("Use PDF, TXT, MD, VTT or SRT. Audio and Word documents are not supported.");
  const signature = new TextDecoder().decode(bytes.subarray(0, 5));
  if ((ext === "pdf") !== (signature === "%PDF-")) throw new Error("Document type does not match its contents");
  if (ext !== "pdf" && bytes.includes(0)) throw new Error("Upload a text transcript, not a binary file");
  return { bytes, pdf: ext === "pdf" };
}

/** Same existing scenario shape for the isolated adapter; no evaluator/private fields. */
export function practiceScenario(draft: PracticeDraft, id: string) {
  const d = practiceDraftSchema.parse(draft);
  return { id, slug: `custom-${id}`, title: d.title, industry: "Custom practice", difficulty: "Practice",
    summary: d.brief, context: `${d.brief}\nPublic team tensions: ${d.tensions}\nScope: ${d.scope}\nConstraints: ${d.constraints}\nCoaching challenge: ${d.challenge}`,
    success_definition: d.outcome, success_pressure: d.constraints, stakeholders: d.team,
  };
}