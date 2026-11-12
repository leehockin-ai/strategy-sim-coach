import { expect, it } from "vitest";
import { sourceOrigins, workspaceGroups, assumptionPosition } from "./workspace-view";
import { buildSelection, resolveSelection, SELECTION_PHASE, LEGACY_CUSTOMER_PROFILE_PHASE } from "./playbook-selection";
import { SWITCH_PHASE, switchContent } from "./playbook-switch";
import { conversationWork, starterBoard } from "./conversation-work";

const scope = resolveSelection({ playbook_selection: buildSelection({ choice: "selected", url: "https://platform.strategyzer.com/projects/p/test/dashboard/playbook_runs/model", title: "Competing on Business Models" }) });
const ref = buildSelection({ choice: "selected", url: "https://platform.strategyzer.com/playbook_libraries/strategyzer_library/listings/18", title: "Customer Profile", reason: "Explore customer needs" });
const rows = [
  { id: "s", phase: SWITCH_PHASE, role: "candidate", stakeholder_name: null, content: switchContent({ v: 1, kind: "add", reason: "Explore customer needs", reference: ref }) },
  { id: "m", phase: SELECTION_PHASE, role: "stakeholder", stakeholder_name: "Maya Chen", content: "<<revise S1>> Our draft segment is commuter students, still untested." },
  { id: "r", phase: SWITCH_PHASE, role: "candidate", stakeholder_name: null, content: switchContent({ v: 1, kind: "return", target: "scope", reason: "Return to model" }) },
  { id: "n", phase: SELECTION_PHASE, role: "stakeholder", stakeholder_name: "Maya Chen", content: "<<add revenue>> Our revenue stream is subscriptions, still a guess." },
];
it("keeps original Scope origins and attributes later revision and return by ordered switches", () => {
  const origins = sourceOrigins(scope, rows);
  expect(origins.get("opening")?.badge).toBe("P1");
  expect(origins.get("m")?.badge).toBe("P2");
  expect(origins.get("n")?.badge).toBe("P1");
  const work = conversationWork(rows.filter(r => r.phase === SELECTION_PHASE), ["Maya Chen"], starterBoard({ title: "The Student Founder", stakeholders: [{ name: "Maya Chen" }] }, scope)).work;
  const n = work?.sections.flatMap(s => s.items).find(n => "noteId" in n && n.noteId === "S1");
  expect(n?.sourceId).toBe("m");
  expect(n && "revisions" in n && (n.revisions as Array<{ sourceId: string }>)[0].sourceId).toBe("opening");
  if (!work) throw new Error("Missing work");
  for (const view of ["team", "bmc", "vpc", "assumptions"] as const) expect(workspaceGroups(work, view).flatMap(g => g.items).find(i => i === n)).toBe(n);
  expect(workspaceGroups(work, "bmc").slice(0, 9)).toHaveLength(9);
});
it("never assigns an inferred origin to old rows or ranks assumptions without both explicit axes", () => {
  const old = { ...rows[1], id: "old", phase: LEGACY_CUSTOMER_PROFILE_PHASE };
  expect(sourceOrigins(scope, [...rows, old]).has("old")).toBe(false);
  const item = { text: "Our riskiest assumption is demand, we have no interviews.", sourceId: "m", speaker: "Maya Chen" };
  expect(assumptionPosition(item)).toBe("unmapped");
  expect(assumptionPosition({ ...item, text: "Importance: high. Evidence: weak." })).toBe("high-weak");
  expect(assumptionPosition({ ...item, text: "Importance: high." })).toBe("unmapped");
});