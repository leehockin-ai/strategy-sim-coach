# Architecture rules

- Session status is durable progress, not navigation; a database trigger guards monotonic progress atomically while preserving historical aliases and explicit human re-decisions.
- Seed hidden stakeholder state transactionally only for new sessions; never synthesize trajectories for historical sessions.
- Hidden state is reviewer-readable under role-scoped RLS and server-managed for simulation/evaluation; candidate payloads exclude it and privileged reviewer endpoints verify roles first.
- Canvas compatibility readers normalize saved formats in memory without rewriting historical evidence.
- Stabilization regression tests live beside domain helpers and database behavior tests use the privileged database runner in rolled-back transactions because sandbox SQL access cannot update existing rows.
- The root auth watcher invalidates only identity transitions, not initial hydration or token refresh, to avoid interrupting signed-in data reads.
- Candidate evaluation reads use a shared explicit safe projection; private reviewer notes require role-verified server access because row policies cannot protect columns.
- Scope uses existing conversation/intervention engines alongside a candidate-authored brief; an append-only database trigger captures each changed Scope snapshot atomically without historical backfills, allowing a later submitted chapter to reference a frozen revision.
- An optional Scope sequence records proposed later moves; the existing primary intervention remains Apply's execution contract so Scope changes do not redesign Apply.
- Scope competencies map into existing isolated evaluator sections using brief, transcripts and revision evidence; no new scoring calls or automatic candidate conclusions.
- Scope blocks chapter/link exits while brief changes are unsaved; assessment context samples the original and recent revisions without deleting durable evidence to bound model input.