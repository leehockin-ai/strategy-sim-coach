// Live Client Team (Stage 5 POC). Pure helpers shared by server orchestration and tests.
// Private participant/evidence data never leaves the server; only publicTeamConfig output reaches candidates.

export type Level = "low" | "medium" | "high";
export type ParticipantState = { engagement: Level; trust: Level; defensiveness: Level; willingness_to_contribute: Level; note?: string };
export type TeamParticipant = { name: string; role: string; visible: string; tendency: string; personality: string; beliefs: string[]; initial: ParticipantState };
export type EvidenceItem = { id: string; holder: string; kind: string; claim: string; reality: string; reveal_when: string };
export type TeamTruth = { shared: string[]; evidence: EvidenceItem[]; assumptions: { id: string; holder: string; statement: string; status: string }[]; misconceptions: string[]; uncertainties: string[]; tangents: { holder: string; topic: string }[] };
export type TeamConfig = { id: string; version: number; title: string; exercise_label: string; expected_duration_minutes: number; instructions: string; activity_steps: unknown; participants: TeamParticipant[]; truth: TeamTruth; poc: boolean; methodology_approved: boolean };
export type RoomState = { participants: Record<string, ParticipantState>; surfaced: string[]; turn: number };

export function publicTeamConfig(c: TeamConfig) {
  return {
    id: c.id, version: c.version, title: c.title, exerciseLabel: c.exercise_label, expectedDurationMinutes: c.expected_duration_minutes,
    instructions: c.instructions, steps: Array.isArray(c.activity_steps) ? (c.activity_steps as string[]) : [], poc: c.poc, approved: c.methodology_approved,
    participants: c.participants.map(p => ({ name: p.name, role: p.role, visible: p.visible })),
  };
}

const LEVELS: Level[] = ["low", "medium", "high"];
const lvl = (v: unknown, fallback: Level): Level => (LEVELS.includes(v as Level) ? (v as Level) : fallback);

export function initialRoom(c: TeamConfig, prior: Record<string, Partial<ParticipantState>>): RoomState {
  const participants: Record<string, ParticipantState> = {};
  for (const p of c.participants) {
    const pr = prior[p.name] ?? {};
    participants[p.name] = { ...p.initial, trust: lvl(pr.trust, p.initial.trust) };
  }
  return { participants, surfaced: [], turn: 0 };
}

export type RawTurn = {
  coach_act?: string; responses?: { participant?: string; text?: string }[];
  state?: Record<string, Partial<ParticipantState>>;
  surfaced?: { evidence_id?: string; by?: string; reason?: string }[];
  assumptions_reinforced?: string[]; assumptions_challenged?: string[]; reasoning?: string;
};

// Enforces simulation invariants regardless of what the model returns.
export function sanitizeTurn(raw: RawTurn, c: TeamConfig, room: RoomState) {
  const names = new Set(c.participants.map(p => p.name));
  const responses = (raw.responses ?? [])
    .filter(r => r.participant && names.has(r.participant) && typeof r.text === "string" && r.text.trim())
    .slice(0, 3)
    .flatMap(r => typeof r.participant === "string" && typeof r.text === "string" ? [{ participant: r.participant, text: r.text.trim().slice(0, 900) }] : []);
  const spoke = new Set(responses.map(r => r.participant));
  const surfaced = (raw.surfaced ?? []).filter(s => {
    const item = c.truth.evidence.find(e => e.id === s.evidence_id);
    // Evidence can only surface through its holder actually speaking this turn, and only once.
    return item && item.holder === s.by && spoke.has(item.holder) && !room.surfaced.includes(item.id);
  }).flatMap(s => typeof s.evidence_id === "string" && typeof s.by === "string" ? [{ evidence_id: s.evidence_id, by: s.by, reason: (s.reason ?? "").slice(0, 500) }] : []);
  const participants: Record<string, ParticipantState> = {};
  for (const [name, prev] of Object.entries(room.participants)) {
    const u = raw.state?.[name] ?? {};
    participants[name] = { engagement: lvl(u.engagement, prev.engagement), trust: lvl(u.trust, prev.trust), defensiveness: lvl(u.defensiveness, prev.defensiveness), willingness_to_contribute: lvl(u.willingness_to_contribute, prev.willingness_to_contribute), note: typeof u.note === "string" ? u.note.slice(0, 300) : prev.note };
  }
  const changes = Object.keys(participants).filter(n => JSON.stringify({ ...participants[n], note: undefined }) !== JSON.stringify({ ...room.participants[n], note: undefined }));
  const next: RoomState = { participants, surfaced: [...room.surfaced, ...surfaced.map(s => s.evidence_id)], turn: room.turn + 1 };
  return { responses, surfaced, next, changes, coachAct: (raw.coach_act ?? "unclassified").slice(0, 60), reinforced: raw.assumptions_reinforced ?? [], challenged: raw.assumptions_challenged ?? [], reasoning: (raw.reasoning ?? "").slice(0, 1500) };
}

export type PublicEvent = { event_type: string; actor_type: string; metadata: unknown };
export function roomPhase(events: PublicEvent[]): "not_started" | "working" | "synthesis" | "concluded" {
  const kinds = events.filter(e => e.actor_type === "system" || e.event_type === "decision").map(e => (e.metadata as { team_kind?: string } | null)?.team_kind);
  if (kinds.includes("concluded")) return "concluded";
  if (kinds.includes("synthesis_started")) return "synthesis";
  if (kinds.includes("session_started")) return "working";
  return "not_started";
}
