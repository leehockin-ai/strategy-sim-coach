# Stabilization roadmap

## Stage 5.5.1 — Causal team work-product proof
- [x] Plan the narrow Customer Profile POC using existing runtime, events, artifacts and private team state.
- [ ] Implement semantic work assignments and team-owned simulated work with causal, append-only revisions.
- [ ] Verify behavioural Tests A–E and privacy, provenance, idempotency and compatibility regressions.
- [ ] Report results and limitations; stop after Stage 5.5.1.

## Stage 5.5 — Candidate Experience Alignment
- [x] Three-chapter candidate orientation (Scope the Engagement / Facilitate the Work / Advance the Outcome) without locking or wizard rigidity.
- [x] Client Brief: candidate payloads now carry public client context only (safe scenario projection); system prompt, ambiguity factors, unrealistic aspects and stakeholder postures no longer reach candidates.
- [x] Persistent participant identity (deterministic initials/color fallback, optional portrait) across Brief header, Scope conversations and Live Client Team.
- [x] Scope as one engagement workspace (Client / Your Approach with Scoping call and 1:1 conversations); legacy framing summary is read-only and points to the Engagement Brief.
- [x] Customer outcome as through-line into Facilitate the Work; working-session workspace reframed, setup collapses once connected, Engagement Brief outcome anchors the room; Live Client Team shows participant identities.
- [x] Terminology audit (evaluator/reviewer/scoring copy removed from candidate view), landing cleanup. 63 tests pass, build OK, signed-in browser checks passed.
- [ ] Human walkthrough by Lee across scenarios; responsive/mobile spot check. Stop before Stage 6.

## Stage 5 — Live Client Team (POC)
- [x] Shared room, private participant state, evidence reveal, synthesis and conclusion on the Customer Profile POC; Tests A–F, security checks, transcripts and report done. Stopped before Stage 6 (pacing). Next: separate UI/UX cleanup pass per Lee.

## Stage 3 — Playbook Activity Runtime Foundation
- [x] Add configurable/versioned activity definitions, protected simulation truth, durable runs and Scope revision linkage.
- [x] Add atomic ordered/idempotent event append and event-linked artifact history; reserve time fields without timing rules.
- [x] Prove one TEST/NON-PRODUCTION runtime workspace without replacing current Apply or changing Scope.
- [x] Verify candidate privacy/ownership, concurrent retries, refresh, legacy format compatibility and unchanged progress; temporary data removed. 43 unit regressions and reversible database checks passed.
- [x] Report architecture, results and concerns; stopped before Stage 4. Reviewer-positive browser and other owners' historical rendering remain access-blocked below.

## Stage 2 — Integrated Scope
- [x] Close internal_notes privacy across candidate payloads and direct reads; denial verified before Scope work.
- [x] Add editable Engagement Brief, revision trail and optional intervention sequence without rewriting historical evidence.
- [x] Integrate existing conversation, stakeholder and intervention capabilities into one Scope workspace; preserve Apply simulation implementation.
- [x] Map ten Scope competencies into existing evaluator calls, emphasizing decision clarity.
- [x] Complete signed-in Scope journey, privacy, refresh/history, unsaved-exit protection, progress protection and desktop/mobile checks; 36 regressions and reversible database checks passed. Report supplied; stop before Stage 3.
- [ ] Authorized reviewer-positive browser verification: blocked by the requesting account lacking reviewer/admin access; no roles changed.

- [x] Stage 0: baseline and compatibility fixtures for all existing statuses/formats; all historical rows unchanged.
- [ ] Browser verification of all historical sessions: requesting user's one owned session passed; remaining sessions require their owners' or authorized reviewer's session. One historical session has no owner; do not reassign it without approval.
- [x] Stage 1: canvas saves and backward status writes cannot regress progress; assignment roll-up verified.
- [x] Diagnose stakeholder persistence; new-session seeds and two real 1:1 turns persist across refresh.
- [x] Restrict hidden-state reads and server reviewer endpoints; candidate denial verified.
- [x] Report changes, root cause, compatibility results and risks; stopped before Stage 2.- [x] Revised Stage 4: Strategyzer Playbook handoff & external runtime (Level 0). Waiting on Lee's real Strategyzer account test and approval before the AI-team stage.
