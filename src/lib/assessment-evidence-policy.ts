// Evidence applicability, not a scoring/rubric version. Freeze only on new jobs
// for sessions created after this correction; old sessions/jobs keep their inputs.
export const THREE_CHAPTER_EVIDENCE_FROM = "2026-11-09T22:49:32Z";
export const THREE_CHAPTER_EVIDENCE_POLICY = "three_chapter_v1" as const;

export function freezeAssessmentEvidence<T extends object>(evidence: T, createdAt: unknown): T & { assessmentPolicy?: typeof THREE_CHAPTER_EVIDENCE_POLICY } {
  const created = typeof createdAt === "string" ? Date.parse(createdAt) : NaN;
  return Number.isFinite(created) && created >= Date.parse(THREE_CHAPTER_EVIDENCE_FROM)
    ? { ...evidence, assessmentPolicy: THREE_CHAPTER_EVIDENCE_POLICY } : evidence;
}

export const COMMITMENT_EVIDENCE_RULE = `The standalone commitments notes are optional in this three-chapter journey (available in optional one-to-one conversations). A blank notes field is not evidence that no agreements were made and must not itself cause negative feedback or free credit. Assess concrete client-owned commitments and next steps from the relevant supplied conversation and candidate-authored decisions. Candidate plans or coach assertions are not proof of team agreement. Genuinely absent, vague, imposed or unsupported next steps remain valid gaps when observable evidence supports that judgment; state uncertainty when evidence is thin. Do not invent owners, agreement or follow-through.`;