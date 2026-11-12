import { expect, it, vi } from "vitest";
import { continueScenarioOnce } from "./scenario-launch";

it("repeated Continue calls while starting create only one launch", async () => {
  const lock = { current: false };
  let finish: (result: boolean) => void = () => {};
  const launch = vi.fn(() => new Promise<boolean>(resolve => { finish = resolve; }));
  const first = continueScenarioOnce(lock, launch);
  expect(await continueScenarioOnce(lock, launch)).toBeUndefined();
  expect(await continueScenarioOnce(lock, launch)).toBeUndefined();
  expect(launch).toHaveBeenCalledTimes(1);
  finish(true); expect(await first).toBe(true); expect(lock.current).toBe(false);
});
it("failed launch releases the guard so the retained draft can retry", async () => {
  const lock = { current: false };
  await expect(continueScenarioOnce(lock, async () => { throw Error("synthetic failure"); })).rejects.toThrow("synthetic failure");
  expect(await continueScenarioOnce(lock, async () => true)).toBe(true);
  expect(lock.current).toBe(false);
});