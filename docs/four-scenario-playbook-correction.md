# Four-scenario playbook correction

## Preview entry
Open an existing scenario session → **Chapter 2 · Facilitate the Work → Working session design · optional reference**. Choose **Use this reference with the client team** to coach that scenario's team. Keep the current approach / another playbook or defer without changing the committed intervention. The real preview link is https://platform.strategyzer.com/playbook_libraries/strategyzer_library/listings/18.

## Scope of correction
Removed `/pilot`, the ShiftNest candidate link, its active AI/state/storage/test modules, pilot-only evaluator branches, unused AI SDK dependencies and the unapplied pilot SQL proposal. No browser-storage keys were cleared; old local pilot data remains stored but has no active UI. Historical report files remain preserved. No shared tables, records, permissions, allowlists, Strategyzer state or published app changed.

Added an optional reference to the existing Chapter 2 container, including modern committed Playbook sessions that otherwise display the gated external runtime. It reuses `sendPlaybookTeamTurn`, the existing scenario roster and session ownership check. It does not enable/unlock the external POC. The normal reference conversation does not require an external run or test allowlist. Existing Chapter 3 conclusion/skip requirements remain unchanged: reference conversation alone is not a concluded external room.

Choice is stored in the existing `playbook_facilitation_plan.customer_profile_reference` JSON. Attributed coach/team turns use existing `messages` with a distinct reference phase and a reference marker on coach messages. No fifth scenario, second assessment, parallel artifact store or canvas editor was added. Team-generated work is spoken, read-only fictional proposals in that attributed transcript, not an editable Customer Profile replica. Existing prior dialogue and available homework/activity records inform roleplay; no new between-meetings generator was introduced.

The bounded verified sequence is introduction, citizenM worked example, AI-assisted mapping, refinement. citizenM is methodology background, not the current case. Output is jobs/pains/gains Customer Profile, no Value Map requirement. Prompts retain current actors/postures, Scope, constraints and saved dialogue; prohibit fabricated adopted decisions, completed homework, tool use or verified research. Work remains assumed/proposed unless discussed evidence supports a different interpretation. Restraint and unresolved disagreement remain legitimate.

Existing alignment and legacy canvas prompt paths also receive this context only after explicit saved opt-in. Without opt-in, the reference prompt helper returns empty. Legacy team turns still use their original activity-phase transcript.

Assessment uses the existing nine isolated sections, skills calls, resumable job and final human review. Reference-phase transcript is contextual evidence, with explicit instructions not to score generated work quality or count it as candidate AI-assistance. Chapter 1 framing/strategy/fit do not receive later reference turns as retroactive evidence. Unmarked old assessments retain their prior input path; no existing evaluation regenerated.

## Inspected actual scenarios
Read-only current scenario rows matched repository seeds:
- Student Founder: Maya Chen, Jordan Patel, Sofia Ramirez; university meal planning, broad student segment, pitch pressure.
- Distant Sponsor: Priya Shah, Marcus Lin, Dale Whitmore; bank SMB lending, sponsor/budget/risk alignment.
- Solution Factory: Jordan Park, Sam Okafor, Renee Castillo; HR analytics, committed AI feature with no demand evidence.
- Confident Executive: Dr. Eleanor Voss, Nurse Manager Tariq Hassan, Maya Bernstein; mixed clinical triage evidence and premature scaling.

## Verification
- **169 tests passed, 21 files**, including four-scenario mocked normal server handler opt-in, saved Scope/dialogue/homework input, configured speaker attribution, persistence writes against mocks, and all nine ordinary scoring calls per scenario. Also defer/other/unset, explicit opt-in rejection and unmarked legacy input checks. Existing authorization, preservation and assessment-job regression suites passed.
- Automatic preview compile/type signal **build OK**.
- Signed-in browser: all four scenario cards present, no pilot link; existing retained Student Founder session displayed Chapter 2 reference with default current/other choice and correct preview URL. Desktop 1280×1800 and mobile 390×844 inspected; no horizontal overflow. No session save or message action clicked.
- Real AI checks using the existing team model/endpoint and actual scenario data, no DB writes: all four returned HTTP 200 and a correctly named scenario participant. Student 1.09s, Sponsor 1.38s, Solution 1.28s, Executive 1.37s. Each proposed jobs/pains/gains and identified missing evidence. The bank response proposed bakery/loan-speed hypotheses; these are generated assumptions, not seeded facts. Clinical response entertained bypassing as a question, not evidence. No real interviews or external playbook state were verified.

## Limits
There is no isolated hosted database on this surface. Actual shared save/reload, a new complete four-scenario session flow and persisted normal assessment were intentionally not run. Mock writes and normal scoring execution were verified, not shared persistence. Real AI checks exercised generated responses, not the entire hosted RPC/write path; semantic output guarantees still require human review and stronger/weak-coaching calibration. No published/mobile full journey, forced provider failure or external account test.

## Main files
- New `src/components/CustomerProfileReference.tsx`, `src/lib/customer-profile-reference.ts`, regression test and local architecture note.
- Updated existing session/scenario pages, `simulator.functions.ts`, `evaluation.io.ts`, `evaluation.functions.ts`, dependency files, generated route tree and roadmap.
- Removed standalone pilot source/helpers and unapplied SQL; preserved all historical user data.