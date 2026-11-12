import { expect, it } from "vitest";
import { followTranscript, transcriptNearBottom, newlyVisibleAsset } from "./transcript-scroll";

it("follows initial open and a coach send even when reading older messages", () => {
  expect(followTranscript(true, false, false)).toBe(true);
  expect(followTranscript(false, false, true)).toBe(true);
});
it("reveals only a new asset while following latest, not initial grids, revisions or history", () => {
  expect(newlyVisibleAsset(["S1"], ["S1", "N1"], true, false)).toBe("N1");
  expect(newlyVisibleAsset(["S1"], ["S1", "N1"], false, false)).toBeUndefined();
  expect(newlyVisibleAsset(["S1"], ["S1", "N1"], true, true)).toBeUndefined();
  expect(newlyVisibleAsset(null, ["S1"], true, false)).toBeUndefined();
  expect(newlyVisibleAsset(["S1"], ["S1"], true, false)).toBeUndefined();
});
it("preserves older-message reading on new turns unless near bottom", () => {
  expect(followTranscript(false, false, false)).toBe(false);
  expect(followTranscript(false, true, false)).toBe(true);
  expect(transcriptNearBottom(336, 800, 400)).toBe(true);
  expect(transcriptNearBottom(335, 800, 400)).toBe(false);
});