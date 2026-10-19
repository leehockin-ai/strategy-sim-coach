import { describe, expect, it } from "vitest";
import { customerProfileWork, readTeamWork, sanitizeWork } from "./team-work";
const sources = [{ id: "team:1", speaker: "Maya", text: "Students want AI recommendations. We have not tested that.", kind: "team" as const }];
const proposal = (quote: string, source_id = "team:1") => ({ status: "partial", sections: [{ key: "gains", label: "Gains", items: [{ source_id, quote }] }] });
describe("team-owned simulated work", () => {
  it("does not put candidate prescriptions into team work unless the team adopts them", () => {
    expect(sanitizeWork(proposal("Students want AI recommendations."), [{ ...sources[0], kind: "coach" }])?.sections[0].items).toEqual([]);
  });
  it("cannot manufacture hidden evidence without a public source", () => {
    expect(sanitizeWork(proposal("SECRET poll of 40 international postgraduates"), sources)?.sections[0].items).toEqual([]);
  });
  it("rejects references to an uninvolved participant", () => {
    expect(sanitizeWork(proposal("Students want AI recommendations.", "Jordan:private"), sources)?.sections[0].items).toEqual([]);
  });
  it("preserves team language rather than silently correcting a feature-shaped gain", () => {
    expect(sanitizeWork(proposal("Students want AI recommendations."), sources)?.sections[0].items[0].text).toBe("Students want AI recommendations.");
  });
  it("provenance can never be verified Strategyzer state", () => {
    expect(sanitizeWork(proposal("We have not tested that."), sources)?.provenance).toBe("simulated_client_team");
    expect(readTeamWork({ provenance: "strategyzer_verified" })).toBeNull();
  });
  it("supports intentional incompleteness without completing missing sections", () => {
    const work = customerProfileWork({ ...proposal("We have not tested that."), status: "stopped_intentionally" }, sources);
    expect(work?.status).toBe("stopped_intentionally");
    expect(work?.sections.find(s => s.key === "jobs")?.items).toEqual([]);
  });
  it("strips untrusted labels and refuses private annotations in public work", () => {
    const work = customerProfileWork({ ...proposal("We have not tested that."), sections: [{ ...proposal("We have not tested that.").sections[0], label: "PRIVATE REASONING" }] }, sources);
    expect(work?.sections[3].label).toBe("Gains");
    expect(sanitizeWork({ ...proposal("We have not tested that."), private: "secret" }, sources)).toBeNull();
  });
});