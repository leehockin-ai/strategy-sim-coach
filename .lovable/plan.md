# Coaching intelligence audit: findings and smallest next steps

This audit only read the code; nothing was changed. It reflects the code as it is now. If Phase 2 files change again, re-check `LiveClientTeam.tsx`, `chapter2-progress.ts`, `simulator.functions.ts` and the session route.

## What already exists and works well (keep all of it)
- **Live client team rules** (`src/lib/live-team.functions.ts:125-146`):
  - Quiet participants don't reveal hidden knowledge.
  - Private evidence appears only when its holder speaks and the right conditions are met.
  - "Follow a weak coach weakly": leading questions get agreement, and supplied answers get accepted with little ownership.
  - The candidate's words enter the work only if a participant actually adopts them.
  - "Completion is not success."
- **Evidence classifier** (`:190-199`): decides whether private evidence can surface without seeing its content. Leading framing cannot unlock contradictory evidence.
- **Team-owned wall:** built only from exact team quotes (`:234`). An atomic database write keeps the source links, and a database rule blocks the candidate from editing team work (`0009_causal_team_work_turn.sql`).
- **One-on-one scoping engine** (`simulator.functions.ts:182-193, 599-684`): hidden trust, engagement and guardedness change gradually, and drop sharply after extractive moves. The hidden levels are never named in replies.
- **Evaluation guards:**
  - "Complete wall does not prove good coaching; missing work does not imply weak coaching" (`evaluation-live-evidence.ts:67`).
  - "Examine coaching and revision causality" (`evaluation.io.ts:176-177`).
  - A deliberately partial artifact with a rationale can score well (`evaluation.functions.ts:124`).
  - "Artifacts SUPPORT thinking; they are not the goal" (`strategyzer-methodology.ts:215-218`).
- **Methodology prompt** (`strategyzer-methodology.ts:21-64`): the coach facilitates and does not become the strategist; open questions; transfers ownership; separates assumptions from facts.
- **Skills evaluated:** listening, questioning, psychological safety, neutrality, ownership, evidence rigor, assumption identification and restraint (`evaluation.functions.ts:188-199`).
- **Reviewer view:** shows timestamped public evidence, revision lineage and warnings that Strategyzer content is unverified (`ReviewLiveEvidence.tsx`).

## Philosophy area: built vs connected vs tested
| Area | Built | Wired into the 3 chapters + assessment | Tested |
|---|---|---|---|
| Client agency / team-owned work | Yes (live room, database rule, wall from team quotes) | Yes | Boundaries only |
| Questioning and listening | Yes (evaluated skills; group answers stay partial when not earned) | Yes | No meaning tests |
| Challenging assumptions / evidence vs hypotheses | Yes (methodology prompt and evaluator) | Assessment only, not simulation prompts | Routing only |
| Productive tension / disagreement not bad | Partly (personas, "without over-pleasing") | Only implied | No |
| Positive sentiment is not progress | Only in the gate document | **Not in any shipped prompt** | No |
| Participation and power | Personas, quiet-participant rule | Live room yes; group scoping weak | Disclosure tests |
| Adapting and stopping on purpose | Yes (rationale event, evaluator guard) | Early stop yes; skip reason **no** | Routing only |
| Playbook as a means | Yes (evaluator and Level 0 honesty) | Yes | Not tested |
| Judgment vs compliance | Guards present, but count signals also reach the evaluator | Mixed | No |

## Top risks (ranked)
1. **Early stop records a made-up synthesis checkpoint.** `LiveClientTeam.tsx:110-119` calls `startSynthesis`, then concludes straight away. The record shows "the coach brings the team back together" even though that never happened, and the evaluator may credit a synthesis that wasn't done. This conflicts with the no-made-up-records rule.
2. **The group scoping call skips the hidden-state engine** (`simulator.functions.ts:779-849`). One-on-one chats update trust and guardedness; the group call doesn't. So in the group setting, coaching that pushes the team versus coaching that pleases them has no lasting effect.
3. **Count signals reach the evaluator** (`evaluation.io.ts:104-140`): character counts, filled sections, turn and revision counts. The only counterweight is a prompt line saying counts are not scores (`evaluation.functions.ts:341`). Volume could still be rewarded.
4. **Positive sentiment and productive tension aren't stated in any prompt.** These rules exist only in the gate document. The evaluator could read harmony as progress and disagreement as failure.
5. **The skip reason never reaches the evaluator**, so a deliberate decision to go without a working session is invisible as evidence of judgment.

Lesser points:
- Chapter 3 forms don't show Chapter 2 outcomes; evaluation sees both, so this is a usability gap more than an assessment gap.
- The older execution rubric penalises an empty workspace, while the live-evidence guard allows it. Behaviour depends on which evidence the session uses.
- "Step 06" is still visible on screen.

## Smallest reuse-first fixes (for approval later, one at a time)
1. **Honest early stop:** add a public `early_stop` marker to the existing conclusion event and stop calling `startSynthesis` on that path. The evaluator text names it "stopped early by coach decision". No schema change.
2. **Evaluator wording, added rather than rewritten:** append two lines to the existing live-evidence guard:
   - Positive sentiment or agreement is not progress without evidence or team ownership.
   - Disagreement or productive tension the coach surfaces or holds can be strong coaching.

   The rubric dimensions, thresholds and scoring structure stay unchanged.
3. **Pass the skip reason to the existing engagement/working-session evaluator input as public context.** Label it as the candidate's rationale and state that it is not penalised in itself.
4. **Label the count signals in the evaluator input** as "context only — never a score input" next to the numbers, or move them to the reviewer-only view. A wording change only.
5. **Group scoping and hidden state:** design note only. Decide whether the group call should reuse the existing state-update chain. Not urgent; it needs its own approval because it changes simulation.

## Do not touch
- The nine `SECTION_RUBRIC` dimensions and recommendation thresholds
- Certification policy and human reviewer authority
- Saved evaluations and reviewer decisions
- The test POC allowlist and gate
- Live-room disclosure rules, the classifier and the team-quotes-only wall extraction
- The rule blocking candidate edits to team work
- Phase 1 assessment jobs and the Phase 2 progression rule
- The voice stack
- Lee's validation session and any test sessions

## Acceptance-test matrix (expected; none observed yet)
Scenario: the Student Founder POC room, plus the Confident Executive for the scoping chat. "Unit" means a routing or wording check that can run without AI. "Semantic" means a later run against the AI with saved transcripts. That needs approval because it uses paid model calls.

| # | Counterfactual coach turn | Expected simulation | Expected assessment signal | Type |
|---|---|---|---|---|
| A1 | Open question to a quiet holder: "Maya, what have you seen from students directly?" | Holder may reveal evidence; wall quotes Maya | Credit for questioning and participation | Semantic |
| A2 | Leading: "So the real pain is pricing, right?" | Agreement, no contradictory evidence | Leading flagged; no credit for ownership | Unit (classifier) + semantic |
| A3 | Coach supplies the answer verbatim | Wall contains it only if a participant restates it, with little ownership | Ownership penalised | Unit (extraction) + semantic |
| A4 | Coach holds a disagreement: "You two see this differently. What evidence would settle it?" | Tension continues, evidence requested | Credit for productive tension (after fix 2) | Semantic |
| A5 | Team is enthusiastic but has no evidence; coach accepts and concludes | Positive tone | Not counted as progress (after fix 2) | Semantic |
| A6 | Coach challenges: "Is that something you've observed, or a guess?" | Team separates evidence from hypothesis | Credit for evidence rigor | Semantic |
| A7 | Early stop with a clear rationale, empty wall | No synthesis event (after fix 1); `early_stop` marker | Can score well; not penalised for no work | Unit + semantic |
| A8 | Rushed conclusion, no rationale beyond minimum | Conclusion accepted | Rushed flagged, not rewarded | Semantic |
| A9 | Skip the working session with a reason | No room | Reason visible to the evaluator (after fix 3) | Unit |
| A10 | Long transcript, many revisions, coach did the work | Full wall | No volume credit; ownership penalised | Semantic |
| A11 | Group scoping: extractive move | One-on-one engine drops trust; the group call does not | Note the inconsistency (risk 2) | Semantic |

## Technical notes
- Existing tests check routing and boundaries, not AI judgment: `evaluation-live-evidence.test.ts`, `team-disclosure.test.ts`, `team-work.test.ts`, `chapter2-progress.test.ts`, `activity-runtime.test.ts`, plus SQL behaviour tests. They were read, not run, during this audit.
- `getActivityEvidenceForReviewer` (`activity-runtime.functions.ts:63`) has no caller found in the code. This comes from a code scan only; it was not confirmed while the app was running.
- Which migrations are actually applied to the database was not checked in this audit.
