// Presentation-only grouping. The underlying session.status values are unchanged
// in the database — this file just tells the UI how to group steps into chapters
// and which sub-tabs to render within each chapter.

export type ChapterKey = "scope" | "apply" | "progress";

export type StepKey =
  | "framing"
  | "coaching_approach"
  | "stakeholder_workspace"
  | "live_playbook"
  | "next_step_judgment"
  | "engagement_orchestration";

export const CHAPTERS: Array<{
  key: ChapterKey;
  index: 1 | 2 | 3;
  label: string;
  descriptor: string;
  steps: StepKey[];
}> = [
  {
    key: "scope",
    index: 1,
    label: "Scope the engagement",
    descriptor: "Understand the client, frame the real challenge, identify the decision to enable, and recommend a Strategyzer intervention.",
    steps: ["framing", "stakeholder_workspace", "coaching_approach"],
  },
  {
    key: "apply",
    index: 2,
    label: "Apply the Playbook",
    descriptor: "Facilitate a Strategyzer Playbook activity with the team. Ask questions, redirect solution-jumping, and produce meaningful — not necessarily complete — output.",
    steps: ["live_playbook"],
  },
  {
    key: "progress",
    index: 3,
    label: "Progress the engagement",
    descriptor: "Interpret what emerged, decide what the client can now know or decide, and recommend the smallest responsible next move.",
    steps: ["next_step_judgment", "engagement_orchestration"],
  },
];

export function stepFromStatus(status: string | null | undefined): StepKey {
  const s = (status ?? "framing").toLowerCase();
  if (s === "framing") return "framing";
  if (s === "method" || s === "methodology" || s === "coaching_approach") return "coaching_approach";
  if (s === "dialogue" || s === "stakeholder_workspace") return "stakeholder_workspace";
  if (s === "working_session" || s === "live_playbook" || s === "application") return "live_playbook";
  if (s === "intervention" || s === "next_step_judgment") return "next_step_judgment";
  if (s === "engagement_orchestration" || s === "playbook") return "engagement_orchestration";
  if (["evaluated", "approved", "conditional", "not_approved", "retry", "escalated"].includes(s)) {
    return "engagement_orchestration";
  }
  return "framing";
}

export function chapterForStep(step: StepKey): ChapterKey {
  for (const ch of CHAPTERS) if (ch.steps.includes(step)) return ch.key;
  return "scope";
}

export function chapterMeta(key: ChapterKey) {
  return CHAPTERS.find((c) => c.key === key)!;
}

export const STEP_LABELS: Record<StepKey, string> = {
  framing: "Framing",
  stakeholder_workspace: "Stakeholders",
  coaching_approach: "Approach",
  live_playbook: "Live Playbook",
  next_step_judgment: "Judgment",
  engagement_orchestration: "Orchestration",
};

// The status value to persist when the coach crosses INTO a chapter.
// Chosen so stepFromStatus() will correctly place them there.
export const CHAPTER_ENTRY_STATUS: Record<ChapterKey, string> = {
  scope: "framing",
  apply: "working_session",
  progress: "intervention",
};
