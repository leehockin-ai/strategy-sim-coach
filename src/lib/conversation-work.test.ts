import { describe, expect, it } from "vitest";
import { conversationWork, teamOpening, type ConversationMessage } from "./conversation-work";
const roster = ["Maya Chen", "Jordan Patel", "Sofia Ramirez"];
const turn = (id: string, content: string, speaker = "Maya Chen", role = "stakeholder"): ConversationMessage => ({ id, phase: "playbook:selection:v1", role, content, stakeholder_name: speaker });
describe("read-only conversation notes", () => {
  it("extracts job, assumption and BMC resource only from exact attributed team quotes", () => {
    const messages = [turn("job", "The customer job is to plan affordable meals."), turn("assumption", "Our assumption is that students want AI recommendations."), turn("resource", "Our key resources are the prototype and our developer.", "Jordan Patel"), turn("coach", "Our key resources are unlimited funding.", "Coach", "candidate"), turn("stranger", "Pain: cooking takes too long.", "Unknown"), turn("chat", "Thanks, I agree."), turn("question", "Should we list a customer job?")];
    const result = conversationWork(messages, roster);
    expect(result.work?.sections.find(s => s.key === "jobs")?.items).toEqual([{ text: messages[0].content, sourceId: "job", speaker: "Maya Chen" }]);
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
  it("uses the current scenario roster for stable view-only openings in all four environments", () => {
    for (const [title, name] of [["The Student Founder", "Maya Chen"], ["The Distant Sponsor", "Priya Shah"], ["The Solution Factory", "Jordan Park"], ["The Confident Executive", "Dr. Eleanor Voss"]]) {
      const scenario = { title, stakeholders: [{ name }] };
      expect(teamOpening(scenario, "Choose a segment")?.speaker).toBe(name);
      expect(teamOpening(scenario, "Choose a segment")).toEqual(teamOpening(scenario, "Choose a segment"));
      expect(teamOpening(scenario, "Choose a segment")?.text).toContain("Choose a segment");
    }
    expect(teamOpening({})).toBeNull();
  });
});