# Stage 1 playbook reference correction

## Result
Stage 1 accepts canonical Strategyzer Library listing links and project playbook run links. It rejects bare dashboards, unrelated paths, look-alike hosts, HTTP, credentials, explicit ports, query strings, fragments, encoded separators and invalid path components. The user's private example was not fetched or accessed.

## Files
- `src/lib/playbook-selection.ts`: strict project-run parser; reference-kind/project/run fields in the existing brief JSON schema; identity consistency checks; provenance-aware roleplay and assessment context.
- `src/components/PlaybookChoice.tsx`: Playbook link/title labels, guidance for both shapes, enabled save for valid run links, explicit link-only disclosure and optional coach working brief.
- `src/components/CustomerProfileReference.tsx`: inherited project-run link opens under truthful Strategyzer playbook run wording.
- `src/lib/playbook-selection.test.ts`: five added regressions covering run save/restore/inheritance, security negatives, forged identity, frozen Scope revisions, working briefs and old listing compatibility.
- `src/lib/AGENTS.md`, `roadmap.md`: updated architecture note and task completion.

The normal Scope save still persists the decision inside the Engagement Brief. New project references retain `reference_kind: project_run`, `project_id`, `run_id` and the canonical URL; library/listing fields remain empty. Historical listing JSON missing the new fields reads with library-listing defaults in memory, without rewriting history. Run links never receive verified Customer Profile metadata from their title or an inferred listing ID. Coach-supplied text remains unverified context, not instructions. No/defer and the speaker parser are unchanged.

## Verification actually exercised
- Full regression suite: **192 tests in 23 files passed**, including assessment preservation, Scope compatibility, no/defer, team speaker attribution and the new run cases.
- Targeted link/reference/speaker suite: **30 tests passed**.
- Mock server-function test used the actual team-turn function with synthetic session and messages, mocked AI reply and mocked persistence. The generated prompt carried the precise synthetic run URL/ID, stated content was not loaded and omitted verified Customer Profile sequence despite a matching title. All nine existing section inputs assembled successfully; facilitation and strategy inputs retained the reference.
- Browser used the **actual preview ScopeBrief, PlaybookChoice and Chapter 2 reference components**, with mocked service functions, the actual Engagement Brief schema and browser-local persistence. No app route or harness file was added to the project. All external requests and non-GET network writes were blocked.
- Browser entered a bare dashboard: save disabled, guidance visible. Entered a synthetic run and title: save enabled; clicked save through ScopeBrief's normal mutation call, observed exact run identity in the local saved brief, refreshed, confirmed restored field and opened Chapter 2 display. Chapter 2 retained the identical URL and showed **“Link only — playbook content not loaded”**, not a Customer Profile sequence. The coaching input remained available.
- Desktop 1280×1800 and mobile 390×844 screenshots inspected: fields and guidance visible, no mobile horizontal overflow, no page errors. Screenshot files are temporary under `/tmp/browser/playbook-run/`.
- Preview compilation signal: `build OK` after changes. No separate manual TypeScript command was run; the platform checks compilation automatically.

Synthetic browser URL: `https://platform.strategyzer.com/projects/p/synthetic-student-team/dashboard/playbook_runs/syntheticRun42`. It was displayed only and never opened.

## Limits
No isolated hosted database was provisioned or used. Hosted persistence, authenticated full-route navigation, real AI generation/scoring and reviewer screens were not exercised. Browser persistence and service responses were explicitly mocked; this is not a hosted end-to-end claim. No shared records/schema/permissions/allowlists, historical revisions/evaluations, Strategyzer data or voice code changed. Nothing was published.