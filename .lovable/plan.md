# Coach Compass — consolidated architecture audit and staged plan

## Decision and scope
Extend the existing product, not rebuild it. Keep **Scope the Engagement → Facilitate the Work → Advance the Outcome**, anchored to the customer outcome rather than Playbook completion.

This is the requested audit and proposal only. **No application code, permissions, simulation content or historical evidence has been changed.** Approval should initially authorize **Stage 5.5.2 only**, followed by a report and stop. Stage 5.6 requires a separate go-ahead. Full Chapter 3 remains excluded.

## A. Reuse unchanged
- Existing Scope conversations, candidate-authored Engagement Brief, revision trail, committed intervention and chapter navigation.
- Stable participant identity, shared client-room conversation, private participant state and real prior-conversation continuity.
- Stage 5.5.1 causal chain: natural facilitation → participant speech → team-owned work → further coaching → revision/unresolved state. Preserve public-speech-only extraction, exact source validation, actor attribution and simulated provenance.
- Ordered, atomic, idempotent event writes; optimistic sequence/revision checks; append-only artifact history; frozen room configuration; candidate ownership and private-state boundaries.
- Level 0 Strategyzer connection, host allowlist, append-only connection versions and launch recording. Never fetch supplied URLs or claim external activity/artifact observation.
- Existing detailed nine-section rubric, isolated assessment calls, safe candidate report projection, protected reviewer access and human-decision/progress guards.
- Historical Apply artifacts and compatibility readers. Existing reports remain accessible; no retroactive rewriting or synthesized historical trajectories.

## B. Extensions needed
**Chapter 2:** make the existing client room the main experience; concise supplied task instructions; compact outcome/intervention/Playbook anchor; persistent Open Playbook and View Engagement Brief; explicit loading/error/unavailable states; connected setup becomes secondary.

**Working wall:** visual presentation of existing team-work sections/items/history, not another artifact store. The team alone creates/revises/removes/reclassifies through the causal engine. Candidate controls remain verbal coaching and revision viewing, not editing. Layout is driven by a versioned activity adapter. Only the existing Customer Profile POC is supported initially; generic presentation must not imply generic simulation support.

**Stage 5.6:** explicit Practice/Formal attempt commitment, post-session activity inference and candidate confirmation/correction, evidence-linked approximate timing, richer simulation assessment inputs, versioned evaluation history, distinct-environment portfolios, non-averaging portfolio synthesis and optional frozen human-review handoff.

**Engagement Simulation Pack mapping:** reuse scenarios for public client context, stakeholders and pressures; Scope for the candidate's desired outcome/decision; intervention records for choices; activity definitions for public specifications; private team configuration for participant knowledge/dynamics; run snapshots/events/history for evidence. Introduce version links and missing approved specification fields only when necessary—not a parallel pack truth store.

## C. Conflicts and prerequisites
1. **The missing room is not just a layout bug.** Chapter 2 still uses older Apply/canvas branches, while the room sits on a sibling workspace. The room also silently disappears when configuration is unavailable.
2. **Ordinary room availability is content- and permission-blocked.** Live read-only checks found four client environments, one unapproved POC team configuration, zero allowlisted test sessions and no activity-definition rows. The two existing external runs use interventions without a matching approved room. The atomic work-writing function also enforces POC access. Do not remove gates or promote POC content to fix presentation.
3. **Four environments do not mean four approved causal rooms.** Stage 5.5.2 can restore the eligible POC experience and honest unsupported states. A full ordinary-session coaching room requires methodology-owner-approved configuration and narrowly aligned server/database eligibility rules. This cannot be achieved by frontend work alone.
4. **Generic wall rendering ≠ generic work generation.** Current orchestration/extraction uses Customer Profile sections. Add one adapter boundary consistently across layout and generation, retaining the POC adapter; do not invent other activities.
5. **Legacy assistance conflicts with formal task neutrality.** Old Apply paths include facilitation advice and candidate-authored canvases. Preserve historical readers and existing Practice compatibility, but do not place that advice/editor beside the new formal team room.
6. **A remaining candidate privacy gap exists:** the assignment-detail function selects `ambiguity_factors` and unsanitized stakeholders, unlike the safe scenario projection. No assignment page route currently exists, but the callable function remains relevant. Include a narrowly scoped privacy correction before expanding access; no fix was made during this audit.
7. **Outcome anchoring can drift.** Runtime presentation reads the latest Scope revision, while runs bind saved Scope context. New room/evaluation anchors must use the bound revision; current editing must not relabel completed evidence.
8. **Practice currently means “not submitted for human review.”** Sessions have no committed Practice/Formal mode; later submission can relabel developmental work. Human-review purchase/submission must become separate from attempt mode and AI feedback eligibility.
9. **Completion is conflated with evaluation.** AI generation marks a session evaluated/completed; room conclusion is a separate event. Define explicit engagement completion independent of artifact perfection, AI success, Pass or human review. Intentional justified stopping remains valid; empty/abandoned attempts do not count.
10. **Evaluation omits new room evidence and loses useful timing/IDs.** Existing inputs rely on legacy messages/canvases and Scope. Add room events, work evolution, conclusion, confirmation and contextual timing to appropriate existing rubric sections, without completeness-based scoring or new rubric thresholds.
11. **Human decisions are protected, but reviewed evidence is not frozen globally.** AI upserts one evaluation per session; candidate artifacts can still change. New formal evidence/evaluations need immutable versions and human decisions bound to the reviewed portfolio revision.
12. **Program averages are not portfolio judgment.** Retain administrative reporting, but never repurpose score averages or single-session recommendation thresholds into portfolio Pass rules.

## D. Proposed stages

### Stage 5.5.2 — Restore coaching room and visual team wall
1. Close the assignment safe-projection gap with a focused regression test.
2. Compose one canonical Chapter 2 experience from the existing runtime room, rather than adding another chat engine. Keep the sibling URL for direct resume; preserve legacy evidence access without duplicate live editors.
3. Show the brief's neutral instructions before Begin. After beginning, prioritize participants, conversation and “Facilitate the team…” input, beside/below a lightweight non-editable wall.
4. Keep a compact bound-outcome anchor, intervention/Playbook identity and persistent Playbook/Brief utilities; demote connected setup and connection history.
5. Extract a generic wall over existing saved work/history and one versioned Customer Profile adapter. Preserve speaker/source links, revision browsing, empty sections and incomplete states. Do not infer evidence badges from hidden truth.
6. Distinguish loading, failed reads, not connected, eligible room and unsupported configuration. Do not equate connected with simulated/verified activity support. Keep all POC labels and restrictions.
7. Preserve existing synthesis/conclusion behaviour. Natural-language intentional stopping marks work state; it is not automatically session conclusion. Report this distinction rather than changing the contract silently.
8. Run regression, reversible database and signed-in behavioural checks; report results/limitations and **stop**.

**Migration expectation:** no artifact/evidence-schema replacement. Prefer existing frozen configuration for adapter/layout metadata, with compatibility defaults for old work. Any necessary eligibility change requires separate content approval and explicit migration review; never disable the disposable-session safeguard globally.

### Stage 5.6 — Split into reviewable increments
- **5.6A — Attempt contract and evidence freeze:** commit Practice/Formal and environment/policy identity before evidence starts; define idempotent valid completion and a frozen evidence manifest. Legacy sessions remain legacy/unclassified, not automatically formal. Prevent mutation of frozen formal evidence without locking ordinary chapter navigation or changing historical rows.
- **5.6B — Activity confirmation and pacing:** after conclusion infer only supported activities from public transcript/work; cite evidence, ask for confirmation/correction, use selection when confidence is low and allow honest unsupported/unknown outcomes. Append corrections with candidate-confirmed provenance. Reconstruct approximate event windows, accounting for inactivity and model latency; no fake live timer or automatic overrun penalty.
- **5.6C — Enrich and version simulation AI:** feed source-linked room/work/Scope/conclusion/timing evidence into existing relevant rubric sections. Record immutable evaluation versions and evidence/prompt/rubric/model references; keep existing reports as compatible reads. Practice and Formal both receive useful AI feedback independent of human review.
- **5.6D — Formal portfolio:** owner/policy-bound portfolio revisions referencing frozen completed formal engagements. Count distinct environment identities transactionally: 0/3 → 1/3 → 2/3 → 3/3; duplicate environments/sessions, Practice, abandoned and unapproved POC attempts do not count. Same Playbook in different environments is allowed. Fourth environment becomes additional evidence in a new revision. 3/3 means minimum evidence eligible, never Pass.
- **5.6E — Portfolio AI and human handoff:** separate cross-engagement synthesis with correct citations, recurring/situational strengths, repeated weaknesses, improvement, contradictions and insufficient evidence—not averaging. Optional configured human-review request references a frozen portfolio and evaluation versions; authenticated reviewer decisions/supersessions are append-only and authoritative. No invented pricing or certification thresholds.

**Why this subdivision:** explicit mode, completion and immutable evidence must exist before counting portfolios or generating meaningful longitudinal assessment. Content approval is a separate readiness prerequisite, not a reason to fabricate three rooms.

## E. Technical details and data implications
- Core references: session route Chapter 2 dispatch (1298–1330), legacy `ApplicationStep` (~3001 onward); `ActivityRuntime.tsx` (17–69); `StrategyzerWorkspace.tsx` (24–35, 64–103); `LiveClientTeam.tsx` (18–44, 86–109).
- Causal/privacy references: `live-team.functions.ts` (14–25, 60–107, 119–125, 185–253), `team-work.ts`, `team-disclosure.ts`; runtime migrations are **`drizzle/migrations/0005`–`0010`**, not a missing new migration system. Assignment privacy: `assignments.functions.ts:64–70`. Bound/latest Scope distinction: `activity-runtime.functions.ts:30–39`.
- Evaluation references: `evaluation.functions.ts` (383–559, 562–613), `evaluation.io.ts` (52–100, 163–242), `programs.functions.ts` (120–160), report and reviewer routes. Live database confirms `evaluations` is unique by session and protects human fields through a trigger.
- Stage 5.6 additions: attempt commitments/completion references; immutable evidence manifests; append-only inference/confirmation records; simulation evaluation versions; portfolio/membership revisions; portfolio evaluation versions; optional review requests and decision history. Final table names/contracts belong to the approved implementation design.
- Membership/manifests reference existing session/run/Scope/event/artifact/evaluation IDs and versions. Do not copy mutable evidence into competing stores or modify historical rows. Additional portfolio evidence creates a new revision; prior reviewed revision stays fixed.
- Every new table gets explicit grants, RLS and owner/reviewer policies; private evaluator context remains separate from candidate output. Writes validate ownership, cross-session references, request identity and concurrency atomically. Use existing authenticated server functions/bearer attachment; check reviewer roles before privileged imports. No new external Strategyzer endpoints/integration.
- Before Stage 5.6 formal rollout, configure eligibility/content readiness and prospective retry/member-selection policy. Default proposal: existing evidence does not retroactively count; repeat attempts never create extra distinct slots or silently replace frozen evidence. Seek explicit policy approval, not fabricated certification rules.

## F. Validation and current evidence
**Fresh audit checks:** 74 existing unit regressions passed across nine files. Read-only database checks confirmed four scenarios and the configuration/eligibility constraints above. Public-page browser check rendered without page errors; the older dynamic-import log entry did not recur there. No new simulation, database mutation, authenticated behavioural or reviewer-positive flow was exercised during this audit.

**Stage 5.5.2:** signed-in instructions → connection → visible participants → natural conversation → assigned work → coaching revision/unresolved work → history/refresh → intentional conclusion. Inspect candidate responses/network payloads for hidden state. Verify no candidate wall edits, persistent Playbook access, unsupported/error states, and Level 0 honesty. Repeat strong/leading/rushed/uninvited/intentional-stop behavioural comparisons; inspect desktop/mobile. Reversible database tests cover owner/actor denial, quote lineage, idempotency and real simultaneous conflicts. Reviewer-positive checks require an authorized account; never grant roles for convenience.

**Stage 5.6:** automate each counting rule with concrete 1/3, 2/3, 3/3 assertions, Practice exclusion, duplicate/reload exclusion, invalid completion, fourth evidence and same-Playbook allowance; test concurrent completion. Test confirmation/correction/low confidence/unsupported/multiple activities and timing windows/citations/uncertainty/no automatic overrun penalty. Verify room-only evidence reaches rubric sections and legacy reports remain intact. Freeze a portfolio, rerun AI and amend later evidence: the reviewed version/decision must remain unchanged.

**Assessment validity:** behavioural fixtures with strong methodology plus repeated stakeholder weakness, and the inverse, must retain the persistent weakness. Test contradictory, improving and insufficient evidence without score averaging. Then verify the full authorized flow through three distinct formal completions, portfolio AI and configured human handoff. Unit success alone cannot establish semantic disclosure, methodology validity or assessment calibration; human review and approved simulation content remain prerequisites.

## Approval boundary
Review this audit first. Proposed first authorization is **Stage 5.5.2 only**, retaining the restricted POC and honest ordinary-session unavailability until approved content/access exists. No Stage 5.6, production promotion, full Chapter 3, external integration or rubric replacement starts automatically.