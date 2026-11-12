/** Synchronous lock covers repeated clicks before React paints pending state. */
export async function continueScenarioOnce(lock: { current: boolean }, launch: () => Promise<boolean>): Promise<boolean | undefined> {
  if (lock.current) return undefined;
  lock.current = true;
  try { return await launch(); }
  finally { lock.current = false; }
}