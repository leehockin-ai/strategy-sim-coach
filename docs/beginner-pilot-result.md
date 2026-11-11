# ShiftNest beginner pilot — preview-only result

## Entry and isolation
Open **Scenarios → Try the opt-in ShiftNest two-meeting practice**, or `/pilot` in the current preview. Sign-in is required. The current project has no isolated hosted database. Per Lee's approval, this implementation stores pilot evidence only in owner-keyed browser local storage, using browser locks. No shared application rows, historic sessions/revisions, allowlists, Strategyzer data, voice, existing evaluations or reviewer decisions were written. Nothing was published or deployed.

Local storage is not tamper-proof, cross-device, or a certification evidence store. The pilot clearly labels this limitation. Its server function refuses production use. Ordinary scenarios retain their existing paths; pilot opt-in is separate.

## Implemented
- Fictional ShiftNest client, distinct from citizenM, with worker/household segmentation ambiguity and draft Customer Profile assumptions.
- Scope uses the existing 12-field schema and saved local revisions. A specific saved revision binds both meetings and the handoff; no historical-brief fallback.
- Two genuine AI coaching meetings, participant continuity, read-only team work, existing exact-quote extraction and conservative reconciliation. Candidate cannot directly edit team work.
- Persistent link to Lee's actual playbook preview. No simulated project confirmation, canvas editor, full instructions replica, external control or Value Map requirement.
- Unique local handoff checkpoint with frozen Scope, approach, actual transcript and prior profile; a lock/lease prevents ordinary concurrent checkpoint writes. Structured generation validates participant/source identities and references. Agreement references can only point to that participant's saved team speech; semantic agreement meaning remains prompt-governed, not independently proven.
- Read-only update compares prior items with proposed additions/revisions/removals, fictional team actions, explicit simulated evidence, contradictions, limitations and questions. Proposals never automatically overwrite prior team work. Candidate acknowledgement binds the exact saved update to meeting two and frozen assessment input.
- Intentional stop needs a reason and creates no fake synthesis or handoff. Deferring the tool remains available.
- Existing isolated rubric scoring, skills and synthesis calls are reused. All nine dimensions and thresholds unchanged. Pilot-only input rules distinguish generated stimulus from candidate competence, AI assistance and verified evidence. Existing reports are not regenerated.
- Recoverable local update error, completed-output reuse, explicit resume/retry, bounded assessment batches and preserved settled steps; no autonomous background job claim.

## Observed verification
Signed-in local Chromium, November 11, 2026:
- First real roleplay response: **13.61 seconds**, no page errors.
- Full continuation: real team-owned research proposals, handoff, actual AI update, refresh, meeting-two questioning, conclusion, candidate next move and actual nine-dimension report.
- Update generation: **71.85 seconds**; earlier attempt **76.84 seconds**. Reload retained byte-equivalent checkpoint data before meeting two.
- Assessment: **88.39 seconds**, all nine scored; no placeholder section. Recommendation: **human_review_required**.
- Retained local pilot ID: `de6f5ee5-0c78-4aa4-8a2b-00a7e6bf77f0`; update checkpoint `3c06ba41-4dc1-4833-9f69-16d3f93550d0`; Scope revision 1; 14 events; candidate-seen timestamp and report-bound update ID confirmed.
- Scores: framing 4, strategy 3, stakeholder navigation 5, facilitation 5, methodology 5, intervention discipline 4, engagement pathway 3, intervention fit 4, execution 5. These are uncalibrated practice observations, not proof of rubric validity or certification.
- Generated update contained 6 actions, 6 simulated evidence items and 6 proposed changes. Team reports retained recruitment failure and unpaired/small-sample limitations; meeting two challenged interpretations and kept segmentation open.
- A clearly labelled **mock local transport failure**, not a provider outage, displayed the failure state. Explicit retry used a real AI call and recovered in **69.91 seconds**, keeping checkpoint identity. Original completed local test/report restored unchanged after this mock recovery exercise.
- Report reload retained nine sections. Mobile 390×844 showed no horizontal overflow. Desktop 1280×1800 screenshots reviewed. Ordinary Student Founder card remained visible.
- **173 tests passed across 22 files**; automatic preview build/type signal: **build OK**.

## Defects found during development
The new local next-move input initially read the input event after an asynchronous lock, leaving its value unsaved. Fixed within this implementation and full flow rerun passed. The initial pilot exposed only one Chapter 3 note, while synthesis retained the existing five-section pathway expectations. All five existing pathway note fields are now exposed without making them required; the retained test report predates that presentation correction and was not regenerated. Its gaps about missing pathway documentation should therefore be interpreted with this timing limitation.

## Files
- Added `src/lib/beginner-pilot.ts`, `beginner-pilot-storage.ts`, `beginner-pilot.functions.ts`, `beginner-pilot-ai.server.ts` and two regression test files.
- Added `src/routes/_authenticated.pilot.tsx`; added opt-in link in `_authenticated.scenarios.tsx`.
- Added server-only gateway helpers and boundary note under `src/lib/pilot-ai/`.
- Pilot-only branches in `evaluation.io.ts` and `evaluation.functions.ts`; ordinary assessment model IDs/endpoints and prompts unchanged when no pilot input exists.
- Added `docs/unapplied/0013_beginner_pilot_checkpoints.sql` as **unapplied source**, outside the automatic migration journal. It sketches hosted checkpoint uniqueness, owner reads and immutable ready output, but no hosted store/meeting adapter is enabled.
- Dependencies/lockfile, generated route tree, roadmap and this report.

## Not verified / blocked
- Isolated hosted persistence, actual deployed timing, cross-device resume, hosted DB lease/concurrency/RLS and reviewer-positive UI: blocked by absence of isolated hosted storage. The source migration is not applied or runtime wired; deployment needs a separately authorized isolated environment.
- Actual provider failure, credit denial/refusal recovery and refresh mid-provider-request were not forced; checkpoint expiry/reload behavior is unit-tested, while mock failure recovery is browser-observed. Crash recovery may require another provider invocation; one authoritative saved result is not exactly-once billing.
- Live simultaneous-tab assessment races and another real candidate account were not exercised. Browser-owner isolation/leases are not substitutes for hosted authorization.
- No full second run of a legacy scenario or formal certification test; regression suite and existing-card inspection establish narrower compatibility.
- No systematic strong-versus-weak coaching calibration, independent semantic agreement verifier, or human assessment approval. Review the generated commentary before relying on its judgments.

Implementation used the **AI SDK gateway** skill for the new structured streaming generation; existing scoring infrastructure was retained.