# Stage 5.5.1 — Causal team work-product proof

## Purpose and boundaries
Prove that different coaching produces different team behaviour and representative team work in the existing TEST/NON-PRODUCTION Customer Profile activity. Preserve Strategyzer identity, Scope, legacy Apply, progress, human assessment authority and the candidate-confirmed Level 0 connection. Stop after this stage.

## What will change
1. Extend the existing Live Client Team turn to interpret conversation, meaningful work assignments, coaching against work, revision requests and intentional stopping semantically—not by matching phrases. Keep natural conversation as the primary interaction.
2. Let the simulated team produce a compact, read-only first pass and subsequent revisions. Customer focus, Jobs, Pains, Gains, surfaced evidence and assumptions/unknowns are the first activity representation, not a recreated canvas or Playbook. The candidate cannot edit it.
3. Make generation and revision depend on actual participant contributions, surfaced knowledge, beliefs, disagreement, state and coaching. Unsupported claims may persist as assumptions; the model must not rescue weak coaching or automatically optimize for completion.
4. Show team work alongside the room, clearly labelled simulated client team work—not read, synced or verified Strategyzer work. Preserve partial, unresolved and intentionally stopped outcomes and the candidate's rationale.
5. Preserve the causal chain from instruction through responses, private state, surfaced evidence and event-linked work revisions. Reuse reviewer evidence access without redesigning the evaluator or reviewer dashboard.

## Technical approach
- Reuse Activity Runs, definition snapshots, Scope association, public events, private team state and existing artifact history.
- Extend the current server-owned team append operation narrowly, only where existing external-run rules prevent atomic team artifact writes. Keep owner/POC checks, row locking, ordered append-only history, request idempotency and optimistic revisions; prohibit candidate writes to simulated work. No new generalized artifact framework or historical backfill.
- Pin the team configuration used by new work sessions; do not reinterpret historical evidence under changed configurations.
- Separate private simulation context from public work content. Validate participant attribution and evidence provenance against legitimately surfaced contributions; retain private reasoning only in existing private evidence storage. Treat model prose as probabilistic: behavioral tests must check for unsupported disclosures, not claim sanitization guarantees semantic truth.
- Preserve the existing AI model and evaluator calls; incorporate only the limited existing methodology reference needed to bound this simulation, without silently correcting team mistakes.

## Verification and deliverable
- Run behavioral Tests A–E against the same POC team: strong coaching, leading/prescriptive coaching, insufficient evidence, intentional stop and participation failure. Compare actual transcripts and work snapshots; do not substitute mocked output for behavioral proof.
- Add and run focused tests for privacy/provenance, authorized server-only writes, event linkage, ordered append-only revisions, retry conflicts, persisted state, justified incompleteness and internal/external compatibility. Use disposable test sessions and reversible database checks; leave historical evidence unchanged.
- Verify the signed-in candidate loop: connect, begin, assign work, see a first pass, coach a revision, refresh and conclude with a rationale. Browser checks are development verification only; no browser automation feature is added.
- Return a report covering the brief's fourteen deliverables, actual test results, candidate-flow evidence, schema/data changes and known limitations. Explicitly answer whether different coaching produced meaningfully different work. If that comparison fails, report Stage 5.5.1 as incomplete rather than masking it with presentation.

## Excluded
No Chapter 3, timers/pacing, Strategyzer API/scraping/synchronization/credentials, additional activities or scenarios, full Playbook simulation, stage gates, certification thresholds, evaluator redesign, reviewer-dashboard redesign or broader application redesign.