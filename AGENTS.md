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
- Activity definitions are versioned configuration with immutable used versions and a public snapshot per run; runs bind original intervention and saved Scope revision so later choices cannot relabel historical evidence.
- Activity events and artifact revisions append through an owner-checked, row-locked database RPC with request-payload idempotency and optimistic artifact revisions; candidates cannot impersonate system/team actors or supply private annotations.
- Activity simulation truth, participant state and reviewer/evaluator metadata live in separate server-only tables; privileged reviewer functions verify roles before importing the admin client, and future simulation helpers must use the same boundary.
- Runtime workspaces dispatch from activity definition types on a sibling authenticated activity route; existing Apply storage and messaging remain unchanged, with optional message linkage reserved for a shared team instead of a third chat engine.
- Technical runtime activity access uses a server-managed allowlist of explicitly marked disposable sessions; test-only definitions never enter ordinary certification selection.