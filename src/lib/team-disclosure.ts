import type { TeamConfig, RoomState } from "./live-team";

// The response generator never receives unavailable private evidence.
// Authorization is a separate semantic assessment, not a claim made by that generator.
export function disclosedConfig(config: TeamConfig, room: RoomState, authorized: string[]): TeamConfig {
  const allowed = new Set([...room.surfaced, ...authorized]);
  return { ...config, truth: { ...config.truth, evidence: config.truth.evidence.filter(e => allowed.has(e.id)) } };
}

export function validDisclosures(raw: unknown, config: TeamConfig): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((id): id is string => typeof id === "string" && config.truth.evidence.some(e => e.id === id)))];
}