# Opt-in beginner Customer Profile pilot

## What candidates get
An explicitly opted-in **practice pilot** inside the existing three-chapter journey, with two coaching meetings and a fictional team-owned Customer Profile update between them. Existing scenarios, certification access and historical records stay unchanged. No publishing, Strategyzer changes, external integration, copied instructions or canvas editor.

The real playbook preview remains a persistent external link:
https://platform.strategyzer.com/playbook_libraries/strategyzer_library/listings/18

Use only Lee's verified sequence as background context: Customer Profile introduction, citizenM example of jobs/pains/gains, AI-assisted mapping, refinement. The fictional case is unrelated to citizenM. The output is a Customer Profile; no Value Map requirement.

## Fictional case and flow
**ShiftNest**, a small team exploring support for shift workers arranging meals around changing schedules. Their segmentation ambiguity is whether they serve individual rotating-shift workers or household members coordinating meals. Team members bring draft jobs, pains and gains explicitly labelled assumptions, modest research capacity and a near-term decision—not a polished or validated profile.

1. **Scope / meeting 1:** retain the candidate-authored Engagement Brief and saved revision. The team presents its rough profile. The coach questions the focus, chooses how to facilitate or defer the tool, and discusses what evidence the team should gather. No automatic coach decisions, required perfect artifact or forced Playbook use.
2. **Normal handoff:** preserve the first meeting's conclusion and rationale. Freeze its exact Scope revision, public team contributions, profile, actual coaching decisions and team-adopted actions. Generate one structured fictional update for this checkpoint. Distinguish coach proposals from team agreements; absent agreements remain absent. Intentional early stop remains valid and must not silently trigger a fictitious normal handoff.
3. **Between meetings:** the AI client team reports its own fictional activities and proposed changes. Every evidence item is clearly simulated, attributed to a participant, and may be contradictory, weak or missing. No invented coach agreement, self-validation, externally verified result or automatic resolution of segmentation.
4. **Meeting 2:** show a compact, read-only comparison of prior profile and proposed additions, revisions and removals, what the team did, simulated evidence, limitations and open questions. Continue roleplay with the same team, frozen update and earlier context. Proposed changes do not overwrite prior work or become agreed facts merely because AI produced them.
5. **Advance / assessment:** preserve Chapter 3 and the existing nine-dimension generation/report path. Evaluate the coach's actual questioning, evidence/assumption distinctions, treatment of contradictions, unresolved decisions and next intervention—not generated homework polish. Justified restraint is legitimate. Human review remains final certification authority; the pilot itself does not become approved certification content.

## Persistence and recovery
- Persist a unique checkpoint job and immutable generated update, bound to the first meeting's exact evidence. A database lease prevents concurrent generation; completed checkpoints return their saved result rather than regenerate.
- Generation is explicitly initiated by normal handoff. Reload reads durable state and offers resume/recovery; no unbounded automatic generation from page renders. Retain completed output and prior evidence across retry.
- Validate the structured response, participant identities, change references and coaching-source references before saving. Unsupported references fail safely; do not repair them by inventing evidence.
- Expose generating, ready and failure states. Transient retries honor bounded backoff; credit/policy/provider blocks follow existing gateway safeguards and require appropriate explicit recovery. Do not claim autonomous background execution after the browser closes.
- Record which exact update version was presented for meeting 2, and include that frozen public evidence in the existing first-assessment snapshot. Keep generated client context separate from candidate performance evidence.

## Technical approach
- Add a versioned pilot configuration and a narrow adapter over existing scenario/session creation, coaching roleplay, append-only events, team-work validation and assessment generation. Two meetings belong to one new pilot session; they are not a redesign of all engagements.
- Do not pretend the playbook preview is a connected Strategyzer project. Pilot room entry must not require fake project creation or confirmation. Reuse the live-room engine with explicit pilot identity rather than mislabelling simulated homework as external state.
- Separate public candidate-seen updates from private simulation configuration. Owner/reviewer reads use existing boundaries; privileged writes verify ownership first. Existing POC allowlists remain untouched; pilot eligibility applies only to newly opted-in practice runs.
- New AI generation uses the documented Lovable gateway streaming/structured-output path. Preserve existing model selection and request behavior on unrelated calls.
- Reuse existing immutable Scope and event references; never substitute an older populated brief, rewrite historical revisions, repair the existing investigation fixture or regenerate an existing report.
- Add focused domain tests beside existing tests and record structural rules in AGENTS.md. Retain semantic design tokens and existing controls. Inspect route titles/descriptions; give any new page its own metadata.

## Preview-only approval boundary
The current preview and published app share Lovable Cloud data. Applying new persistence tables or scenario rows there would also change the published backend, even without publishing code.

**Specific decision required before those writes:** use an isolated draft/preview backend, if available, or explicitly authorize additive pilot-only tables/configuration on the shared backend. Default: no shared-backend writes until this is resolved. No deployment or publishing is authorized by this plan. Existing test-session allowlist entries will not be added or altered; surface any separate access approval needed for verification.

## Verification and delivery
- Focused regressions: opt-in versus ordinary/historical runs; two meetings without progress regression; exact Scope binding; coach proposal versus team adoption; valid/invalid simulated update references; no Value Map requirement; intentional restraint/stop; ownership/private-state denial; unique checkpoint, concurrent claim, retry and immutable completion; exact candidate-seen assessment version; unchanged rubric keys and prior report preservation.
- Signed-in UI walkthrough on one newly authorized disposable pilot run: populate Scope, genuine meeting-1 coaching, handoff generation, refresh, compare update, meeting-2 roleplay, Chapter 3 and a fresh nine-dimension report. Preserve the test data. Exercise failure/retry safely where feasible; disclose unexercised provider failures or concurrency rather than fabricate them.
- Check desktop/mobile rendering, existing scenario entry/resume compatibility, relevant tests and automatic build/type signals. Hosted behavior remains unverified because publishing is prohibited.
- Report changed files, exact preview entry point, generated evidence/report lineage, timings, test results and every untested behavior. Stop after this bounded pilot.