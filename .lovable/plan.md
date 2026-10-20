# Coach Compass — consolidated architecture audit and staged plan

## Scope and approval
Extend, do not rebuild. Preserve **Scope the Engagement → Facilitate the Work → Advance the Outcome**, with the customer outcome as the through-line.

This is an audit/proposal only: no application code, permissions, simulation content or historical evidence changed. Proposed first approval is **Stage 5.5.2 only**, then report and stop. Stage 5.6 requires separate authorization; full Chapter 3 remains excluded.

## A. Reuse unchanged
- Scope conversations, candidate-authored Engagement Brief/revisions, committed intervention and chapter navigation.
- Stable participant identity, existing shared client-room conversation, private participant state and real prior-conversation continuity.
- Stage 5.5.1 facilitation → participant speech → team work → coaching → revision/unresolved state. Preserve public-speech-only extraction, source validation, attribution, simulated provenance and intentional incompleteness.
- Atomic ordered/idempotent events, optimistic sequence/revision checks, append-only artifact history, frozen configuration, ownership and private-state boundaries.
- Level 0 Strategyzer host-allowlisted connection, connection versions and launch recording. Never fetch URLs or claim external activity/artifact observation.
- Detailed nine-section rubric, isolated evaluator calls, safe candidate reports, protected reviewer access and human-decision/progress guards.
- Historical Apply artifacts, compatibility readers and reports. No rewriting evidence or synthesizing historical trajectories.

## B. Extend existing systems
**Chapter 2:** room-first composition; supplied neutral task instructions; compact bound outcome/intervention/Playbook anchor; persistent Open Playbook and View Engagement Brief; secondary connected setup; explicit loading/error/unavailable states.

**Team wall:** visual presentation of existing sections/items/history, not another artifact store. Team-owned creation/revision/removal/reclassification through the causal engine; candidate coaches verbally and views history, never edits. Versioned activity adapter drives layout and generation. Only existing Customer Profile POC initially; generic rendering must not imply generic simulation support.

**Stage 5.6:** committed Practice/Formal mode, activity confirmation, evidence-linked approximate timing, richer existing rubric inputs, immutable evaluation versions, distinct-environment portfolio synthesis and optional frozen human handoff.

**Engagement Simulation Pack mapping:** scenarios already hold public client context/stakeholders/pressures; Scope holds candidate outcome/decision; interventions hold choices; activity definitions hold public specifications; private team configuration holds knowledge/dynamics; run snapshots/events/history hold evidence. Add missing approved specification/version links only as needed, not a parallel pack truth store.

## C. Conflicts and prerequisites
1. **Missing room is not just presentation.** Chapter 2 uses old Apply/canvas branches; the existing room lives on a sibling workspace and silently disappears when unavailable.
2. **Ordinary availability is content/permission-blocked.** Live read-only checks found four scenarios, one unapproved POC team configuration, zero allowlisted sessions and no activity-definition rows. Two existing external runs have no matching approved room. Server access and atomic artifact writes enforce POC eligibility. Do not remove gates or promote unapproved content.
3. **Four scenarios ≠ four approved causal rooms.** Restore the eligible POC and honest unsupported states first. Ordinary-room rollout needs methodology-owner-approved configuration and narrowly aligned server/database eligibility; frontend work alone cannot supply this.
4. **Generic renderer ≠ generic generator.** Current generation/extraction hard-code Customer Profile sections. Introduce one consistent adapter boundary, retain this POC adapter and invent no additional activities.
5. **Legacy assistance conflicts with formal neutrality.** Old Apply includes facilitation advice and candidate-authored canvases. Preserve historical readers/Practice compatibility; do not put advice or competing editors beside the new formal room.
6. **Assignment privacy gap:** assignment detail selects `ambiguity_factors` and unsanitized stakeholders rather than the safe scenario projection. No assignment page route exists, but the callable function remains relevant. Plan a focused correction before expanded access; none made during audit.
7. **Outcome anchor may drift:** runtime shows latest Scope while runs bind saved Scope. Use the bound revision for the room/evaluation; later edits cannot relabel completed evidence.
8. **Practice means unsubmitted today:** no committed attempt mode exists; later human submission can relabel developmental work. Separate mode, AI feedback and human-review request.
9. **Completion is conflated with evaluation:** AI generation marks session completion; room conclusion is separate. Define completed engagement evidence independently of AI success, Pass or artifact perfection. Valid intentional stopping counts; empty/abandoned sessions do not.
10. **Evaluator misses room evidence and timing:** legacy messages/canvases dominate; timestamps/stable IDs are lost during rendering. Extend relevant existing sections with room/work/conclusion/confirmation/timing—not wall-completeness scoring.
11. **Human fields protected ≠ frozen evidence:** AI overwrites one report per session and candidate artifacts can change. New formal evidence/evaluations need immutable versions; decisions bind the reviewed portfolio revision.
12. **Program averages ≠ portfolio judgment:** preserve administrative reporting, never repurpose averages or existing single-session recommendation thresholds into portfolio Pass rules.

## D. Proposed stages
### Stage 5.5.2 — Restore coaching room and visual team wall
1. Close assignment safe-projection gap with a focused privacy regression.
2. Compose one canonical Chapter 2 experience from the existing runtime room, keeping the sibling URL for resume. No third conversation engine or duplicate live canvas editor; historical evidence stays accessible.
3. Show supplied neutral instructions before Begin. Prioritize visible participants, transcript and “Facilitate the team…” input with a lightweight read-only wall.
4. Keep compact bound-outcome/intervention/Playbook identity and persistent Playbook/Brief utilities; demote connection setup/history.
5. Extract a generic wall over saved work/history and one versioned Customer Profile adapter. Retain attribution/source links, revision selection, gaps and incomplete states. No hidden-truth-derived evidence badges.
6. Distinguish loading, errors, connection required, eligible room and unsupported configuration. Connected does not mean supported or externally verified. Retain POC labels and restrictions.
7. Preserve synthesis/conclusion contract. Natural-language intentional stopping changes work state; it does not automatically conclude the session.
8. Run regression, reversible database and signed-in behavioural checks; report limitations and **stop**.

**Migration expectation:** no artifact/evidence-schema replacement. Prefer existing frozen configuration for adapter/layout metadata with compatibility defaults. Any ordinary eligibility expansion requires separate approved content and migration review; never disable the POC safeguard globally.

### Stage 5.6 — Reviewable increments
- **5.6A — Attempt contract/freeze:** commit Practice/Formal and environment/policy identity before evidence starts; idempotent valid completion plus frozen evidence manifest. Historical attempts remain legacy/unclassified, not automatically formal. Protect frozen formal evidence without locking ordinary chapter navigation.
- **5.6B — Activity/pacing:** after conclusion infer only supported activities from public transcript/work with citations. Candidate confirms/corrects; low confidence asks for selection; unsupported/unknown and multiple activities stay honest. Append candidate-confirmed versions. Approximate timing uses event windows, inactivity/latency and uncertainty; no fake timer or automatic overrun penalty.
- **5.6C — Simulation AI/history:** enrich relevant existing rubric sections with source-linked room/work/Scope/conclusion/timing. Immutable evaluations reference evidence/rubric/prompt/model versions; old report reads remain compatible. Useful Practice/Formal AI independent of human review.
- **5.6D — Formal portfolio:** owner/policy-bound immutable membership revisions. Transactionally count distinct completed formal environments: 0/3 → 1/3 → 2/3 → 3/3. Exclude Practice, duplicates/replays, abandoned and unapproved POC attempts. Same Playbook across environments allowed; fourth adds evidence in a new revision. 3/3 means eligibility, never Pass.
- **5.6E — Portfolio AI/human:** separate cited synthesis of recurring/situational strengths, weaknesses, improvement, contradiction and insufficiency—not averaging. Optional configured human review freezes portfolio/evaluation versions; authenticated decisions/supersessions append and remain authoritative. No invented pricing or thresholds.

Subdivision is necessary because mode, completion and immutable evidence must precede trustworthy portfolio counting. Approved content is a separate prerequisite, not grounds to fabricate three rooms.

## E. Technical details and migration implications
- Chapter 2 dispatch: session route 1298–1330, `ApplicationStep` ~3001 onward; `ActivityRuntime.tsx:17–69`, `StrategyzerWorkspace.tsx:24–103`, `LiveClientTeam.tsx:18–109`.
- Causal boundaries: `live-team.functions.ts:14–25,60–107,119–125,185–253`; `team-work.ts`, `team-disclosure.ts`; migration history is `drizzle/migrations/0005`–`0010`. Deployed POC artifact-write gate matches checked-in migration. Assignment gap: `assignments.functions.ts:64–70`; latest/bound Scope distinction: `activity-runtime.functions.ts:30–39`.
- Evaluator: `evaluation.functions.ts:383–559,562–613`, `evaluation.io.ts:52–100,163–242`, `programs.functions.ts:120–160`, report/reviewer routes. Live schema confirms one evaluation per session and human-field trigger protection.
- Additive Stage 5.6 records: attempt commitment/completion, immutable evidence manifests, activity inference/confirmation history, simulation evaluation versions, portfolio/member revisions, portfolio AI versions and optional review request/decision history. Final names/contracts belong to approved implementation.
- Reference existing session/run/Scope/event/artifact/evaluation IDs and versions; no competing mutable evidence store, historical backfill or POC relabelling. Later evidence creates a new portfolio revision, never changes a reviewed one.
- Explicit grants/RLS and owner/reviewer policies on every new table. Private evaluator context stays separate from public feedback; prevent disclosure through quotations/citations. Ownership, cross-session references, idempotency and concurrency checked atomically. Reuse authenticated server functions/bearer middleware; authorize reviewers before privileged imports.
- Before formal rollout approve eligible content and prospective repeat/member-selection policy. Proposal: historical evidence does not automatically count, repeats never create extra distinct slots or silently replace frozen members. No fabricated certification rules.

## F. Validation and audit evidence
**Fresh checks:** 74 existing regressions passed across nine files; read-only database inventory confirmed four scenarios and gating above. Public browser page rendered without errors; older dynamic-import error did not recur there. No new simulation, database mutation, signed-in behavioural or reviewer-positive journey was exercised during this audit.

**5.5.2:** signed-in instructions → connection → participants/conversation → assigned work → coaching revision/unresolved state → history/refresh → intentional conclusion. Inspect candidate/network payloads for hidden state; verify no direct wall editing, persistent Playbook, unsupported/error states and Level 0 semantics. Repeat strong/leading/rushed/uninvited/intentional-stop behavioural comparisons; desktop/mobile checks. Reversible database tests cover ownership, actors, quote lineage, retries and genuine simultaneous conflicts. Reviewer-positive validation needs an authorized account, never convenience role grants.

**5.6:** one concrete test per counting rule (1/3, 2/3, 3/3, Practice/repeat/incomplete exclusion, fourth evidence, same Playbook allowance), plus concurrent completion. Test inference/confirmation/correction/low confidence/unsupported/multiple activities; timing citations/uncertainty/no automatic overrun penalty. Verify room-only rubric evidence and legacy compatibility. Freeze portfolio, rerun AI and add evidence: reviewed versions/decisions stay unchanged.

**Assessment validity:** strong methodology plus repeated stakeholder weakness, and inverse, must preserve persistent weakness. Test improvement, contradiction and insufficient evidence without averaging. Verify full authorized three-environment → portfolio AI → configured human handoff. Unit success alone cannot prove semantic disclosure, methodology validity or calibration; approved content and human validation remain prerequisites.

## Stop boundary
Review first; proposed initial authorization is **Stage 5.5.2 only**, restricted POC plus honest unsupported ordinary sessions until content/access approval. No automatic Stage 5.6, production promotion, external integration, rubric replacement or full Chapter 3.
