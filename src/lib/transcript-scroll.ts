/** Follow only initial hydration, a coach send, or new turns while already near the end. */
export function followTranscript(initial: boolean, nearBottom: boolean, coachSent: boolean) {
  return initial || nearBottom || coachSent;
}
export function transcriptNearBottom(scrollTop: number, scrollHeight: number, clientHeight: number) {
  return scrollHeight - clientHeight - scrollTop <= 64;
}

/** Reveal an actual addition, never a revision, initial grid or historical snapshot. */
export function newlyVisibleAsset(previous: string[] | null, current: string[], following: boolean, historical: boolean) {
  if (!previous || !following || historical) return undefined;
  return current.find(id => !previous.includes(id));
}