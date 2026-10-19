import { z } from "zod";

// Keep aliases: historical records and assignment roll-ups use these literals.
export const SESSION_STATUSES = [
  "intake", "framing", "dialogue", "stakeholder_workspace", "method", "methodology",
  "coaching_approach", "working_session", "live_playbook", "application",
  "intervention", "next_step_judgment", "engagement_orchestration", "playbook",
  "evaluated", "approved", "conditional", "not_approved", "retry", "escalated",
] as const;

export const sessionStatusSchema = z.enum(SESSION_STATUSES);

const cellValue = z.union([z.string().max(8000), z.array(z.string().max(2000)).max(50)]);
export const canvasSchema = z.union([
  z.object({
    cells: z.record(z.object({
      value: z.string().max(8000),
      confidence: z.string().max(40).optional(),
      ambiguity: z.boolean().optional(),
    }).passthrough()),
  }).passthrough(),
  z.record(cellValue),
]);

// Normalize only for display; do not rewrite stored historical evidence.
export function canvasForEditing(raw: unknown) {
  const cells: Record<string, string> = {};
  const meta: Record<string, { confidence?: string; ambiguity?: boolean }> = {};
  if (!raw || typeof raw !== "object") return { cells, meta };
  const record = raw as Record<string, unknown>;
  const nested = record.cells && typeof record.cells === "object";
  for (const [key, value] of Object.entries(nested ? record.cells as Record<string, unknown> : record)) {
    if (key.startsWith("__meta__")) {
      if (typeof value === "string") {
        try { meta[key.slice(8)] = JSON.parse(value); } catch { /* legacy invalid metadata */ }
      }
    } else if (nested && value && typeof value === "object") {
      const cell = value as Record<string, unknown>;
      cells[key] = typeof cell.value === "string" ? cell.value : "";
      meta[key] = { confidence: typeof cell.confidence === "string" ? cell.confidence : undefined, ambiguity: !!cell.ambiguity };
    } else {
      cells[key] = typeof value === "string" ? value : Array.isArray(value) ? value.join("\n") : "";
    }
  }
  return { cells, meta };
}