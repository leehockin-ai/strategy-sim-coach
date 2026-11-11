import { PILOT_ID, type PilotState } from "./beginner-pilot";
export const pilotStorageKey = (ownerId: string) =>
  `coach-compass:local-preview:${PILOT_ID}:${ownerId}`;
export function readPilot(storage: Pick<Storage, "getItem">, ownerId: string): PilotState | null {
  const raw = storage.getItem(pilotStorageKey(ownerId));
  if (!raw) return null;
  const value = JSON.parse(raw) as PilotState;
  if (value.ownerId !== ownerId || value.version !== PILOT_ID)
    throw new Error("Invalid preview pilot identity.");
  return value;
}
export function writePilot(storage: Pick<Storage, "setItem">, ownerId: string, state: PilotState) {
  if (state.ownerId !== ownerId || state.version !== PILOT_ID) throw new Error("Forbidden");
  storage.setItem(pilotStorageKey(ownerId), JSON.stringify(state));
}
export async function mutatePilot(
  ownerId: string,
  fn: (state: PilotState) => PilotState,
): Promise<PilotState> {
  if (!navigator.locks)
    throw new Error(
      "This browser cannot safely lock local preview storage. Use a current browser.",
    );
  return navigator.locks.request(pilotStorageKey(ownerId), () => {
    const current = readPilot(localStorage, ownerId);
    if (!current) throw new Error("Start a preview pilot first.");
    const next = fn(current);
    writePilot(localStorage, ownerId, next);
    return next;
  });
}
