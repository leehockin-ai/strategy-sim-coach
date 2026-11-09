import { describe, expect, it } from "vitest";
import { customerProfileWork, readTeamWork, reconcileTeamWork, type WorkSource, type TeamWork } from "./team-work";

const original: WorkSource = { id: "old", speaker: "Maya", kind: "team", text: "every university student. AI meal recommendations" };
const wall = () => customerProfileWork({ status: "partial", sections: [{ key: "customer", label: "", items: [{ source_id: "old", quote: "every university student" }] }, { key: "gains", label: "", items: [{ source_id: "old", quote: "AI meal recommendations" }] }] }, [original]) as TeamWork;
const response = (text: string, speaker = "Maya", kind: WorkSource["kind"] = "team"): WorkSource => ({ id: "response:0", speaker, kind, text });
const items = (w: TeamWork, key: string) => w.sections.find(s => s.key === key)?.items ?? [];

describe("deterministic team-owned wall reconciliation", () => {
  it("moves explicit own guess to unknowns without requiring an extractor snapshot", () => {
    const current = wall();
    const source = response("But the 'every university student' thing... I guess that was a guess, even if it feels right.");
    const next = reconcileTeamWork(current, null, [source]);
    expect(items(next, "customer")).toEqual([]);
    expect(items(next, "unknowns")).toEqual([{ text: source.text, sourceId: "response:0", speaker: "Maya" }]);
    expect(items(next, "gains")).toEqual(items(current, "gains"));
    expect(next.status).toBe("revised");
    expect(items(current, "customer")).toHaveLength(1);
  });
  it("moves the owner's explicit social feed revision, preserving correction provenance", () => {
    const source = { ...original, speaker: "Sofia", text: "a few people actually ignored the social feed" };
    const current = customerProfileWork({ status: "partial", sections: [{ key: "evidence", label: "", items: [{ source_id: "old", quote: "a few people actually ignored the social feed" }] }] }, [source]) as TeamWork;
    const exact = response("Yeah, I'll move the 'social feed' stuff to the unknowns since everyone ignored it.", "Sofia");
    const next = reconcileTeamWork(current, null, [exact]);
    expect(items(next, "evidence")).toEqual([]);
    expect(items(next, "unknowns")[0]).toMatchObject({ text: exact.text, speaker: "Sofia", sourceId: exact.id });
  });
  it("withdraws an own prior claim and preserves a literal replacement", () => {
    const next = reconcileTeamWork(wall(), null, [response('I retract "every university student"; instead "International postgraduates".')]);
    expect(items(next, "customer")).toEqual([{ text: "International postgraduates", sourceId: "response:0", speaker: "Maya" }]);
  });
  it.each([
    response("'every university student' is a guess.", "Jordan"),
    response("'every university student' is a guess.", "Coach", "coach"),
    response("Maybe 'every university student' is a guess."),
    response("Is 'every university student' a guess?"),
    response("'every university student' is not a guess."),
    response("It is a guess."),
  ])("rejects unauthorized or ambiguous correction $text", source => {
    const current = wall();
    expect(reconcileTeamWork(current, null, [source])).toBe(current);
  });
  it("does not overwrite a disputed revision or create inferred completeness", () => {
    const current = wall();
    const next = reconcileTeamWork(current, null, [response("'every university student' is a guess."), { ...response("Keep 'every university student' in customer.", "Jordan"), id: "response:1" }]);
    expect(next).toBe(current);
    expect(items(next, "unknowns")).toEqual([]);
  });
  it("extractor omissions/reclassification cannot remove old team claims", () => {
    const current = wall();
    const proposed = { ...current, sections: current.sections.map(s => ({ ...s, items: [] })) };
    expect(reconcileTeamWork(current, proposed, [response("Okay.")])).toBe(current);
  });
  it("does not manufacture a social-feed item absent from the wall", () => {
    const current = wall();
    expect(reconcileTeamWork(current, null, [response("I'll move 'social feed' to unknowns.", "Sofia")])).toBe(current);
  });
  it("ambiguous short references and conflicting categories remain unchanged", () => {
    const current = wall();
    current.sections.find(s => s.key === "customer")?.items.push({ text: "every university student in London", sourceId: "other", speaker: "Maya" });
    expect(reconcileTeamWork(current, null, [response("I'll move 'every university student' to unknowns.")])).toBe(current);
    const unique = wall();
    expect(reconcileTeamWork(unique, null, [response("I'll move 'every university student' to unknowns. I'll move 'every university student' to evidence.")])).toBe(unique);
  });
  it("public correction quotes survive the existing extraction and saved-format validators", () => {
    const source = response("'every university student' was only a guess.");
    const next = reconcileTeamWork(wall(), null, [source]);
    const sanitized = customerProfileWork({ status: next.status, sections: next.sections.map(s => ({ key: s.key, label: s.label, items: s.items.map(i => ({ source_id: i.sourceId, quote: i.text })) })) }, [original, source]);
    expect(sanitized).toEqual(next);
    expect(readTeamWork(sanitized)).toEqual(next);
    const forged = customerProfileWork({ status: "revised", sections: [{ key: "unknowns", label: "", items: [{ source_id: source.id, quote: "the coach invented this" }] }] }, [source]);
    expect(items(forged as TeamWork, "unknowns")).toEqual([]);
  });
  it("retry and refresh keep revision stable; historical snapshot is unchanged", () => {
    const old = wall(), saved = JSON.stringify(old), source = response("'every university student' is a guess.");
    const next = reconcileTeamWork(old, null, [source]);
    const reloaded = readTeamWork(JSON.parse(JSON.stringify(next))) as TeamWork;
    expect(reconcileTeamWork(reloaded, null, [source])).toBe(reloaded);
    expect(JSON.stringify(old)).toBe(saved);
    expect(readTeamWork(JSON.parse(saved))).toEqual(old);
  });
});