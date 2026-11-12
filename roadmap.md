# Stabilization roadmap

## All-start confirmation parity
- [x] Trace built-in/custom start order and show the shared preflight immediately on every built-in start; retain identity validation, guarded Continue, custom drafts and resume.
- [x] All four built-in buttons and custom Start verified on desktop/mobile/keyboard with cancel-only signed-in checks; custom drafting used a browser-only fixture. 351 tests passed; preview build OK; no sessions created or publish. Details: docs/scenario-preflight-parity-verification.md.

## New-scenario preflight
- [x] Shared accessible brief on seeded/custom explicit new starts; preserve draft/retry/resume and prevent creation before Continue.
- [x] Isolated desktop/mobile/keyboard and duplicate-start verification, regressions/build; no shared writes or publish. Details: docs/scenario-preflight-verification.md.

## Disabled Gmail assessment transport
- [x] Prepare server-only OAuth refresh/send transport, exact registered template, durable no-blind-retry boundaries and isolated mocks; no live mail or shared writes.
- [x] Document one-time Google setup, secure secrets and isolated enablement prerequisites; no temporary mock route found, UI unchanged. Details: docs/assessment-gmail-setup.md.
- [ ] Gmail activation waits for Lee's Google OAuth/secure Secrets setup, approved isolated outbox installation and dispatcher verification, plus separate approval for first controlled email; sending remains disabled.

## Assessment email and isolated storage setup
- [x] Registered assessment-ready template, disabled supported send-route adapter and staged owner-checked outbox claim/settle SQL; 301 tests passed, 5 opt-in tests skipped, preview build OK. Details: docs/assessment-email-storage-setup.md.
- [x] Create separate staging draft and confirm its own test database; no shared schema/data writes.
- [x] Configure notify.strategyzer.com managed sender, template helper and protected preview; no platform queues or shared database changes. DNS verification pending; no real sends or publishing.
- [ ] Enable automatic assessment notices: blocked by isolated completion/idempotency verification and separate approval to activate sends; completion stays disabled.
- [ ] Install private schemas and verify hosted storage in the staging draft: requires work in that draft after preview changes are saved and refreshed there.

## Reviewer materials and real-path parity
- [x] Preview/published read-only checks and 64-case isolated entry matrix; historical transcript visibility and stale external conclusion parity corrected without history writes.
- [x] Optional private reviewer note/files at explicit formal submit, staged schema only, scoring separation and ownership/role checks.
- [x] 292 regressions plus separate real-AI isolated board test; disposable SQL policies/submit and actual report-screen mocked submit/retry/download verified. Details: docs/reviewer-materials-and-parity-verification.md.
- [ ] Hosted reviewer-material enablement: blocked by approved isolated backend/schema installation, private storage lifecycle and signed-in owner/reviewer verification; current hosted intake fails closed.

## App-wide functionality coverage
- [x] Unify modern/historical Chapter 2 entry, preserve alternative approaches and legacy evidence, suppress certification-only hints, validate seeded/custom scenario context and shared controls.
- [x] 282 tests passed; 12 isolated ordinary-screen desktop/mobile cases passed send/reload and shared controls. Hosted custom-launch and email remain blocked by their documented setup prerequisites; no shared writes. See docs/app-wide-functionality-coverage.md.

## Approved private practice launch
- [x] Frozen owner-private Start, same journey adapters, certification exclusion and separate future entitlement hooks.
- [x] Unapplied schema audit and disposable PostgreSQL ownership/idempotency tests; 275 regressions. Isolated ordinary-screen journey through Chapter 3/generating verified with real scoping/team AI; final report run interrupted. See docs/private-practice-launch-verification.md.
- [ ] Hosted enablement: blocked by permission to install and verify private schema in an isolated backend; shared backend must not be changed.

## Contextual client-team reactions
- [x] Shared transcript-grounded interaction rules across scoping, stakeholder, normal Chapter 2 and gated live team; refusal-only artifact guard, no scoring/UI/state contract changes.
- [x] Mock attribution/history/refusal checks and eight isolated actual AI turns inspected; core regressions/build checked. Observed scoping invented-observation gap documented, not claimed resolved; no shared writes or publish. Details: docs/team-tone-verification.md.

## Assessment notices and private custom practice
- [x] Central completion notice contract, unapplied outbox design, mock retries and truthful unconfigured status.
- [x] Private in-memory intake/extraction and editable AI review; hosted Start fails closed.
- [x] 248 regressions; separate real AI draft and generated-roster team turn on isolated storage; actual-screen fixture intake/edit/sample desktop/mobile; build OK. Prerequisites in docs/assessment-notices-custom-practice-verification.md.
- [ ] Enable durable assessment mail: blocked by approved domain/infrastructure setup, outbox migration and dispatcher verification; none applied or sent.
- [ ] Enable hosted custom practice: blocked by isolated backend availability, permission to apply private schema and full persisted report verification; adapters are implemented, hosted Start remains disabled.

## Chapter 2 simple visual workspace
- [x] One active reference and collapsed Playbooks used; four read-only views share note IDs, history and source-derived origins without changing chat, Scope or storage.
- [x] 223 regressions passed (two opt-in live tests skipped); isolated actual-screen desktop/mobile checks passed collapse/add/back/reload, cross-view note IDs, original/revision origins, source focus, unmapped notes, draft/screenshot preservation and keyboard tabs. Build OK. Hosted persistence, real AI and physical voice not retested; no shared writes. Details in docs/chapter2-visual-workspace-verification.md.

## Chapter 2 screenshot and spoken turns
- [x] Added in-memory screenshot attach/paste, preview/remove and owner-authorized image-aware team replies; only reference notice and attributed speech persist, never pixels.
- [x] Reused opt-in single-turn dictation and stakeholder read-aloud with editable text/browser fallback in one composer; no ambient recording or automatic submission.
- [x] Real AI through actual team handler with isolated browser persistence verified image-specific answer, failed draft/retry, explicit board addition/revision and source/reload. Styled desktop/mobile and simulated voice APIs passed; 218 regressions passed. Hosted save, physical microphone and paid speech playback unverified; no shared writes or publishing. Details in docs/chapter2-screenshot-voice-verification.md.

## Chapter 2 live coaching and source-linked sticky notes
- [x] Added one selected/none/defer conversation, stable view-only scene-setting opening, and compact exact-quote work projection from attributed persisted messages; no new store or shared writes.
- [x] 206 regressions and isolated desktop/mobile components passed; six actual AI turns produced 13 attributed team messages, rendered locally with source notes. Hosted persistence/full route assessment not exercised; coverage and retry limits in docs/chapter2-live-notes-verification.md.

## Stage 1 project playbook run links
- [x] Accept strict canonical Library listings and project playbook runs in versioned Scope; preserve distinct IDs, provenance, historical listings and speaker attribution.
- [x] 192 regression tests passed; actual Scope/Chapter 2 browser components passed synthetic local save/reload and mobile checks. Preview build OK; no shared writes, private project access or publishing. Hosted persistence and real AI scoring not exercised.

## Four-scenario playbook correction
- [x] Removed active standalone pilot, dependency-only helpers and pilot assessment branches; preserved browser data and historical records.
- [x] Optional Customer Profile reference in normal Chapter 2 for all four existing scenarios; reuse session-plan JSON, attributed team messages and ordinary nine-dimension assessment.
- [x] 169 regression/mock tests, actual four-scenario AI context checks and signed-in read-only desktop/mobile preview passed. Shared save/reload/full assessment E2E not exercised; no shared writes or publishing.

## Opt-in beginner two-session pilot
- [x] Approved isolated-preview implementation only; current surface has no isolated hosted database. Use owner-scoped local preview storage/mocks, stage migrations without applying; no shared writes.
- [x] Added opt-in ShiftNest local-preview two-meeting journey; reused Scope schema, work reconciliation and existing rubric execution. No existing session writes.
- [x] Frozen handoff/update and candidate-seen binding, browser locks and local failure recovery; hosted checkpoint SQL staged unapplied.
- [x] Real signed-in local two-meeting run/report, exact update reload, mock failure → real retry, mobile/ordinary scenario checks; 173 tests passed. Hosted persistence/reviewer verification blocked by no isolated hosted storage.

## Approved read-only investigation and desktop inspection plan
- [x] Investigated disposable revision 3: full blank brief replacement preceded correct run binding; originating action remains unconfirmed, no write reproduction or fixes. Separate remedy/fixture-recovery approval needed.
- [x] Delivered Lee-led Library/ChatGPT Work inspection protocol and later disposable-project experiment scope; no external account access or integration. Walkthrough needs Lee's redacted evidence; experiment needs separate approval.

## Sequenced verification and engagement audit
- [x] Renamed only approved corrections session; stopped signed-in verification at empty bound Scope revision 3 (older populated revisions retained). No team turns/report generated; continuation requires separate approval, all data preserved.
- [x] Read-only multi-session engagement audit and staged next-work specification delivered; no product implementation or external-access claims.

## Bounded post-Phase-4 corrections
- [x] Trace and correct obsolete commitments input for new three-chapter assessments without changing rubric or prior reports.
- [x] Reconcile explicit team-owned wall corrections conservatively with public provenance and append-only history.
- [x] Replace candidate internal POC label and run regression tests.
- [ ] Disposable live-room/assessment walkthrough: approved session 20eedb6f-6639-46c6-a951-f0a9a56abbd8 now passes existing gate; blocked by empty bound brief, pending authorized reproduction/setup decision; retained without further evidence changes.

## Evaluation Evidence Integration and Validation
- [x] Assemble bounded public live-room evidence with owner authorization, bound Scope and validated revision lineage.
- [x] Route observable evidence into existing section/skills assessments and quality signals; preserve rubric and historical evaluations.
- [x] Add read-only reviewer evidence and deterministic regressions; signed-in report/reviewer-denial checks completed. Live AI evaluation and positive reviewer walkthrough not executed; no existing user assessment changed. Report delivered; stopped before Stage 5.6.

## Stage 5.5.2 — Approved restricted candidate working session
- [x] Correct assignment privacy and bound Scope anchor with regressions.
- [x] Restore canonical Chapter 2, neutral instructions, persistent Playbook access and read-only Customer Profile wall; preserve POC gates and honest unavailable states.
- [x] Exercise five candidate facilitation comparisons, provenance/history/refresh and desktop/mobile; report observed results and model-status limitations. Disposable fixtures removed; stopped before Stage 5.6.
- [ ] Fresh privileged rollback database regressions: blocked by unavailable privileged transaction runner; no grants widened.

## Consolidated product direction — audit and plan only
- [x] Audit coaching room, causal working wall, current gating and Level 0 boundaries against the consolidated brief.
- [x] Audit simulation evaluation, Practice/Formal distinctions, activity/timing evidence and three-distinct-environment portfolio implications.
- [x] Prepare staged audit plan with conflicts, migrations and behavioural validation; 74 regressions passed. Stop for Lee's review without implementation.

## Stage 5.5.1 — Causal team work-product proof
- [x] Plan the narrow Customer Profile POC using existing runtime, events, artifacts and private team state.
- [x] Implement semantic work assignments and team-owned simulated work with causal, append-only revisions.
- [x] Verify observed behavioural Tests A–E; 74 unit tests, reversible privacy/lineage/identity/conflict database checks and signed-in refresh/history/conclusion checks passed. Live simultaneous concurrency and reviewer-positive UI remain unverified.
- [x] Report results and limitations in the Stage 5.5.1 report; disposable sessions removed. Observed causal proof passed, not production certification validation. Stopped after Stage 5.5.1.

## Stage 5.5 — Candidate Experience Alignment
- [x] Three-chapter candidate orientation (Scope the Engagement / Facilitate the Work / Advance the Outcome) without locking or wizard rigidity.
- [x] Client Brief: candidate payloads now carry public client context only (safe scenario projection); system prompt, ambiguity factors, unrealistic aspects and stakeholder postures no longer reach candidates.
- [x] Persistent participant identity (deterministic initials/color fallback, optional portrait) across Brief header, Scope conversations and Live Client Team.
- [x] Scope as one engagement workspace (Client / Your Approach with Scoping call and 1:1 conversations); legacy framing summary is read-only and points to the Engagement Brief.
- [x] Customer outcome as through-line into Facilitate the Work; working-session workspace reframed, setup collapses once connected, Engagement Brief outcome anchors the room; Live Client Team shows participant identities.
- [x] Terminology audit (evaluator/reviewer/scoring copy removed from candidate view), landing cleanup. 63 tests pass, build OK, signed-in browser checks passed.
- [ ] Human walkthrough by Lee across scenarios; responsive/mobile spot check. Stop before Stage 6.

## Stage 5 — Live Client Team (POC)
- [x] Shared room, private participant state, evidence reveal, synthesis and conclusion on the Customer Profile POC; Tests A–F, security checks, transcripts and report done. Stopped before Stage 6 (pacing). Next: separate UI/UX cleanup pass per Lee.

## Stage 3 — Playbook Activity Runtime Foundation
- [x] Add configurable/versioned activity definitions, protected simulation truth, durable runs and Scope revision linkage.
- [x] Add atomic ordered/idempotent event append and event-linked artifact history; reserve time fields without timing rules.
- [x] Prove one TEST/NON-PRODUCTION runtime workspace without replacing current Apply or changing Scope.
- [x] Verify candidate privacy/ownership, concurrent retries, refresh, legacy format compatibility and unchanged progress; temporary data removed. 43 unit regressions and reversible database checks passed.
- [x] Report architecture, results and concerns; stopped before Stage 4. Reviewer-positive browser and other owners' historical rendering remain access-blocked below.

## Stage 2 — Integrated Scope
- [x] Close internal_notes privacy across candidate payloads and direct reads; denial verified before Scope work.
- [x] Add editable Engagement Brief, revision trail and optional intervention sequence without rewriting historical evidence.
- [x] Integrate existing conversation, stakeholder and intervention capabilities into one Scope workspace; preserve Apply simulation implementation.
- [x] Map ten Scope competencies into existing evaluator calls, emphasizing decision clarity.
- [x] Complete signed-in Scope journey, privacy, refresh/history, unsaved-exit protection, progress protection and desktop/mobile checks; 36 regressions and reversible database checks passed. Report supplied; stop before Stage 3.
- [ ] Authorized reviewer-positive browser verification: blocked by the requesting account lacking reviewer/admin access; no roles changed.

- [x] Stage 0: baseline and compatibility fixtures for all existing statuses/formats; all historical rows unchanged.
- [ ] Browser verification of all historical sessions: requesting user's one owned session passed; remaining sessions require their owners' or authorized reviewer's session. One historical session has no owner; do not reassign it without approval.
- [x] Stage 1: canvas saves and backward status writes cannot regress progress; assignment roll-up verified.
- [x] Diagnose stakeholder persistence; new-session seeds and two real 1:1 turns persist across refresh.
- [x] Restrict hidden-state reads and server reviewer endpoints; candidate denial verified.
- [x] Report changes, root cause, compatibility results and risks; stopped before Stage 2.- [x] Revised Stage 4: Strategyzer Playbook handoff & external runtime (Level 0). Waiting on Lee's real Strategyzer account test and approval before the AI-team stage.

- [x] Phase 1: resumable background assessment generation, report progress/retry, "Generate my assessment" CTA, current copy (hosted site not yet verified — needs publish)
- [x] Phase 2: Chapter 2 clarity — one-link Playbook connection, plain wording, single entry point, start/facilitate/bring together/conclude stages with early stop, Chapter 3 gated on conclusion or recorded reason (server enforced, legacy-compatible)
- [ ] Phase 3+ (connect Chapter 3 to the working-session outcome, navigation tidy-up) — awaiting user go-ahead
- [x] Phase 3: Chapter 3 connected to bound Engagement Brief outcome, attributed team work/statements, open items and truthful session ending; old Step labels replaced; read-only, no migration. "Outcome unavailable" traced to test fixtures (empty brief / copied sessions without binding), not a binding bug.
- [ ] Phase 3 follow-up: full fresh signed-in run (Scope → room with team turns → Chapter 3 → assessment) on a new disposable session; hosted site check.
