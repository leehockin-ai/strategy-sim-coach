import { it, expect } from "vitest";
import { groupSessions, isSeededTestSession } from "./session-list";
it("hides seeded test sessions", () => {
  for (const id of ["2a000000-0000-0000-0000-000000000001", "2e000000-0000-0000-0000-000000000009", "5e1a5e00-0000-0000-0000-000000000001"]) expect(isSeededTestSession(id)).toBe(true);
  expect(isSeededTestSession("8cb3f929-6fbf-4549-ac26-c3d77b0268bd")).toBe(false);
});
it("groups by scenario, most recent activity first, and hides archived", () => {
  const g = groupSessions([
    { id: "a", scenario_id: "s1", title: "One", updated_at: "2026-01-01" },
    { id: "b", scenario_id: "s2", title: "Two", updated_at: "2026-03-01" },
    { id: "c", scenario_id: "s1", title: "One", updated_at: "2026-02-01" },
    { id: "d", scenario_id: "s2", title: "Two", updated_at: "2026-04-01", archived_at: "2026-04-02" },
    { id: "2a000000-0000-0000-0000-000000000001", scenario_id: "s3", title: "Seed", updated_at: "2027-01-01" },
  ]);
  expect(g.map(x => x.key)).toEqual(["s2", "s1"]);
  expect(g[1].attempts.map(a => a.id)).toEqual(["c", "a"]);
});
