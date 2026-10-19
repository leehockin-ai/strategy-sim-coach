import { z } from "zod";
import { canvasForEditing } from "@/lib/session-compatibility";

export const candidateEventTypes = ["coach_message", "artifact_edit", "artifact_contribution", "evidence_surfaced", "assumption_surfaced", "ambiguity_flagged", "ambiguity_resolved", "synthesis", "decision", "candidate_stop"] as const;
export const activityEventSchema = z.object({
  runId: z.string().uuid(), requestKey: z.string().uuid(),
  type: z.enum(candidateEventTypes), content: z.string().max(8000),
  artifact: z.record(z.unknown()).optional(), expectedRevision: z.number().int().min(0).optional(),
  confidence: z.enum(["unknown", "low", "medium", "high"]).default("unknown"), ambiguity: z.boolean().default(false),
}).strict().superRefine((value, ctx) => {
  const artifactEvent = value.type === "artifact_edit" || value.type === "artifact_contribution";
  if (artifactEvent !== (value.artifact !== undefined)) ctx.addIssue({ code: "custom", message: "Artifact changes require an artifact event" });
  if (artifactEvent && value.expectedRevision === undefined) ctx.addIssue({ code: "custom", message: "Artifact revision required" });
  if (value.type === "candidate_stop" && !value.content.trim()) ctx.addIssue({ code: "custom", message: "Stop rationale required" });
  if (value.artifact && JSON.stringify(value.artifact).length > 100000) ctx.addIssue({ code: "custom", message: "Artifact is too large" });
});
export type ActivityEventInput = z.input<typeof activityEventSchema>;
export const PUBLIC_EVENT_COLUMNS = "id,run_id,sequence,event_type,actor_type,actor_id,content,metadata,occurred_at,simulated_time_seconds,time_category,evidence_reference,message_id" as const;

// Definitions dispatch workspaces; neither run storage nor evidence requires canvas cells.
export function workspaceKind(type: string) {
  if (["canvas", "bmc", "vpc", "customer_profile"].includes(type)) return "canvas";
  if (type === "notes") return "notes";
  return "structured";
}
export function artifactForWorkspace(type: string, state: unknown) {
  const kind = workspaceKind(type);
  if (kind === "canvas") return canvasForEditing(state);
  if (kind === "notes") return { notes: state && typeof state === "object" && "notes" in state && typeof state.notes === "string" ? state.notes : "" };
  return state && typeof state === "object" ? state : {};
}
// Level 0 external runtime: parse/normalize a candidate-supplied URL. Never fetched server-side.
export type NormalizedExternalUrl = { ok: true; supplied: string; launch: string; host: string } | { ok: false; error: string };
export function hostAllowed(host: string, suffixes: readonly string[]) {
  return suffixes.some(s => host === s || host.endsWith(`.${s}`));
}
export function normalizeStrategyzerUrl(input: string, suffixes: readonly string[]): NormalizedExternalUrl {
  const supplied = input.trim();
  if (!supplied || supplied.length > 2048) return { ok: false, error: "Paste the full address of your Strategyzer project or Playbook." };
  if (/[\s<>"'`\\]/.test(supplied)) return { ok: false, error: "That address contains characters that are not allowed." };
  let url: URL;
  try { url = new URL(supplied); } catch { return { ok: false, error: "That is not a valid web address." }; }
  if (url.protocol !== "https:") return { ok: false, error: "The address must start with https://" };
  if (url.username || url.password || url.port) return { ok: false, error: "That address is not accepted." };
  const host = url.hostname.toLowerCase();
  if (!hostAllowed(host, suffixes)) return { ok: false, error: "That address is not a recognised Strategyzer address." };
  const launch = url.toString();
  if (launch.length > 2048) return { ok: false, error: "That address is too long." };
  return { ok: true, supplied, launch, host };
}
