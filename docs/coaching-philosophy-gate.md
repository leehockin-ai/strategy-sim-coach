# Coaching philosophy quality gate

Acceptance criteria for all Coach Compass work. They don't change the rubric or certification policy.

## Principles
1. The Playbook is a means, not the goal. Candidates may choose, adapt, skip or stop activities on purpose.
2. Client agency and team-owned work: the team owns the work. The candidate never writes it for them.
3. Never reward compliance, completion or volume over progress toward the customer outcome.
4. Challenging assumptions, separating evidence from hypotheses, managing group dynamics and productive tension all count as good coaching.
5. Disagreement is not automatically bad. Positive sentiment is not automatically progress.
6. No made-up activity tracking and no made-up working-wall content. Level 0 links are confirmed by the candidate, never verified.

## Phase 2 acceptance tests
| # | Test | Status |
|---|------|--------|
| G1 | The candidate can continue to Chapter 3 after concluding with an empty working wall (no finished work required) | Observed (session 2c: concluded with "No team work recorded yet") |
| G2 | Stopping early during facilitation, with a written reason, is accepted as a conclusion | Observed (session 2c) + unit (`chapter2-progress.test.ts`) |
| G3 | Moving on without the working session is allowed with a written reason and does not open the test-only client team | Observed (session 2b) |
| G4 | Nothing in the interface requires completing the whole Playbook or a set number of turns | Code review: the rule depends only on conclusion or a reason, never on the number of turns or revisions |
| G5 | Linking the Playbook records only the candidate's confirmation, never "verified" | Observed in the interface text |
| G6 | No Strategyzer content is fetched or copied into Coach Compass | Code review: the link is stored and opened only |
| G7 | An early stop records only the coach's decision, marked as an early stop, with no made-up synthesis step | Fixed (fix #1); unit tests in `early-stop.test.ts` |

## Gaps for a later, targeted methodology audit (not changed now)
- ~~Early stop recorded a made-up "Synthesis checkpoint"~~. Fixed: new early stops carry `conclusion_mode: early_stop`; older records are left as they are and read as "unspecified".
- **Evaluator signals:** check that the working-session dimensions don't treat more turns or wall revisions as better, or a full wall as good coaching. The evidence integration added guards, but they haven't been checked against real AI output.
- **Tension:** check whether participant prompts and scoring treat disagreement and pushback as legitimate, and avoid rewarding harmony or positive sentiment.
- **Evidence vs hypothesis:** check that surfaced evidence is attributed only when its holder speaks (the rule exists) and that the candidate's own challenges are credited.
- **Adapting the Playbook:** check that choosing or skipping activities with a clear purpose is credited, not marked down as incomplete.
- **A recorded reason for moving on is not yet fed to the evaluator.** Decide whether it should be, as evidence of judgment, without penalising it.
