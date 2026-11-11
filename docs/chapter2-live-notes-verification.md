# Chapter 2 live coaching and source-linked notes

## Result and preview entry

Existing scenario → saved Scope / Your Approach → Chapter 2 working session. No new route, workspace or scenario. Selected playbook, none and defer now share the existing attributed team conversation. The exact inherited Library/run link opens in a separate tab.

Desktop uses conversation/composer left and compact Team work right; mobile places work below. The panel reuses TeamWorkingWall, public quote validation and conservative self-correction reconciliation. Only recognized categories with actual notes appear. Empty state: “No team work recorded yet.”

The requested neutral coaching instruction is shown for a selected playbook, with conditional wording without a playbook. No probing suggestions, scoring feedback or automatic coach decisions were added. The optional e-learning aside was omitted because it is not verified as useful for every selection.

## Persistence and attribution boundary

- Notes are deterministic read projections of existing persisted, roster-attributed Chapter 2 stakeholder messages, not a new saved artifact or external Strategyzer state.
- Each note is an exact sentence quote with original message ID and speaker. Source click focuses/highlights that transcript message. Coach messages and unknown speakers cannot become notes.
- Categories recognize bounded explicit wording: customer jobs/pains/gains/focus, assumptions and BMC building blocks. A few bounded plain-language patterns cover actual Student Founder replies. This is not general semantic extraction; unsupported wording stays transcript-only. No claim of full canvas coverage.
- Notes are marked Draft or Assumption / unresolved; all are simulated claims, not validated customer research. The wall excludes an evidence category to avoid suggesting generated research is verified.
- Literal own-claim corrections reuse existing reconciliation; earlier projected revisions remain selectable. Ambiguous changes, another participant's unilateral correction and coach-only instructions cannot overwrite existing items. No historical message or artifact is rewritten.
- Reload recreates the same notes/revisions from the same ordered messages. Repeated message IDs are ignored; unchanged quotes are not re-added. Existing per-category safety cap is 12 items. Older composite bracket-tagged replies remain transcript-only because attributing their whole content to the row's first speaker would be unsafe.
- Opening scene is stable scenario/roster/outcome-grounded view-only context, not a persisted generated turn. It appears once, including after reload; no fabricated completed work. It never enters evaluation input or the wall. It is not a frozen historical opening snapshot if Scope subsequently changes.
- No extractor AI call, schema migration, backfill, permissions/allowlist change or new scoring input. Raw attributed conversation continues through existing assessment paths; generated team work is stimulus, not coach evidence. Non-selected conversations now carry truthful assessment context rather than claiming a selected playbook.

## Actual verification

### Regression tests

206 tests across 24 files passed. Added concrete tests for exact job/assumption/resource sources; exclusion of coach, unknown, question and old composite messages; duplicate IDs/reload; own reclassification with previous revision; ambiguous/coach/other-speaker correction safety; bounded plain-language real-AI examples; all four scenario openings; none/defer/undecided actual server-handler mock conversation and truthful assessment context. Existing nine-section mocked evaluation, old external surface selection, historical Scope, early stop, privacy and assessment-preservation suites passed.

Preview automatic compilation: latest entry `build OK` at 2026-11-11 21:46:39 UTC. No separate manual production build or typecheck was run; no standalone typecheck result claimed.

### Isolated browser

Actual current conversation and wall components were bundled into an intercepted localhost fixture; team responses and saving were replaced with synthetic browser-local adapters. No production route or real session was written. External data requests were blocked.

Student Founder with Competing on Business Models project-run link, Customer Profile verified Library listing, none and defer each passed:

- one composer and opening; exact selected URL / separate tab; no link when none/defer;
- three attributed material replies; job, assumption and key-resource notes;
- source focus; reload preservation; literal own reclassification; old revision selection;
- 1280×1800 desktop and 390×844 mobile, no horizontal overflow or browser exceptions.

Then actual AI messages from both isolated runs below were loaded into the same real components and visually inspected. BMC showed job, assumptions and key resources; Customer Profile showed gains and assumptions. No additional real API request was made by the browser.

### Actual AI, mocked persistence

The real existing sendPlaybookTeamTurn handler and its existing Gemini model were exercised through an in-memory database adapter with fictional public Student Founder context/roster and a populated Scope fixture. No shared database client was called. Six coaching turns produced 13 separately attributed stakeholder messages (7 Customer Profile, 6 BMC); none rejected. Saved Scope was passed through the real handler. Conversation-to-wall reload equality passed.

Per-turn times: Customer Profile 1.597, 1.311, 2.728 seconds; BMC 2.560, 1.450, 2.716 seconds. Approximately 12.4 seconds total test runtime.

Exact BMC examples:

- Maya Chen, Jobs / Draft: “We want to help students stop eating junk and actually cook for themselves without it taking over their whole lives.”
- Jordan Patel, Key resources / Draft: “Honestly, we have some base code for a recipe scraper and a rough database structure, but that's about it.”
- Jordan Patel, Assumption: “I think the riskiest assumption is that students—especially the budget-conscious ones Sofia mentioned—will actually pay for a subscription or even put in the effort to input their data.”

Synthetic correction example: Maya's “The customer job is to plan affordable meals.” moved from Jobs to Assumptions after her own “I reclassify \"plan affordable meals\" to assumptions.” Both original and correction remained source-linked in transcript/history. This explicit correction was NOT generated by the actual AI run.

## Limits and unchanged behavior

- No isolated hosted database was available/used; hosted saving, concurrency and full authenticated route were not verified. Browser persistence was mocked/local; real AI persistence was in memory.
- No fresh actual-AI assessment/report or reviewer screen was generated; existing nine-section mocked routing passed and rubric/thresholds stayed unchanged.
- No claim of exactly-once team-turn persistence on a lost successful network response: existing server path has no durable request identity for this conversation. Failed/rejected replies save nothing; regression retry passes, duplicate message IDs cannot duplicate notes, but successful insert with lost response followed by resend remains an existing unverified edge case.
- Real AI assumption challenge was exercised; deterministic refinements/history were unit/browser-tested, not guaranteed for unrestricted natural-language corrections. No semantic pronoun resolution or inferred consensus.
- External test-room surface selection and old wall defaults stayed unchanged and passed regressions; that full older gated room was not driven in browser.
- Existing legacy canvas screen still has “Probes you could ask” without Practice/Formal mode enforcement. This pre-existing standing-rule discrepancy was surfaced without changing that screen.
- No voice, historical session/evaluation, Strategyzer data, shared DB writes, publication or cleanup of user data.

## Files changed

`src/components/CustomerProfileReference.tsx`, `src/components/TeamWorkingWall.tsx`, `src/lib/conversation-work.ts`, `src/lib/conversation-work.test.ts`, `src/lib/simulator.functions.ts`, `src/lib/playbook-selection.ts`, `src/lib/playbook-selection.test.ts`, `src/lib/customer-profile-reference.test.ts`, `src/lib/AGENTS.md`, `roadmap.md`, this report.