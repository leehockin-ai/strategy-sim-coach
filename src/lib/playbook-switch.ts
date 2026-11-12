import { z } from "zod";
import { buildSelection, parsePlaybookUrl, PLAYBOOK_LINK_GUIDANCE, playbookSelectionSchema, resolveSelection, type ResolvedSelection } from "./playbook-selection";

/**
 * Chapter 2 playbook switches: coach-authored, owner-only events persisted as ordinary
 * message rows in their own phase (no schema change). Scope's saved decision is never
 * rewritten; the active reference is the latest switch event, else the Scope decision.
 * Never team speech, never board work, never a claim that playbook content was loaded.
 */
export const SWITCH_PHASE = "playbook:switch:v1";
export const SWITCH_MARKER = "[playbook_switch_v1]";
export const SCOPE_REFERENCE_ID = "scope";

const brief = z.object({ purpose: z.string().max(1000).default(""), activities: z.string().max(1500).default(""), expected_output: z.string().max(1000).default("") });
export const switchInputSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("add"), url: z.string().max(300), title: z.string().trim().min(1, "Add the playbook title").max(200), reason: z.string().trim().min(1, "Say why you are switching").max(1500), working_brief: brief.optional() }),
  z.object({ action: z.literal("return"), target: z.string().min(1).max(64), reason: z.string().trim().min(1, "Say why you are switching back").max(1500) }),
]).superRefine((v, ctx) => { if (v.action === "add" && !parsePlaybookUrl(v.url)) ctx.addIssue({ code: "custom", path: ["url"], message: PLAYBOOK_LINK_GUIDANCE }); });
export type SwitchInput = z.infer<typeof switchInputSchema>;

const payloadSchema = z.object({
  v: z.literal(1),
  kind: z.enum(["add", "return"]),
  reason: z.string().max(1500),
  target: z.string().max(64).optional(),
  reference: playbookSelectionSchema.optional(),
});
export type SwitchPayload = z.infer<typeof payloadSchema>;
export type SwitchEvent = SwitchPayload & { id: string; created_at?: string };

type Row = { id: string; phase: string | null; role: string; content: string; created_at?: string };

export function switchContent(p: SwitchPayload) { return `${SWITCH_MARKER} ${JSON.stringify(p)}`; }

/** Ordered, validated switch events; malformed or non-coach rows are ignored. */
export function switchEvents(rows: Row[] | null | undefined): SwitchEvent[] {
  const out: SwitchEvent[] = [];
  for (const r of rows ?? []) {
    if (r.phase !== SWITCH_PHASE || r.role !== "candidate" || !r.content.startsWith(SWITCH_MARKER)) continue;
    try {
      const p = payloadSchema.parse(JSON.parse(r.content.slice(SWITCH_MARKER.length)));
      if (p.kind === "add" && p.reference?.choice !== "selected") continue;
      out.push({ ...p, id: r.id, created_at: r.created_at });
    } catch { /* ignore malformed */ }
  }
  return out;
}

function eventSelection(e: SwitchEvent): ResolvedSelection {
  const r = resolveSelection({ playbook_selection: e.reference });
  return r.kind === "selected" ? { ...r, source: "chapter2_switch" } : r;
}

export type ActiveReference = { id: string; selection: ResolvedSelection; reason: string; history: Array<{ id: string; selection: ResolvedSelection }> };

/** Active reference = Scope decision, then each switch in order. A return re-activates an earlier reference. */
export function activeReference(scope: ResolvedSelection, rows: Row[] | null | undefined): ActiveReference {
  const refs = new Map<string, ResolvedSelection>([[SCOPE_REFERENCE_ID, scope]]);
  let id = SCOPE_REFERENCE_ID, reason = "";
  for (const e of switchEvents(rows)) {
    if (e.kind === "add") { refs.set(e.id, eventSelection(e)); id = e.id; reason = e.reason; }
    else if (e.target && refs.has(e.target) && e.target !== id) { id = e.target; reason = e.reason; }
  }
  return { id, selection: refs.get(id)!, reason, history: [...refs].map(([rid, selection]) => ({ id: rid, selection })) };
}

/** Builds the event payload for a validated request against the current state. */
export function buildSwitchPayload(input: SwitchInput, current: ActiveReference): SwitchPayload {
  const v = switchInputSchema.parse(input);
  if (v.action === "add") {
    const reference = playbookSelectionSchema.parse(buildSelection({ choice: "selected", url: v.url, title: v.title, reason: v.reason, working_brief: v.working_brief }));
    return { v: 1, kind: "add", reason: v.reason, reference };
  }
  if (v.target === current.id) throw new Error("That playbook is already active.");
  if (!current.history.some(h => h.id === v.target)) throw new Error("That earlier playbook reference was not found.");
  return { v: 1, kind: "return", reason: v.reason, target: v.target };
}

export function referenceLabel(s: ResolvedSelection) {
  return s.kind === "selected" ? s.title : s.kind === "none" ? "No playbook (Scope decision)" : s.kind === "defer" ? "Playbook deferred (Scope decision)" : "No playbook decided in Scope";
}

/** Readable form for transcripts/assessment context: coach decision data, not team speech. */
export function describeSwitch(content: string, refs: ActiveReference["history"]): string {
  const e = switchEvents([{ id: "x", phase: SWITCH_PHASE, role: "candidate", content }])[0];
  if (!e) return "";
  const label = e.kind === "add" && e.reference ? `${JSON.stringify(e.reference.title)} (${e.reference.canonical_url})` : JSON.stringify(referenceLabel(refs.find(h => h.id === e.target)?.selection ?? { kind: "undecided", reason: "", source: "none" }));
  return `Coach ${e.kind === "add" ? "added and activated playbook reference" : "switched back to"} ${label}. Reason: ${JSON.stringify(e.reason)}`;
}
