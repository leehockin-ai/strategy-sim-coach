# Architecture rules

- Session status is durable progress, not navigation; a database trigger guards monotonic progress atomically while preserving historical aliases and explicit human re-decisions.
- Seed hidden stakeholder state transactionally only for new sessions; never synthesize trajectories for historical sessions.
- Hidden state is reviewer-readable under role-scoped RLS and server-managed for simulation/evaluation; candidate payloads exclude it and privileged reviewer endpoints verify roles first.
- Canvas compatibility readers normalize saved formats in memory without rewriting historical evidence.
- Stabilization regression tests live beside domain helpers and database behavior tests run against rolled-back transactions.