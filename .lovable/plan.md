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
1. **Room availability is not just layout.** Chapter 2 uses legacy canvas branches; the room is on a sibling workspace and disappears when unavailable. Live checks found four scenarios, one unapproved POC config, zero allowlisted sessions, no activity definitions and two external runs lacking matching approved rooms. Server access and artifact writes enforce POC gates. Restore the eligible POC first; ordinary rooms require approved content and aligned permission rules—not bypassed gates.
2. **Generic rendering is not generic simulation.** Customer Profile generation/extraction is hard-coded. One adapter must cover both; invent no other activities.
3. **Old assistance/editors conflict with formal neutrality.** Preserve historical readers/Practice compatibility, but exclude advice and candidate-authored canvases from the new formal room.
4. **Assignment privacy gap:** callable assignment detail returns ambiguity factors and unsanitized stakeholders despite no current assignment page route. Plan a focused safe-projection correction; none made during audit.
5. **Scope anchor drift:** runtime shows latest Scope although runs bind saved Scope. Anchor room/evaluation to the bound revision.
6. **Mode/completion missing:** Practice currently means unsubmitted for human review; no committed attempt mode exists. AI generation marks completion, separately from room conclusion. Separate mode, valid engagement completion, AI feedback and human request. Intentional stopping is valid; abandoned/empty attempts are not.
7. **Evaluator evidence incomplete:** legacy transcripts/canvases dominate; new room/work evidence is not joined and timestamps/IDs are lost in rendering. Enrich existing sections, not completeness-based scoring.
8. **Human fields protected, evidence mutable:** AI overwrites one report/session and candidate artifacts can change. Freeze/version new formal evidence and bind decisions to it. Administrative averages and single-session thresholds cannot become portfolio Pass rules.

## D. Proposed stages
### Stage 5.5.2 — Restore room and visual team wall
1. Close assignment safe-projection gap with a privacy regression.
2. Compose one canonical Chapter 2 using the existing room; preserve sibling resume URL and legacy evidence access, not a third chat or duplicate editor.
3. Show supplied neutral instructions before Begin; participants/transcript/natural coaching input become primary, with read-only team wall.
4. Compact bound-outcome/intervention/Playbook anchor and persistent Playbook/Brief links; demote setup/history.
5. Generic wall over saved work/history, one versioned Customer Profile adapter; attribution/source links, revision viewing, gaps and incomplete states. No hidden-truth-derived badges.
6. Explicit loading/error/connection/unsupported states; retain POC labels/gates and Level 0 honesty.
7. Keep synthesis/conclusion contract: natural-language intentional stop changes work state, not automatic session conclusion.
8. Validate, report limitations and **stop**.

**Migration:** no evidence-schema replacement. Prefer frozen configuration for adapter metadata and compatible old-work defaults. Ordinary eligibility expansion needs separate content approval and reviewed migration, never global gate removal.

### Stage 5.6 — Separate increments and authorization
- **A — Attempt contract/freeze:** commit Practice/Formal, environment/policy before evidence; idempotent completion and frozen manifest. Legacy attempts remain unclassified, not automatically formal. Protect frozen evidence without chapter-navigation locking.
- **B — Activity/pacing:** post-conclusion inference from public evidence, candidate confirms/corrects; low confidence asks selection, unsupported/unknown/multiple activities remain honest. Append candidate-confirmed records. Approximate event-window timing considers inactivity/latency/uncertainty, no fake timer or automatic penalty.
- **C — Simulation AI/history:** enrich relevant existing rubric sections; immutable evidence/rubric/prompt/model-linked evaluation versions; compatible reports. Useful AI in both modes independent of human purchase.
- **D — Portfolio:** immutable owner/policy member revisions; transactional distinct completed formal environments 0/3 → 1/3 → 2/3 → 3/3. Exclude Practice, repeats/replays, abandoned and unapproved POC. Same Playbook across environments allowed; fourth adds evidence via new revision. 3/3 means eligibility, not Pass.
- **E — Portfolio AI/human:** cited recurring/situational strengths, weaknesses, improvement, contradiction and insufficiency—not averaging. Optional configured review freezes portfolio/evaluation versions; authenticated decisions/supersessions append and remain authoritative. No pricing or uncalibrated thresholds.

Mode, completion and immutable evidence must precede trustworthy counting/synthesis. Approved simulation content is a separate prerequisite, not grounds to fabricate three rooms.

## E. Technical details and migration implications
- Principal files: session Chapter 2 dispatch/Apply, `ActivityRuntime`, `StrategyzerWorkspace`, `LiveClientTeam`, `live-team.functions`, `team-work`/`team-disclosure`, `evaluation.functions`/`evaluation.io`, report/reviewer routes. Assignment gap: `assignments.functions.ts:64–70`; Scope anchor: `activity-runtime.functions.ts:30–39`.
- Runtime migrations are `drizzle/migrations/0005`–`0010`; deployed POC artifact gate matches them. Existing evaluation is unique by session with protected human fields.
- Stage 5.6 adds attempt/completion records, frozen manifests, confirmations, evaluation versions, portfolio/member revisions and review history. Reference existing evidence IDs/versions; later evidence creates revisions, never historical rewrites.
- Explicit grants/RLS, owner/reviewer access, private-feedback separation and atomic ownership/reference/retry/concurrency checks. Reuse authenticated functions; authorize reviewer before privileged imports.
- Approve content and prospective repeat/member-selection policy first. Proposal: legacy attempts do not automatically count; repeats add no distinct slots or silently replace frozen members.

## F. Validation and current evidence
**Fresh audit:** 74 existing regressions passed; live read-only inventory confirmed availability constraints. Public page rendered without errors. No new simulation, database mutation or authenticated/reviewer-positive journey was exercised.

**5.5.2:** signed-in instructions → connection → participants/conversation → assignment → coaching revision → history/refresh → intentional conclusion. Verify privacy, no editing, persistent links, unavailable states and Level 0. Repeat strong/leading/rushed/uninvited/stopping comparisons; desktop/mobile. Database tests: owner/actor denial, lineage, retries, simultaneous conflicts. Reviewer checks require authorized access, no role grants.

**5.6:** concrete tests for 1/3, 2/3, 3/3; Practice/replay/duplicate/incomplete exclusion; fourth evidence and same Playbook allowance; concurrent completion. Test activity inference/confirmation/correction/low confidence/unsupported/multiple activities and timing citations/uncertainty/no automatic overrun penalty. Verify new evidence reaches rubric sections and old reports remain intact. Freeze a portfolio, rerun AI/add evidence: reviewed versions/decisions stay unchanged.

**Validity:** strong methodology plus repeated stakeholder weakness, and inverse, must preserve persistent weakness. Test improvement/contradiction/insufficiency without averaging. Verify authorized three-environment → portfolio AI → configured human handoff. Unit tests cannot prove semantic disclosure, methodology validity or calibration; approved content and human validation remain prerequisites.

## Stop boundary
Review first. Proposed initial authorization is **5.5.2 only**, restricted POC plus honest unsupported ordinary sessions until content/access approval. No automatic 5.6, production promotion, external integration, rubric replacement or full Chapter 3.
