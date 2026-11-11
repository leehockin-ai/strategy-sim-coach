import { expect, it } from "vitest";
import {
  newPilot,
  claimCheckpoint,
  beginMeetingOne,
  saveScope,
  handoff,
  completeCheckpoint,
} from "./beginner-pilot";
import { readPilot, writePilot } from "./beginner-pilot-storage";
const memory = () => {
  const values = new Map<string, string>();
  return {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => {
      values.set(k, v);
    },
  };
};
it("reload retains exact local Scope and immutable checkpoint input", () => {
  const store = memory();
  let s = handoff(
    beginMeetingOne(
      saveScope(newPilot("owner"), { success: "Choose one segment" }, "defer", "Evidence first"),
    ),
    "Agree another evidence round.",
  );
  writePilot(store, "owner", s);
  const loaded = readPilot(store, "owner");
  expect(loaded).toEqual(s);
  s = claimCheckpoint(s, "token", 10);
  writePilot(store, "owner", s);
  expect(readPilot(store, "owner")?.checkpoint?.token).toBe("token");
});
it("local owner cannot read or write another owner's pilot", () => {
  const store = memory();
  const s = newPilot("owner");
  expect(() => writePilot(store, "other", s)).toThrow("Forbidden");
  writePilot(store, "owner", s);
  expect(readPilot(store, "other")).toBeNull();
});
it("expired claims recover without replacing the checkpoint identity or input", () => {
  let s = handoff(
    beginMeetingOne(saveScope(newPilot("owner"), {}, "defer", "Evidence first")),
    "Agree another evidence round.",
  );
  const checkpoint = s.checkpoint;
  s = claimCheckpoint(s, "one", 1);
  const resumed = claimCheckpoint(s, "two", 300002);
  expect(resumed.checkpoint?.id).toBe(checkpoint?.id);
  expect(resumed.checkpoint?.input).toEqual(checkpoint?.input);
  expect(() => completeCheckpoint(resumed, "one", {})).toThrow("Checkpoint claim expired.");
});
