import { describe, expect, it } from "vitest";
import { assertPracticeOwner, clientSafeSource, practiceDraftSchema, practiceIntakeSchema, practiceScenario, sourceBytes, UPLOAD_LIMIT } from "./custom-scenario";
const owner = "owner";
const draft = { title: "Fictional scheduling team", brief: "A small fictional team needs to test its scheduling idea.", team: [{ name: "Alex Park", role: "Founder", description: "Provisional public role" }, { name: "Sam Lee", role: "Designer", description: "Provisional public role" }], tensions: "Speed versus learning", scope: "Explore one segment", outcome: "Decide what to test", constraints: "Two weeks", challenge: "Surface assumptions without forcing agreement" };
describe("private custom practice boundaries", () => {
  it("all private object reads and writes reject other owners", () => {
    expect(() => assertPracticeOwner(owner, "other")).toThrow("Private practice not found");
    expect(() => assertPracticeOwner(owner, owner)).not.toThrow();
  });
  it("requires explicit client-safe confirmation before AI drafting", () => {
    expect(() => practiceIntakeSchema.parse({ situation: draft.brief, complexity: "beginner", dynamics: "", outcome: "", constraints: "", clientSafe: false })).toThrow();
  });
  it("omits marked private notes before model input", () => {
    expect(clientSafeSource(`${draft.brief}\n[private]secret rubric and notes[/private]\nAssessment criteria: hidden score`)).toBe(draft.brief);
  });
  it("draft and scenario projections exclude private fields and assessment criteria", () => {
    expect(() => practiceDraftSchema.parse({ ...draft, system_prompt: "secret" })).toThrow();
    const scenario = practiceScenario(draft, "isolated");
    expect(scenario.industry).toBe("Custom practice");
    expect(scenario).not.toHaveProperty("system_prompt");
    expect(scenario.stakeholders[0]).not.toHaveProperty("posture");
  });
  it("accepts supported text transcripts and validates contents", () => {
    expect(sourceBytes({ name: "transcript.vtt", type: "text/vtt", base64: btoa(draft.brief) }).pdf).toBe(false);
    expect(() => sourceBytes({ name: "document.pdf", type: "application/pdf", base64: btoa(draft.brief) })).toThrow("contents");
    expect(() => sourceBytes({ name: "audio.mp3", type: "audio/mpeg", base64: btoa(draft.brief) })).toThrow("not supported");
  });
  it("limits raw uploads to 4 MB", () => {
    expect(UPLOAD_LIMIT).toBe(4 * 1024 * 1024);
    expect(() => sourceBytes({ name: "oversize.txt", type: "text/plain", base64: btoa("a".repeat(UPLOAD_LIMIT + 1)) })).toThrow();
  });
});