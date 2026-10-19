// Explicit projection is also used by candidate-facing privileged reads.
export const CANDIDATE_EVALUATION_COLUMNS = "id,session_id,scores,strengths,gaps,recommendation,overall_summary,raw_response,reviewer_notes,reviewer_decision,created_at,ai_detection,soft_skills,methodology_skills,coach_feedback,reviewer_name,reviewed_at,per_section_overrides,ai_section_verdicts,input_quality_signals,evaluation_architecture";

export function candidateEvaluation<T extends { internal_notes?: unknown }>(evaluation: T) {
  const { internal_notes: _privateNotes, ...publicEvaluation } = evaluation;
  return publicEvaluation;
}