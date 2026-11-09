import { describe, expect, it } from "vitest";
import { assembleLiveEvidence, assertEvidenceOwner, renderLiveEvidence, validateLiveFeedback, type EvidenceEventRow } from "./evaluation-live-evidence";
import { buildSectionInput, extractInputQualitySignals, type SessionForEval } from "./evaluation.io";

const run = { id: "run", session_id: "session", candidate_id: "owner", scenario_id: "scenario", runtime_type: "strategyzer_external", intervention_slug: "original", scope_revision_id: "bound", started_at: "2026-11-09T10:00:00Z", last_sequence: 10 };
const event = (id: string, sequence: number, actor: string, kind: string, content: string, speaker = actor): EvidenceEventRow => ({ id, run_id: "run", sequence, event_type: kind === "concluded" ? "decision" : "event", actor_type: actor, actor_id: speaker, content, occurred_at: `2026-11-09T10:00:${String(sequence).padStart(2, "0")}Z`, metadata: { team_kind: kind, private_hint: "SECRET", evaluator: "SECRET" } });
const scopes = [{ id: "bound", session_id: "session", revision: 1, snapshot: { engagement_brief: { success: "Decide which customer problem to test", decision_maker: "Maya" }, private: "SECRET" } }, { id: "new", session_id: "session", revision: 2, snapshot: { engagement_brief: { success: "NEW OUTCOME" } } }];
function fixture(coach = "Sofia, what have you observed?", status = "partial", withWork = true) {
  const events = [event("start", 1, "system", "session_started", "Started"), event("coach", 2, "coach", "utterance", coach), event("team", 3, "team", "response", "We have only two interviews; the problem is uncertain.", "Sofia"), event("work", 4, "team", "work_product", "First pass", "client_team"), event("end", 5, "coach", "concluded", "Stop here: insufficient evidence; Sofia will test the problem.")];
  const revisions = withWork ? [{ id: "revision", run_id: "run", event_id: "work", revision: 1, actor_type: "team", created_at: events[3].occurred_at, contribution: { base_revision: 0, instruction_event_id: "coach", private: "SECRET" }, state: { provenance: "simulated_client_team", status, sections: [{ key: "unknowns", label: "untrusted label", items: [{ text: "the problem is uncertain", sourceId: "team", speaker: "Sofia" }] }] } }] : [];
  return { sessionId: "session", ownerId: "owner", scenarioId: "scenario", runs: [run], events, revisions, scopes };
}
const session = (live_evidence?: ReturnType<typeof assembleLiveEvidence>): SessionForEval => ({ candidate_name: "Test", scenarios: { title: "Client", summary: "Public brief" }, framing_notes: null, methodology_choice: "legacy", methodology_rationale: null, dialogue_commitments: null, application_canvas: { customer: "LEGACY CANVAS" }, playbook_application: { pathway: "CHAPTER THREE" }, intervention_recommendation: null, decision: null, playbook_suggestions: [], chosen_intervention_slug: "new-choice", intervention_rationale: null, intervention_committed_at: null, alignment_workspace: null, evidence_gathering_plan: null, pause_justification: null, playbook_facilitation_plan: null, playbook_activity_run: null, playbook_interpretation: null, resolved_intervention: null, live_evidence });

describe("observable live evaluation evidence (not AI semantic validity)", () => {
  it.each([
    ["strong", "Sofia, what have you observed?"],
    ["leading", "Our customers obviously need speed; agree?"],
    ["poor participation", "Maya, answer for everyone."],
    ["rushed", "Fill every box now; no time for questions."],
    ["intentional stop", "Stop here; we need evidence before completing this."],
  ])("preserves %s coaching verbatim and routes it to behavior sections", (_, text) => {
    const evidence = assembleLiveEvidence(fixture(text));
    expect(evidence.runs[0].moments.find(m => m.id === "coach")?.text).toBe(text);
    for (const key of ["stakeholder_navigation", "working_session_facilitation", "methodological_soundness", "intervention_execution"] as const) expect(buildSectionInput(key, session(evidence), [])).toContain(text);
    expect(renderLiveEvidence(evidence, "soft")).toContain(text);
    expect(renderLiveEvidence(evidence, "methodology")).toContain(text);
    for (const key of ["situation_framing", "coaching_strategy", "intervention_fit"] as const) expect(buildSectionInput(key, session(evidence), [])).not.toContain(text);
  });
  it("retains original bound Scope/intervention, not current mutable choices", () => {
    const evidence = assembleLiveEvidence(fixture());
    const prompt = buildSectionInput("intervention_execution", session(evidence), []);
    expect(prompt).toContain("Decide which customer problem to test");
    expect(prompt).toContain('"intervention":"original"');
    expect(prompt).not.toContain("NEW OUTCOME"); expect(prompt).not.toContain("new-choice");
  });
  it("never falls back to newer Scope when the bound revision is missing", () => {
    const input = fixture(); input.scopes = input.scopes.slice(1);
    const result = assembleLiveEvidence(input);
    expect(result.runs[0].scope).toBeNull(); expect(JSON.stringify(result)).not.toContain("NEW OUTCOME");
  });
  it("excludes private metadata, arbitrary labels and coach-sourced work", () => {
    const input = fixture(); input.revisions[0].state.sections[0].items.push({ text: input.events[1].content, sourceId: "coach", speaker: "coach" });
    const evidence = assembleLiveEvidence(input);
    expect(evidence.runs[0].revisions[0].work.sections.find(s => s.key === "unknowns")?.items).toHaveLength(1);
    expect(JSON.stringify(evidence)).not.toContain("SECRET"); expect(JSON.stringify(evidence)).not.toContain("untrusted label");
  });
  it("orders events and preserves revision/source/conclusion lineage across refresh", () => {
    const input = fixture();
    const r = input.revisions[0];
    input.events.push(event("coach2", 6, "coach", "utterance", "Revise only what the interviews support."), event("work2", 7, "team", "work_product", "Revised", "client_team"));
    input.revisions.push({ ...r, id: "revision2", revision: 2, event_id: "work2", contribution: { ...r.contribution, base_revision: 1, instruction_event_id: "coach2" } });
    const evidence = assembleLiveEvidence(input);
    expect(evidence.runs[0].revisions.map(r => [r.id, r.baseRevision, r.instructionEventId])).toEqual([["revision", 0, "coach"], ["revision2", 1, "coach2"]]);
    expect(assembleLiveEvidence({ ...input, events: [...input.events].reverse() })).toEqual(evidence);
    expect(evidence.runs[0].moments.find(m => m.kind === "conclusion")?.timestamp).toBe("2026-11-09T10:00:05Z");
  });
  it("rejects broken or future revision lineage", () => {
    const input = fixture(); input.revisions[0].contribution.base_revision = 5;
    expect(assembleLiveEvidence(input).runs[0].revisions).toHaveLength(0);
    input.revisions[0].contribution.base_revision = 0; input.events.find(e => e.id === "team")?.sequence;
    input.events[2].sequence = 8;
    expect(assembleLiveEvidence(input).runs[0].revisions[0].work.sections.every(s => s.items.length === 0)).toBe(true);
  });
  it("keeps missing work and intentional stop descriptive, not automatic failure", () => {
    const noWork = assembleLiveEvidence(fixture("Stop while we test.", "partial", false));
    expect(noWork.runs[0].gaps).toContain("No team-owned work recorded; this is not evidence of weak coaching.");
    expect(extractInputQualitySignals(session(noWork), []).legacy_canvas_applicable).toBe(false);
    const stopped = assembleLiveEvidence(fixture("Stop while we test.", "stopped_intentionally"));
    expect(stopped.runs[0].revisions[0].work.status).toBe("stopped_intentionally");
    expect(buildSectionInput("working_session_facilitation", session(stopped), [])).not.toContain("LEGACY CANVAS");
  });
  it("retains historical legacy canvas and Chapter 3 routing", () => {
    expect(buildSectionInput("working_session_facilitation", session(), [])).toContain("LEGACY CANVAS");
    expect(extractInputQualitySignals(session(), []).legacy_canvas_applicable).toBe(true);
    const evidence = assembleLiveEvidence(fixture());
    const pathway = buildSectionInput("engagement_pathway", session(evidence), []);
    expect(pathway).toContain("CHAPTER THREE"); expect(pathway).not.toContain("Sofia, what have you observed?");
    expect(renderLiveEvidence(evidence, "soft")).not.toContain('"revisions"');
  });
  it("denies nonowners and rejects cross-session/run/scenario evidence", () => {
    expect(() => assertEvidenceOwner({ id: "session", owner_id: "owner" }, "other")).toThrow("Forbidden");
    expect(() => assertEvidenceOwner({ id: "session", owner_id: "owner" }, "owner")).not.toThrow();
    for (const field of ["session_id", "candidate_id", "scenario_id"] as const) { const input = fixture(); input.runs = [{ ...run, [field]: "other" }]; expect(assembleLiveEvidence(input).runs).toHaveLength(0); }
    const input = fixture(); input.events.forEach(e => e.run_id = "other"); expect(assembleLiveEvidence(input).runs).toHaveLength(0);
  });
  it("rejects invented event references and preserves valid references", () => {
    const evidence = assembleLiveEvidence(fixture());
    expect(validateLiveFeedback({ evidence: "Event 11111111-1111-4111-8111-111111111111", confidence: "high" }, evidence, "soft").confidence).toBe("low");
    const feedback = { evidence: "2026-11-09T10:00:03Z Sofia stated uncertainty", confidence: "high" };
    expect(validateLiveFeedback(feedback, evidence, "soft")).toEqual(feedback);
  });
});