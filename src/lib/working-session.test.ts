import { describe, expect, it } from "vitest";
import { boundScopeOutcome, roomEligibility } from "./working-session";

describe("restricted working session", () => {
  it("keeps the Customer Profile POC restricted to allowlisted test sessions", () => {
    expect(roomEligibility({ poc: true, methodology_approved: false }, false)).toBe("poc_not_allowlisted");
    expect(roomEligibility({ poc: true, methodology_approved: false }, true)).toBeNull();
  });
  it("never fabricates a room for absent configuration", () => {
    expect(roomEligibility(null, true)).toBe("configuration_missing");
  });
  it("denies unapproved ordinary simulation content", () => {
    expect(roomEligibility({ poc: false, methodology_approved: false }, true)).toBe("content_unapproved");
  });
  it("reads the bound Scope snapshot wrapper rather than a later brief", () => {
    const bound = { revision: 2, snapshot: { engagement_brief: { success: "Decide whether to research the customer", decision_to_enable: "Fund interviews", decision_maker: "Maya" } } };
    expect(boundScopeOutcome(bound)).toEqual({ revision: 2, success: "Decide whether to research the customer", decision_to_enable: "Fund interviews", decision_maker: "Maya" });
  });
  it("does not substitute current Scope when bound evidence is missing", () => {
    expect(boundScopeOutcome(null)).toEqual({ revision: null, success: "", decision_to_enable: "", decision_maker: "" });
  });
});
import { chapter2Surface } from "./working-session";
describe("chapter2Surface", () => {
  it("a saved Scope playbook always uses the in-app session, even with allowlist and stale external runs", () => {
    expect(chapter2Surface({ scopeChoice: "selected", testAllowed: true })).toBe("in_app");
    expect(chapter2Surface({ scopeChoice: "selected", testAllowed: false })).toBe("in_app");
  });
  it("none and defer stay in-app even for allowlisted sessions", () => {
    expect(chapter2Surface({ scopeChoice: "none", testAllowed: true })).toBe("in_app");
    expect(chapter2Surface({ scopeChoice: "defer", testAllowed: true })).toBe("in_app");
  });
  it("external test room only for allowlisted sessions with no Scope decision", () => {
    expect(chapter2Surface({ scopeChoice: "undecided", testAllowed: true })).toBe("external_test_room");
    expect(chapter2Surface({ scopeChoice: "undecided", testAllowed: false })).toBe("in_app");
  });
});
