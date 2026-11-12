import { activeReference, SCOPE_REFERENCE_ID } from "./playbook-switch";
import { SELECTION_PHASE, type ResolvedSelection } from "./playbook-selection";
import { OPENING_ID, type ConversationMessage } from "./conversation-work";
import type { TeamWork, WorkItem } from "./team-work";

export type WorkspaceView = "team" | "bmc" | "vpc" | "assumptions";
export type NoteOrigin = { badge: string; name: string };
export function sourceOrigins(scope: ResolvedSelection, messages: ConversationMessage[]) {
  const refs = activeReference(scope, messages).history;
  const labels = new Map<string, NoteOrigin>();
  let count = 0;
  for (const r of refs) labels.set(r.id, r.selection.kind === "selected" ? { badge: `P${++count}`, name: r.selection.title } : { badge: "—", name: "No playbook / deferred" });
  const out = new Map<string, NoteOrigin>();
  out.set(OPENING_ID, labels.get(SCOPE_REFERENCE_ID) ?? { badge: "—", name: "Original Scope" });
  const prefix: ConversationMessage[] = [];
  for (const m of messages) {
    prefix.push(m);
    // Legacy rows have no reliable reference contract: do not retroactively label them.
    if (m.phase === SELECTION_PHASE) out.set(m.id, labels.get(activeReference(scope, prefix).id) ?? { badge: "?", name: "Origin unavailable" });
  }
  return out;
}
export function assumptionPosition(item: WorkItem) {
  const importance = item.text.match(/\bimportance\s*(?:is|:|=)\s*(high|low)\b/i)?.[1]?.toLowerCase();
  const evidence = item.text.match(/\bevidence\s*(?:is|:|=)\s*(strong|weak)\b/i)?.[1]?.toLowerCase();
  return importance && evidence ? `${importance}-${evidence}` : "unmapped";
}
const bmc = [
  ["partners", "Key partners"], ["activities", "Key activities"], ["resources", "Key resources"],
  ["value", "Value proposition"], ["relationships", "Customer relationships"], ["channels", "Channels"],
  ["segments", "Customer segments"], ["costs", "Cost structure"], ["revenue", "Revenue streams"],
] as const;
export function workspaceGroups(work: TeamWork, view: WorkspaceView) {
  const group = (key: string, label: string, keys: string[]) => ({ key, label, items: work.sections.filter(s => keys.includes(s.key)).flatMap(s => s.items) });
  if (view === "team") return work.sections.filter(s => s.items.length);
  if (view === "bmc") return [...bmc.map(([key, label]) => group(key, label, [key])), group("unmapped", "Other team work / Unmapped", work.sections.map(s => s.key).filter(k => !bmc.some(([key]) => key === k)))];
  if (view === "vpc") return [
    group("jobs", "Customer profile · Jobs", ["jobs"]), group("pains", "Customer profile · Pains", ["pains"]), group("gains", "Customer profile · Gains", ["gains"]),
    group("products", "Value map · Products & services", ["products"]), group("relievers", "Value map · Pain relievers", ["relievers"]), group("creators", "Value map · Gain creators", ["creators"]),
    group("unmapped", "Other team work / Unmapped", work.sections.map(s => s.key).filter(k => !["jobs", "pains", "gains", "products", "relievers", "creators"].includes(k))),
  ];
  const assumptions = work.sections.filter(s => s.key === "unknowns").flatMap(s => s.items);
  return [...["high-weak", "high-strong", "low-weak", "low-strong"].map(key => ({ key, label: `${key.startsWith("high") ? "High" : "Low"} importance · ${key.endsWith("strong") ? "Strong" : "Weak"} evidence`, items: assumptions.filter(i => assumptionPosition(i) === key) })), { key: "unmapped", label: "Unmapped", items: work.sections.flatMap(s => s.items.filter(i => s.key !== "unknowns" || assumptionPosition(i) === "unmapped")) }];
}