import type { LiveEvidence, LiveRunEvidence } from "./evaluation-live-evidence";
import { hasRecordedSkip } from "./chapter2-progress";
import { BRIEF_FIELDS } from "./scope-brief";
import type { RoomUnavailableReason } from "./working-session";

// Chapter 3 "Advance the Outcome" summary. Pure and presentation-only: it reads the
// same bounded public evidence the assessment uses, never private simulation state,
// and never writes, infers or completes a client outcome.

export type Disposition =
  | { kind: "after_synthesis"; at: string }
  | { kind: "early_stop"; at: string; rationale: string }
  | { kind: "unspecified"; at: string }
  | { kind: "skipped"; at: string | null; reason: string; roomUnavailable: boolean }
  | { kind: "unavailable" }
  | { kind: "not_concluded" }
  | { kind: "no_room" };

export type Chapter3Summary = {
  disposition: Disposition;
  outcome:
    | { status: "bound"; revision: number; success: string; decision: string; decisionMaker: string; assumptions: string; laterRevisions: number }
    | { status: "bound_empty"; revision: number; laterRevisions: number }
    | { status: "unbound" }
    | { status: "none" };
  teamStatements: { id: string; speaker: string; text: string; timestamp: string }[];
  coachStatementCount: number;
  wall: { revision: number; timestamp: string; sections: { label: string; items: { text: string; speaker: string; sourceId: string }[] }[]; emptySections: string[] } | null;
  gaps: string[];
  truncated: boolean;
};

type Input = {
  evidence: LiveEvidence;
  skip: unknown;
  roomUnavailable: RoomUnavailableReason | null;
  latestScopeRevision: number | null;
};

const latestRun = (e: LiveEvidence): LiveRunEvidence | null =>
  [...e.runs].sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0] ?? null;

export function buildChapter3Summary({ evidence, skip, roomUnavailable, latestScopeRevision }: Input): Chapter3Summary {
  const run = latestRun(evidence);
  const conclusion = run?.moments.filter(m => m.kind === "conclusion").at(-1);
  let disposition: Disposition;
  if (conclusion) {
    const mode = conclusion.conclusionType ?? "unspecified";
    disposition = mode === "early_stop" ? { kind: "early_stop", at: conclusion.timestamp, rationale: conclusion.text }
      : mode === "after_synthesis" ? { kind: "after_synthesis", at: conclusion.timestamp }
      : { kind: "unspecified", at: conclusion.timestamp };
  } else if (hasRecordedSkip(skip)) {
    const s = skip as { reason: string; recorded_at?: unknown };
    disposition = { kind: "skipped", reason: s.reason, at: typeof s.recorded_at === "string" ? s.recorded_at : null, roomUnavailable: !!roomUnavailable };
  } else if (roomUnavailable) disposition = { kind: "unavailable" };
  else if (run) disposition = { kind: "not_concluded" };
  else disposition = { kind: "no_room" };

  // Outcome comes ONLY from the Engagement Brief revision bound to the room. Never
  // substitute the current brief: that would relabel what the room worked toward.
  let outcome: Chapter3Summary["outcome"] = { status: run ? "unbound" : "none" };
  if (run?.scope) {
    const b = run.scope.brief;
    const laterRevisions = latestScopeRevision != null ? Math.max(0, latestScopeRevision - run.scope.revision) : 0;
    outcome = b.success.trim() || b.decision_to_enable.trim()
      ? { status: "bound", revision: run.scope.revision, success: b.success, decision: b.decision_to_enable, decisionMaker: b.decision_maker, assumptions: b.assumptions, laterRevisions }
      : { status: "bound_empty", revision: run.scope.revision, laterRevisions };
  }

  const latest = run?.revisions.at(-1);
  const wall = latest ? {
    revision: latest.revision,
    timestamp: latest.timestamp,
    sections: latest.work.sections.filter(s => s.items.length).map(s => ({ label: s.label, items: s.items.map(i => ({ text: i.text, speaker: i.speaker, sourceId: i.sourceId })) })),
    emptySections: latest.emptySections,
  } : null;

  return {
    disposition,
    outcome,
    teamStatements: (run?.moments ?? []).filter(m => m.kind === "team").map(m => ({ id: m.id, speaker: m.speaker, text: m.text, timestamp: m.timestamp })),
    coachStatementCount: (run?.moments ?? []).filter(m => m.kind === "coach").length,
    wall,
    gaps: run?.gaps ?? [],
    truncated: !!run?.truncated,
  };
}

export const ASSUMPTIONS_LABEL = BRIEF_FIELDS.find(f => f.key === "assumptions")!.label;
