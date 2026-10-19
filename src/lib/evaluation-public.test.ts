import { expect, it } from "vitest";
import { candidateEvaluation, CANDIDATE_EVALUATION_COLUMNS } from "./evaluation-public";

it("never returns private reviewer notes to a candidate", () => {
  expect(candidateEvaluation({ internal_notes: "Private deliberation", reviewer_decision: "approved", scores: { framing: 4 } }))
    .toEqual({ reviewer_decision: "approved", scores: { framing: 4 } });
});
it("candidate database projection excludes internal_notes", () => {
  expect(CANDIDATE_EVALUATION_COLUMNS.split(",")).not.toContain("internal_notes");
  expect(CANDIDATE_EVALUATION_COLUMNS.split(",")).toContain("reviewer_decision");
});