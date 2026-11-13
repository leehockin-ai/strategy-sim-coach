import { expect, test } from "vitest";
import { buildSelection, playbookSelectionSchema, resolveSelection, LIBRARY_BROWSE_URL } from "./playbook-selection";

test("a catalog playbook can be chosen without pasting a link or typing a title", () => {
  const sel = buildSelection({ choice: "selected", catalogSlug: "idea_generation", title: "Idea Generation", reason: "Team is ready" });
  expect(playbookSelectionSchema.safeParse(sel).success).toBe(true);
  const r = resolveSelection({ playbook_selection: sel });
  expect(r.kind).toBe("selected");
  if (r.kind === "selected") { expect(r.title).toBe("Idea Generation"); expect(r.url).toBe(LIBRARY_BROWSE_URL); expect(r.reason).toBe("Team is ready"); }
});

test("an optional run link is kept with the catalog playbook", () => {
  const url = "https://platform.strategyzer.com/projects/p/abc/dashboard/playbook_runs/run9";
  const sel = buildSelection({ choice: "selected", catalogSlug: "idea_generation", title: "Idea Generation", url });
  const r = resolveSelection({ playbook_selection: playbookSelectionSchema.parse(sel) });
  expect(r.kind === "selected" && r.runId).toBe("run9");
});

test("a selection without a catalog playbook still requires a valid link", () => {
  expect(playbookSelectionSchema.safeParse(buildSelection({ choice: "selected", title: "X" })).success).toBe(false);
});

test("older saved choices without the catalog field still read back", () => {
  const legacy = { choice: "selected", library: "strategyzer_library", listing_id: "18", canonical_url: `${LIBRARY_BROWSE_URL}/listings/18`, title: "Map out your customer profile with AI", reference_kind: "library_listing", project_id: "", run_id: "", reason: "r", working_brief: { purpose: "", activities: "", expected_output: "" } };
  const r = resolveSelection({ playbook_selection: legacy });
  expect(r.kind === "selected" && r.listingId).toBe("18");
});
