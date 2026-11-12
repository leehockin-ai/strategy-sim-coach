import { expect, it } from "vitest";
import { followTranscript, transcriptNearBottom } from "./transcript-scroll";

it("follows initial open and a coach send even when reading older messages", () => {
  expect(followTranscript(true, false, false)).toBe(true);
  expect(followTranscript(false, false, true)).toBe(true);
});
it("preserves older-message reading on new turns unless near bottom", () => {
  expect(followTranscript(false, false, false)).toBe(false);
  expect(followTranscript(false, true, false)).toBe(true);
  expect(transcriptNearBottom(336, 800, 400)).toBe(true);
  expect(transcriptNearBottom(335, 800, 400)).toBe(false);
});