import { describe, expect, it } from "vitest";
import { identityColor, identityInitials, resolveIdentity } from "./participant-identity";

describe("participant identity", () => {
  it("is deterministic and stable across calls", () => {
    expect(identityColor("Maya Chen")).toBe(identityColor("Maya Chen"));
    expect(resolveIdentity({ name: "Maya Chen" })).toEqual(resolveIdentity({ name: "Maya Chen" }));
  });

  it("derives initials from first and last name parts", () => {
    expect(identityInitials("Maya Chen")).toBe("MC");
    expect(identityInitials("Sofia Ramirez")).toBe("SR");
    expect(identityInitials("Jordan")).toBe("JO");
    expect(identityInitials("  ")).toBe("?");
  });

  it("gives different people different identities without any fixed roster", () => {
    const a = resolveIdentity({ name: "Alex Rivera", role: "CEO" });
    const b = resolveIdentity({ name: "Priya Nair", role: "CTO" });
    expect(a.initials).not.toBe(b.initials);
    expect(a.role).toBe("CEO");
    expect(b.role).toBe("CTO");
  });

  it("uses a configured portrait when present and falls back gracefully", () => {
    const withPortrait = resolveIdentity({ name: "A B", portrait: "https://example.com/p.png" });
    expect(withPortrait.portrait).toBe("https://example.com/p.png");
    const without = resolveIdentity({ name: "A B" });
    expect(without.portrait).toBeUndefined();
    expect(without.initials).toBe("AB");
    expect(without.color).toMatch(/^#/);
  });
});
