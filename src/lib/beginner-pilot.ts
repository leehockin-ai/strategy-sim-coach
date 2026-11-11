import { z } from "zod";
import { readEngagementBrief, engagementBriefSchema } from "./scope-brief";
import { customerProfileSections, type TeamWork } from "./team-work";
import { SECTION_KEYS, type AssessmentJob } from "./assessment-job";

export const PILOT_ID = "shiftnest-customer-profile-v1";
export const PILOT_PLAYBOOK_URL =
  "https://platform.strategyzer.com/playbook_libraries/strategyzer_library/listings/18";
export const PILOT_PEOPLE = [
  { name: "Alex Morgan", role: "Founder" },
  { name: "Sam Okafor", role: "Research lead" },
  { name: "Riley Park", role: "Operations lead" },
];
export const PILOT_CASE =
  "ShiftNest is exploring meal coordination for people working changing shifts. The team mixes individual rotating-shift workers with household members coordinating meals. It has five days and six staff-hours before deciding whose needs to investigate next. Its rough Customer Profile is a set of assumptions, not validated findings.";
export const PILOT_ASSESSMENT_RULES =
  "App-generated fictional client homework is assessment STIMULUS, not candidate-authored work, AI assistance sought by the candidate, validated research or Strategyzer state. Never score its polish, completeness or correctness as candidate competence. Customer Profile only: no Value Map requirement. Judge actual coach questioning, client ownership, distinction between simulated reports and assumptions, reasoning about contradictions/unresolved issues and next intervention. Justified restraint or deferring the tool earns neither an automatic penalty nor free credit. Blank optional commitments notes alone prove nothing; assess actual client-owned next steps when observed. Preserve the existing nine rubric definitions and thresholds. Human reviewers retain final authority. Browser-local pilot evidence is not tamper-proof and never certifies anyone.";
const short = z.string().max(4000);
export const pilotEventSchema = z
  .object({
    id: z.string().uuid(),
    meeting: z.enum(["scope", "one", "two", "advance"]),
    actor: z.enum(["coach", "team", "system"]),
    speaker: short,
    text: short,
    at: z.string(),
  })
  .strict();
export type PilotEvent = z.infer<typeof pilotEventSchema>;
export const profileItemSchema = z
  .object({
    id: short,
    category: z.enum(["customer", "jobs", "pains", "gains", "unknowns"]),
    text: short,
    speaker: short,
    sourceId: short,
  })
  .strict();
export type ProfileItem = z.infer<typeof profileItemSchema>;
export const updateSchema = z
  .object({
    summary: z.string(),
    actions: z.array(
      z
        .object({
          participant: z.string(),
          description: z.string(),
          agreementSourceIds: z.array(z.string()),
          basis: z.enum(["team_agreed", "team_initiated", "not_done"]),
        })
        .strict(),
    ),
    evidence: z.array(
      z
        .object({
          id: z.string(),
          participant: z.string(),
          report: z.string(),
          limitation: z.string(),
          kind: z.enum(["supporting", "contradictory", "missing"]),
        })
        .strict(),
    ),
    changes: z.array(
      z
        .object({
          operation: z.enum(["add", "revise", "remove"]),
          targetId: z.string().nullable(),
          category: z.enum(["customer", "jobs", "pains", "gains", "unknowns"]),
          proposal: z.string(),
          participant: z.string(),
          evidenceIds: z.array(z.string()),
          reason: z.string(),
        })
        .strict(),
    ),
    openQuestions: z.array(z.string()),
  })
  .strict();
export type ClientUpdate = z.infer<typeof updateSchema>;
export const turnSchema = z
  .object({
    responses: z.array(z.object({ participant: z.string(), text: z.string() }).strict()),
    work: z
      .object({
        status: z.enum(["complete", "partial", "revised", "unresolved", "stopped_intentionally"]),
        sections: z.array(
          z
            .object({
              key: z.string(),
              label: z.string(),
              items: z.array(z.object({ source_id: z.string(), quote: z.string() }).strict()),
            })
            .strict(),
        ),
      })
      .strict()
      .nullable(),
  })
  .strict();
export type PilotPhase = "scope" | "one" | "handoff" | "two" | "advance" | "stopped";
export type PilotCheckpoint = {
  id: string;
  status: "pending" | "running" | "failed" | "ready";
  input: {
    scopeId: string;
    brief: ReturnType<typeof readEngagementBrief>;
    events: PilotEvent[];
    profile: ProfileItem[];
    work: TeamWork | null;
    rationale: string;
    approach: string;
  };
  update: ClientUpdate | null;
  leaseUntil: number;
  token: string | null;
  error: string | null;
  seenAt: string | null;
  attempts: number;
  retryAt: number;
  blocked: boolean;
};
export type PilotState = {
  id: string;
  ownerId: string;
  version: typeof PILOT_ID;
  createdAt: string;
  phase: PilotPhase;
  brief: ReturnType<typeof readEngagementBrief>;
  scopes: {
    id: string;
    revision: number;
    brief: ReturnType<typeof readEngagementBrief>;
    at: string;
  }[];
  boundScopeId: string | null;
  approach: string;
  rationale: string;
  events: PilotEvent[];
  work: TeamWork | null;
  history: { revision: number; work: TeamWork }[];
  checkpoint: PilotCheckpoint | null;
  nextMove: string;
  advanceNotes?: Record<string, string>;
  assessment: AssessmentJob | null;
  assessmentInput: PilotState | null;
  report: Record<string, unknown> | null;
  pendingTurn: { key: string; text: string; meeting: PilotEvent["meeting"] } | null;
};
export function newPilot(ownerId: string): PilotState {
  return {
    id: crypto.randomUUID(),
    ownerId,
    version: PILOT_ID,
    createdAt: new Date().toISOString(),
    phase: "scope",
    brief: readEngagementBrief({}),
    scopes: [],
    boundScopeId: null,
    approach: "",
    rationale: "",
    events: [],
    work: null,
    history: [],
    checkpoint: null,
    nextMove: "",
    assessment: null,
    assessmentInput: null,
    report: null,
    pendingTurn: null,
  };
}
export function event(
  meeting: PilotEvent["meeting"],
  actor: PilotEvent["actor"],
  speaker: string,
  text: string,
): PilotEvent {
  return { id: crypto.randomUUID(), meeting, actor, speaker, text, at: new Date().toISOString() };
}
export const INITIAL_PROFILE: ProfileItem[] = [
  {
    id: "focus",
    category: "customer",
    text: "Our customer is shift workers and their households — assumption.",
    speaker: "Alex Morgan",
    sourceId: "initial:alex",
  },
  {
    id: "job",
    category: "jobs",
    text: "Arrange a meal around a changing shift — assumption.",
    speaker: "Sam Okafor",
    sourceId: "initial:sam",
  },
  {
    id: "pain",
    category: "pains",
    text: "Changes to shifts make meal coordination stressful — assumption.",
    speaker: "Riley Park",
    sourceId: "initial:riley",
  },
  {
    id: "gain",
    category: "gains",
    text: "Predictable meals with less household coordination — assumption.",
    speaker: "Alex Morgan",
    sourceId: "initial:alex",
  },
];
export function presentedProfile(s: PilotState): ProfileItem[] {
  return [
    ...INITIAL_PROFILE,
    ...(s.work?.sections
      .flatMap((section) =>
        section.items.map((item, i) => ({
          id: `${item.sourceId}:${section.key}:${i}`,
          category: section.key as ProfileItem["category"],
          text: item.text,
          speaker: item.speaker,
          sourceId: item.sourceId,
        })),
      )
      .filter((i) => ["customer", "jobs", "pains", "gains", "unknowns"].includes(i.category)) ??
      []),
  ];
}
export function validateClientUpdate(raw: unknown, cp: PilotCheckpoint): ClientUpdate {
  const u = updateSchema.parse(raw);
  const names = new Set(PILOT_PEOPLE.map((p) => p.name));
  if (
    u.actions.length > 8 ||
    u.evidence.length > 10 ||
    u.changes.length > 12 ||
    u.openQuestions.length > 8
  )
    throw new Error("The client update exceeded its bounded scope.");
  const ids = new Set(u.evidence.map((e) => e.id));
  if (ids.size !== u.evidence.length) throw new Error("Duplicate simulated evidence references.");
  for (const a of u.actions) {
    if (!names.has(a.participant)) throw new Error("Unknown participant in client update.");
    const sources = a.agreementSourceIds.map((id) => cp.input.events.find((e) => e.id === id));
    if (sources.some((e) => !e || e.actor !== "team" || e.speaker !== a.participant))
      throw new Error(
        "Client agreement must reference that participant's saved speech, never coach instructions.",
      );
    if (a.basis === "team_agreed" && !sources.length)
      throw new Error("Missing public agreement source.");
    if (a.basis !== "team_agreed" && sources.length)
      throw new Error("Only agreed actions may claim agreement references.");
  }
  for (const e of u.evidence)
    if (!names.has(e.participant) || !e.limitation.trim())
      throw new Error("Simulated evidence needs attribution and limitations.");
  for (const c of u.changes) {
    if (!names.has(c.participant) || c.evidenceIds.some((id) => !ids.has(id)))
      throw new Error("Unsupported update reference.");
    if (
      c.operation === "add"
        ? c.targetId !== null
        : !cp.input.profile.some((i) => i.id === c.targetId)
    )
      throw new Error("Profile change must reference the exact prior item.");
  }
  return u;
}
export function saveScope(
  s: PilotState,
  raw: unknown,
  approach: string,
  rationale: string,
): PilotState {
  if (s.phase !== "scope") throw new Error("Scope is frozen for this pilot's two meetings.");
  const brief = engagementBriefSchema.parse(raw);
  return {
    ...s,
    brief,
    approach,
    rationale,
    scopes: [
      ...s.scopes,
      {
        id: crypto.randomUUID(),
        revision: s.scopes.length + 1,
        brief,
        at: new Date().toISOString(),
      },
    ],
  };
}
export function beginMeetingOne(s: PilotState): PilotState {
  const scope = s.scopes.at(-1);
  if (s.phase !== "scope" || !scope || !s.approach || !s.rationale.trim())
    throw new Error("Save Scope and your approach before the first meeting.");
  return {
    ...s,
    phase: "one",
    boundScopeId: scope.id,
    events: [...s.events, event("one", "system", "System", "First coaching meeting began.")],
  };
}
export function handoff(s: PilotState, rationale: string): PilotState {
  const scope = s.scopes.find((x) => x.id === s.boundScopeId);
  if (s.phase !== "one" || !scope || s.pendingTurn || rationale.trim().length < 10)
    throw new Error("Finish pending replies and record a handoff reason.");
  const events = [...s.events, event("one", "coach", "Coach", rationale)];
  return {
    ...s,
    phase: "handoff",
    events,
    checkpoint: {
      id: crypto.randomUUID(),
      status: "pending",
      input: {
        scopeId: scope.id,
        brief: structuredClone(scope.brief),
        events: structuredClone(events),
        profile: presentedProfile(s),
        work: structuredClone(s.work),
        rationale,
        approach: s.approach,
      },
      update: null,
      leaseUntil: 0,
      token: null,
      error: null,
      seenAt: null,
      attempts: 0,
      retryAt: 0,
      blocked: false,
    },
  };
}
export function claimCheckpoint(s: PilotState, token: string, now = Date.now()): PilotState {
  const c = s.checkpoint;
  if (!c || s.phase !== "handoff") throw new Error("No handoff checkpoint.");
  if (c.status === "ready") return s;
  if (c.blocked) throw new Error(c.error ?? "Access must be restored before a fresh request.");
  if (c.retryAt > now) throw new Error("Wait before retrying this client update.");
  if (c.leaseUntil > now) throw new Error("The client update is already being prepared.");
  return {
    ...s,
    checkpoint: {
      ...c,
      status: "running",
      token,
      leaseUntil: now + 300000,
      attempts: c.attempts + 1,
      error: null,
    },
  };
}
export function completeCheckpoint(s: PilotState, token: string, raw: unknown): PilotState {
  const c = s.checkpoint;
  if (!c || c.token !== token || c.status !== "running")
    throw new Error("Checkpoint claim expired.");
  return {
    ...s,
    checkpoint: {
      ...c,
      status: "ready",
      update: validateClientUpdate(raw, c),
      token: null,
      leaseUntil: 0,
    },
  };
}
export function beginMeetingTwo(s: PilotState): PilotState {
  if (
    s.phase !== "handoff" ||
    s.checkpoint?.status !== "ready" ||
    !s.checkpoint.update ||
    !s.checkpoint.seenAt
  )
    throw new Error("Read the saved client update before meeting two.");
  return {
    ...s,
    phase: "two",
    events: [
      ...s.events,
      event(
        "two",
        "system",
        "System",
        `Second coaching meeting began with client update ${s.checkpoint.id}.`,
      ),
    ],
  };
}
export function stopPilot(s: PilotState, reason: string): PilotState {
  if (!["one", "two"].includes(s.phase) || reason.trim().length < 10 || s.pendingTurn)
    throw new Error("Record a reason after pending replies finish.");
  return {
    ...s,
    phase: "stopped",
    events: [
      ...s.events,
      event(
        s.phase === "one" ? "one" : "two",
        "coach",
        "Coach",
        `Intentional early stop, without synthesis: ${reason}`,
      ),
    ],
  };
}
export function finishMeetingTwo(s: PilotState, reason: string): PilotState {
  if (s.phase !== "two" || s.pendingTurn || reason.trim().length < 10)
    throw new Error("Record why this meeting is ready to conclude.");
  return {
    ...s,
    phase: "advance",
    events: [...s.events, event("two", "coach", "Coach", `Meeting concluded: ${reason}`)],
  };
}
export function pilotAssessmentContext(s: PilotState, purpose: string): string {
  const scopeOnly = ["situation_framing", "coaching_strategy", "intervention_fit"].includes(
    purpose,
  );
  return `${PILOT_ASSESSMENT_RULES}\n${JSON.stringify(scopeOnly ? { scopeId: s.boundScopeId, brief: s.scopes.find((x) => x.id === s.boundScopeId)?.brief, scopeConversation: s.events.filter((e) => e.meeting === "scope"), approach: s.approach, rationale: s.rationale } : { boundScopeId: s.boundScopeId, events: s.events, stimulus: s.checkpoint?.seenAt ? { id: s.checkpoint.id, seenAt: s.checkpoint.seenAt, priorProfile: s.checkpoint.input.profile, update: s.checkpoint.update } : null, candidateNextMove: s.nextMove, candidatePathway: s.advanceNotes ?? {} })}`;
}
export function profileWork(s: PilotState): TeamWork {
  return (
    s.work ?? {
      provenance: "simulated_client_team",
      status: "partial",
      sections: customerProfileSections.map((c) => ({ ...c, items: [] })),
    }
  );
}
export const PILOT_NINE_DIMENSIONS = SECTION_KEYS;
