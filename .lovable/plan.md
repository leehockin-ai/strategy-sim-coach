# Coach Compass — Candidate Journey UX & Functional QA Audit (read-only)

## Test environment limits (read first)
- **Code inspection and read-only database counts only.** No signed-in browser walkthrough was run this turn, and no assessment was generated. Starting the AI assessment would write an evaluation and change session status, which this audit forbids. No sessions, roles, allowlist or evaluations were changed.
- Every point below is labelled **[Verified-code]**, **[Verified-data]** or **[Hypothesis]**. A hypothesis needs the Phase 0 reproduction to confirm it.

## Key data finding [Verified-data]
Sessions by stored progress: working_session 7 (2 with live runs), framing 5, intervention 3 (1 with a live run), method 3, evaluated 2, not_approved 1. **There are 3 evaluations in total. All belong to sessions with no live run. No session that used the live client team, or the current three-chapter flow, has ever produced an assessment.**

## Journey map as built
```text
/scenarios -> create session -> /sessions/:id
 Ch1 Scope: tabs Client | Your Approach; sub-tabs Scoping call | 1:1 conversations; Brief side panel
   MethodStep "commit & continue" -> status=working_session
 Ch2 Facilitate: Chapter2Container branches by pathway_type
   playbook + slug -> embedded ActivityRuntime -> StrategyzerWorkspace
       (start run -> copy project name -> paste URL -> 3 checkboxes -> Connect -> LiveClientTeam if allowlisted)
   other pathways -> legacy workspaces + "TEST/Strategyzer workspace" link to /activities (duplicate surface)
   shared button "Continue to Chapter 3" (always shown, no completion gate)
 Ch3 Advance: sub-tabs Judgment | Orchestration
   InterventionStep save -> Orchestration (5 legacy text sections)
   EngagementPathwayStep "Submit for assessment" -> generateEvaluation -> /report
```

## Prioritized findings

### P0: Assessment cannot be reached or completed reliably
1. **The assessment is only triggered from the last Chapter 3 sub-tab** (`EngagementPathwayStep.submit`, `_authenticated.sessions.$sessionId.tsx` ~3551). The report page has no generate button. Its empty-state copy ("Complete the intervention step…") points to a step name that no longer exists (`_authenticated.sessions.$sessionId_.report.tsx` ~100). A candidate who opens the report first hits a dead end. [Verified-code]
2. **The trigger is buried.** It is labelled "Step 06 · Portfolio-level orchestration" and is enabled once any one of five legacy sections has text. Nothing tells the candidate "this is how you finish." [Verified-code]
3. **Generation is one long synchronous call from the browser:** nine section calls, two skill calls, then a Pro synthesis call. There is no progress display, no retry and no stored failure state. The only feedback on failure is a toast. Two failure points are likely, but not reproduced: [Hypothesis]
   - the request may time out on the server; and
   - `loadLiveEvaluationEvidence` reads through the candidate's own permissions (`evaluation-live-evidence.server.ts` lines 11–44). If the candidate lacks read access to any table there, the whole assessment fails with "Live assessment evidence could not be loaded".
4. **If an assessment already exists, the function returns it silently** (~398). That is correct for immutability, but the UI does not explain it. [Verified-code]

### P0: Chapter 2 is unavailable for normal sessions
5. The live client team is gated to allowlisted TEST sessions with the "Map Out Customer Profile with AI" approach (`roomEligibility`, `working-session.ts`; `live-team.functions.ts` ~26). Every other playbook session shows "Client working session unavailable" with no next step. The candidate can still click "Continue to Chapter 3," so they skip the work entirely. **The gate stays.** The fix is honest copy and a defined fallback, not a wider gate. [Verified-code]

### P1: Chapter 3 is disconnected from Chapter 2
6. `InterventionStep` shows "Commitments from your 1:1s" (legacy `dialogue_commitments`). Its hint refers to "Live Playbook Facilitation." It does not show the team's working-wall outcome, its final status or the bound Brief outcome. `EngagementPathwayStep` is the old six-step "Engagement Orchestration." [Verified-code]
7. The shared "Continue to Chapter X" button (`SessionPage` ~182) has no completion check. Chapter 2 can be left with no run, no link and no conclusion. [Verified-code]

### P1: The Level 0 Playbook link is hard to use
8. Seven separate actions sit before the room appears: start run, copy name, leave the app, create the project, paste the URL, tick 3 checkboxes, Connect. The three checkboxes repeat one confirmation. [Verified-code]
9. Internal terms are shown to candidates: "Capability level 0 — Linked," "Bound Scope revision," "Assessment ref," "Connection & activity record," "Connection history." [Verified-code]
10. After connecting, setup collapses into a `<details>` element. The "Open Strategyzer Playbook" button is only in the room header, so it is easy to lose. [Verified-code]
11. There are two entry points to the same workspace: the embedded room in Chapter 2, and the `/activities` page linked as "TEST activity workspace." [Verified-code]

### P2: Navigation and labels
12. There are three layers of tabs in Chapter 1 (chapter → Client/Your Approach → Scoping call/1:1s), each with different styling. [Verified-code]
13. Session status labels don't match reality. The validation session is stored as `intervention` (Chapter 3) although Chapter 2 never ran (known from the earlier hand-off). The status says how far the candidate got, not what they finished. [Verified-data]
14. Saving Judgment sets status `intervention` even when the candidate is already further along. The progress guard keeps this safe, but it should be flagged. [Verified-code]
15. Mixed old and new design: the Chapter 3 screens use the old "Step 0X" design and copy. [Verified-code]

## Proposed journey (one main button per step)
```text
Ch1 Scope        -> [Commit approach & start working session]
Ch2 Facilitate   -> Card A "Set up Playbook" (one paste field + one confirmation, Open Playbook button)
                    Card B Client team room (or honest "not available in this release" + [Record your plan instead])
                    -> [Conclude working session]  (required before Ch3 unlocks)
Ch3 Advance      -> Shows the team's wall outcome + Brief outcome
                    Judgment -> Next pathway -> [Generate my assessment]
Report           -> progress states (Gathering evidence / Scoring / Drafting feedback),
                    retry on failure, clear "already generated" state
```
For the Level 0 link: never scrape, embed or verify the candidate's Playbook. Keep the "candidate-confirmed" wording. Keep "Open Playbook" pinned in the room header and in Chapter 3.

## Implementation phases (narrow, approved one at a time)
- **Phase 0, reproduce (no product changes).** Create one disposable TEST session on the allowlisted approach. Run Scope → link → room → conclude → Ch3 → generate in a signed-in browser. Capture server logs. Confirm or rule out hypothesis 3. Delete the session afterwards.
- **Phase 1, finish line.** Fix the actual cause of the generation failure. Add a "Generate assessment" action with progress and retry on the report and in Ch3. Fix the stale empty-state copy and the "already generated" state.
- **Phase 2, Chapter 2 clarity.** Collapse setup into one card. Use a single confirmation. Rename internal terms. Remove the duplicate `/activities` entry from Chapter 2. Add an honest unavailable state with a fallback. Gate "Continue to Chapter 3" on a concluded run, or an explicit "skip with reason."
- **Phase 3, connect Chapter 3.** Show the bound wall outcome and final status in Judgment. Update the copy. Keep the stored fields unchanged.
- **Phase 4, navigation tidy-up.** Flatten the Chapter 1 tabs and make chapter status labels show completion.

## Acceptance tests
- A real disposable session produces an assessment end to end. The report shows all nine rubric dimensions, and the live-room evidence appears in the reviewer view.
- Existing assessments are byte-identical before and after (preservation test).
- Candidate payloads still exclude hidden state and private notes (existing privacy tests).
- A non-allowlisted session shows the unavailable state and cannot open the room.
- Clicking Generate twice creates one assessment.
- A failed generation shows a retry and leaves no partial assessment.

## Unchanged by design
Nine rubric dimensions, live-room provenance, privacy boundaries, immutable evaluations, legacy compatibility, the POC gate, certification policy, and Stage 5.6.

## Technical references
`src/routes/_authenticated.sessions.$sessionId.tsx` (SessionPage 56–194, Chapter2Container 1179–1338, InterventionStep 3406, EngagementPathwayStep 3531), `src/components/ActivityRuntime.tsx`, `src/components/StrategyzerWorkspace.tsx`, `src/components/LiveClientTeam.tsx`, `src/lib/working-session.ts`, `src/lib/chapters.ts`, `src/lib/evaluation.functions.ts` (generateEvaluation 388–585), `src/lib/evaluation-live-evidence.server.ts`, `src/routes/_authenticated.sessions.$sessionId_.report.tsx`.
