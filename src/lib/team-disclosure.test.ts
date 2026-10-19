import { describe, it, expect } from "vitest";
import { disclosedConfig, validDisclosures } from "./team-disclosure";
import type { TeamConfig } from "./live-team";
const config = { participants: [], truth: { evidence: [{ id: "poll", holder: "Jordan", reality: "PRIVATE forty respondents" }, { id: "walk", holder: "Sofia", reality: "PRIVATE behaviour" }], shared: [], assumptions: [], tangents: [] } } as unknown as TeamConfig;
const room = { participants: {}, surfaced: [], turn: 0 };
describe("private disclosure boundary", () => {
  it("excludes unavailable private knowledge from response generation", () => {
    expect(JSON.stringify(disclosedConfig(config, room, []))).not.toContain("PRIVATE");
  });
  it("only supplies separately authorized evidence, not another holder's knowledge", () => {
    const text = JSON.stringify(disclosedConfig(config, room, ["poll"]));
    expect(text).toContain("PRIVATE forty respondents");
    expect(text).not.toContain("PRIVATE behaviour");
  });
  it("retains evidence already legitimately surfaced", () => {
    expect(disclosedConfig(config, { ...room, surfaced: ["walk"] }, []).truth.evidence.map(e => e.id)).toEqual(["walk"]);
  });
  it("does not authorize invented evidence ids or invalid classifier output", () => {
    expect(validDisclosures(["poll", "invented", "poll", 4], config)).toEqual(["poll"]);
    expect(validDisclosures({}, config)).toEqual([]);
  });
});