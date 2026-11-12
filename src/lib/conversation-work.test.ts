import { describe, expect, it } from "vitest";
import { conversationWork, starterBoard, parseOps, stripOps, OPENING_ID, type BoardNote, type ConversationMessage } from "./conversation-work";
import { resolveSelection } from "./playbook-selection";
const roster = ["Maya Chen", "Jordan Patel", "Sofia Ramirez"];
const turn = (id: string, content: string, speaker = "Maya Chen", role = "stakeholder"): ConversationMessage => ({ id, phase: "playbook:selection:v1", role, content, stakeholder_name: speaker });
describe("read-only conversation notes", () => {
  it("extracts job, assumption and BMC resource only from exact attributed team quotes", () => {
    const messages = [turn("job", "The customer job is to plan affordable meals."), turn("assumption", "Our assumption is that students want AI recommendations."), turn("resource", "Our key resources are the prototype and our developer.", "Jordan Patel"), turn("coach", "Our key resources are unlimited funding.", "Coach", "candidate"), turn("stranger", "Pain: cooking takes too long.", "Unknown"), turn("chat", "Thanks, I agree."), turn("question", "Should we list a customer job?")];
    const result = conversationWork(messages, roster);
    expect(result.work?.sections.find(s => s.key === "jobs")?.items).toMatchObject([{ text: messages[0].content, sourceId: "job", speaker: "Maya Chen" }]);
    expect(result.work?.sections.find(s => s.key === "unknowns")?.items[0].sourceId).toBe("assumption");
    expect(result.work?.sections.find(s => s.key === "resources")?.items[0].speaker).toBe("Jordan Patel");
    expect(result.work?.sections.flatMap(s => s.items)).toHaveLength(3);
  });
  it("keeps reload/retry stable, without duplicate notes or mutating messages", () => {
    const messages = [turn("a", "The customer job is to plan affordable meals.")];
    const frozen = JSON.stringify(messages);
    expect(conversationWork([...messages, ...messages], roster)).toEqual(conversationWork(JSON.parse(frozen), roster));
    expect(JSON.stringify(messages)).toBe(frozen);
  });
  it("keeps explicit own corrections in history and ignores coach-only or ambiguous changes", () => {
    const original = turn("a", "The customer job is to plan affordable meals.");
    const correction = turn("b", 'I reclassify "plan affordable meals" to assumptions.');
    const result = conversationWork([original, correction], roster);
    expect(result.work?.sections.find(s => s.key === "jobs")?.items).toHaveLength(0);
    expect(result.work?.sections.find(s => s.key === "unknowns")?.items[0].sourceId).toBe("b");
    expect(result.history[0].work.sections.find(s => s.key === "jobs")?.items[0].sourceId).toBe("a");
    for (const change of [turn("c", correction.content, "Coach", "candidate"), turn("d", 'Maybe we should move "plan affordable meals" to assumptions.'), turn("e", correction.content, "Jordan Patel")]) {
      expect(conversationWork([original, change], roster).work?.sections.find(s => s.key === "jobs")?.items).toHaveLength(1);
    }
  });
  it("does not manufacture work or collect generic conversation", () => {
    expect(conversationWork([turn("a", "We need to think about it." )], roster).work).toBeNull();
    expect(conversationWork([turn("old", "[Maya Chen] Thanks.\n[Jordan Patel] Our key resources are the prototype.")], roster).work).toBeNull();
  });
  it("recognizes bounded plain-language material from actual Student Founder AI replies", () => {
    const messages = [turn("a", "We want to help students stop eating junk and actually cook for themselves without it taking over their whole lives."), turn("b", "Honestly, we have some base code for a recipe scraper and a rough database structure, but that's about it.", "Jordan Patel"), turn("c", "We’re guessing they hate finding a cheap recipe online.", "Sofia Ramirez")];
    const result = conversationWork(messages, roster);
    expect(result.work?.sections.find(s => s.key === "jobs")?.items[0].sourceId).toBe("a");
    expect(result.work?.sections.find(s => s.key === "resources")?.items[0].sourceId).toBe("b");
    expect(result.work?.sections.find(s => s.key === "unknowns")?.items[0].sourceId).toBe("c");
  });
  const bmc = resolveSelection({ playbook_selection: { choice: "selected", reference_kind: "library_listing", library: "strategyzer_library", listing_id: "77", canonical_url: "https://platform.strategyzer.com/playbook_libraries/strategyzer_library/listings/77", title: "Competing on Business Models", project_id: "", run_id: "", reason: "", working_brief: { purpose: "", activities: "", expected_output: "" } } });
  const founder = { title: "The Student Founder", stakeholders: [{ name: "Maya Chen" }, { name: "Jordan Patel" }] };
  it("opens with team-owned starting notes quoted from the visible opening, never Scope text", () => {
    const s = starterBoard(founder, bmc)!;
    expect(s.format).toBe("business_model");
    expect(s.notes.map(n => n.key)).toEqual(["segments", "value", "resources", "unknowns"]);
    for (const n of s.notes) expect(s.text).toContain(n.text);
    const board = conversationWork([], roster, s);
    expect(board.work?.sections.flatMap(x => x.items).every(i => i.sourceId === OPENING_ID && (i as BoardNote).origin === "starter")).toBe(true);
    const light = starterBoard(founder, resolveSelection({ playbook_selection: { choice: "none", reason: "", reference_kind: "library_listing" } }))!;
    expect(light.format).toBe("light");
    expect(light.notes.map(n => n.key)).toEqual(["resources", "unknowns"]);
    const unknownLink = resolveSelection({ playbook_selection: { ...bmc, choice: "selected", reference_kind: "library_listing", library: "strategyzer_library", listing_id: "9", canonical_url: "https://platform.strategyzer.com/playbook_libraries/strategyzer_library/listings/9", title: "Team Alignment", project_id: "", run_id: "", reason: "", working_brief: { purpose: "", activities: "", expected_output: "" } } });
    expect(starterBoard(founder, unknownLink)!.format).toBe("light");
  });
  it("lets an attributed team speaker add then explicitly revise a note with a revision trail", () => {
    const s = starterBoard(founder, bmc)!;
    const add = turn("t1", "Fair point. <<add unknowns>> We still don't know whether students would pay anything for meal planning.", "Jordan Patel");
    const rev = turn("t2", "Okay, I'll narrow it. <<revise S1>> Our segment for now is first-year students living off-campus for the first time, still untested.");
    const board = conversationWork([add, rev], roster, s);
    const notes = board.work!.sections.flatMap(x => x.items) as BoardNote[];
    expect(notes.find(n => n.noteId === "N1")).toMatchObject({ sourceId: "t1", speaker: "Jordan Patel", origin: "live" });
    const s1 = notes.find(n => n.noteId === "S1")!;
    expect(s1).toMatchObject({ sourceId: "t2", speaker: "Maya Chen", text: "Our segment for now is first-year students living off-campus for the first time, still untested." });
    expect(s1.revisions?.[0]).toMatchObject({ sourceId: OPENING_ID, text: s.notes[0].text });
    expect(board.history).toHaveLength(3);
    expect(stripOps(rev.content)).not.toContain("<<");
    // Coach-authored operations, unknown speakers and question-form notes never change the board.
    for (const bad of [turn("c", rev.content, "Coach", "candidate"), turn("u", rev.content, "Stranger"), turn("q", "<<revise S1>> Is our segment first-years?")]) {
      expect((conversationWork([bad], roster, s).work!.sections.flatMap(x => x.items) as BoardNote[]).find(n => n.noteId === "S1")!.sourceId).toBe(OPENING_ID);
    }
    expect(parseOps("<<revise S1>> Short.").ops).toHaveLength(0);
  });
});
