# Coach Compass — consolidated architecture audit and staged plan

## Scope and approval
Extend, do not rebuild. Preserve **Scope the Engagement → Facilitate the Work → Advance the Outcome**, with the customer outcome as the through-line.

This is an audit/proposal only: no application code, permissions, simulation content or historical evidence changed. Proposed first approval is **Stage 5.5.2 only**, then report and stop. Stage 5.6 requires separate authorization; full Chapter 3 remains excluded.

## A. Reuse unchanged
- Scope conversations, Engagement Brief/revisions, intervention commitment and chapter navigation.
- Participant identities, existing client conversation and private state/prior-contact continuity.
- Stage 5.5.1 facilitation → participant speech → team work → coaching → revision/unresolved state: public-source validation, attribution, simulated provenance, intentional incompleteness.
- Atomic ordered/idempotent events, optimistic checks, append-only history, frozen configurations, ownership/privacy protections.
- Level 0 host-allowlisted connections, versions and launch records; existing detailed rubric, isolated calls, safe reports, reviewer roles, human-decision/progress guards.
- Historical artifacts/readers/reports; no rewritten evidence or synthesized historical trajectories.

## B. Extend existing systems
**Chapter 2:** room-first composition; supplied neutral instructions; compact bound outcome/intervention/Playbook anchor; persistent Playbook/Brief links; secondary setup; explicit loading/error/unavailable states.

**Team wall:** visual presentation of existing sections/items/history, not a second store. Team alone revises/removes/reclassifies through causal turns; candidates coach verbally, never edit. One versioned adapter drives layout/generation; existing Customer Profile POC only initially.

**Stage 5.6:** committed mode, activity confirmation, approximate contextual timing, richer rubric inputs, evaluation versions, distinct-environment portfolio synthesis and optional frozen human handoff.

**Engagement Simulation Pack:** map scenarios to public context/stakeholders/pressure; Scope to outcome; interventions to choices; definitions to specifications; private team config to knowledge/dynamics; runs/events/history to evidence. Add approved specification/version links only where missing, not a parallel pack model.

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
- Key references: session route Chapter 2 dispatch 1298–1330 and legacy Apply ~3001; `ActivityRuntime`, `StrategyzerWorkspace`, `LiveClientTeam`; `live-team.functions.ts:14–25,60–107,185–253`; `team-work`/`team-disclosure`; `evaluation.functions.ts:383–613` and `evaluation.io`; report/reviewer routes. Assignment privacy: `assignments.functions.ts:64–70`; Scope anchor: `activity-runtime.functions.ts:30–39`.
- Authoritative runtime migration history is `drizzle/migrations/0005`–`0010`; deployed POC artifact-write gate matches it. Live schema confirms single evaluation per session and human-field trigger protection.
- Stage 5.6 adds attempt/completion records, frozen evidence manifests, activity confirmation history, evaluation versions, portfolio/member revisions and optional review/decision history. Reference existing evidence IDs/versions; later evidence creates new revisions, never rewrites historical or reviewed ones.
- Every new table needs explicit grants/RLS, owner/reviewer policies and atomic ownership, cross-session, idempotency/concurrency checks. Separate private evaluator context from candidate feedback/citations. Reuse authenticated server functions; authorize reviewers before privileged imports.
- Approve eligible content and prospective repeat/member-selection policy before rollout. Proposed default: historical attempts do not automatically count; repeats add no distinct slots and never silently replace frozen members. No invented certification policy.

## F. Validation and current evidence
**Fresh audit:** 74 existing unit regressions passed. Read-only database checks confirmed four scenarios and availability constraints. Public browser page rendered without errors; older loading error did not recur there. No database mutation, new simulation, authenticated behavioural or reviewer-positive flow was exercised.

**5.5.2:** signed-in instructions → connection → participants/conversation → assigned work → coaching revision/unresolved state → history/refresh → intentional conclusion. Inspect candidate/network payloads for privacy; check no wall editing, persistent link, unsupported/error states and Level 0 honesty. Repeat strong/leading/rushed/uninvited/intentional-stop comparisons; desktop/mobile. Reversible database tests cover owner/actor denial, quote lineage, retry identity and genuine simultaneous conflicts. Reviewer-positive checks need an authorized account, not convenience role grants.

**5.6:** concrete tests for 1/3, 2/3, 3/3; Practice/replay/duplicate/incomplete exclusion; fourth evidence and same Playbook allowance; concurrent completion. Test activity inference/confirmation/correction/low confidence/unsupported/multiple activities and timing citations/uncertainty/no automatic overrun penalty. Verify new evidence reaches rubric sections and old reports remain intact. Freeze a portfolio, rerun AI/add evidence: reviewed versions/decisions stay unchanged.

**Validity:** strong methodology plus repeated stakeholder weakness, and inverse, must preserve persistent weakness. Test improvement/contradiction/insufficiency without averaging. Verify authorized three-environment → portfolio AI → configured human handoff. Unit tests cannot prove semantic disclosure, methodology validity or calibration; approved content and human validation remain prerequisites.

## Stop boundary
Review first. Proposed initial authorization is **5.5.2 only**, restricted POC plus honest unsupported ordinary sessions until content/access approval. No automatic 5.6, production promotion, external integration, rubric replacement or full Chapter 3.
