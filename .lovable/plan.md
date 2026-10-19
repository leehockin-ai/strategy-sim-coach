# Stage 5.5 — Candidate Experience Alignment Around Customer Outcomes

Presentation-layer alignment pass. No scoring changes, no simulation-engine changes, no new tables, no historical backfills, no chapter locking. All rendering stays configuration-driven; nothing is special-cased to the POC scenario.

## 0. Privacy first: public client context vs private assessment truth

Confirmed leak: `getSession` returns `scenarios(*)` — including `system_prompt`, `ambiguity_factors`, `unrealistic_aspects`, and stakeholder `posture` — to candidates.

- `src/lib/simulator.functions.ts` — `getSession`: replace `scenarios(*)` with an explicit safe projection: `id, slug, title, industry, difficulty, summary, context, success_definition, success_pressure, stakeholders` (stakeholders narrowed to `name`, `role` only — strip `posture`).
- `src/lib/scenarios.functions.ts` — `listScenarios`: drop `ambiguity_factors` from the payload; narrow stakeholders to name/role. `getScenario`: replace `select("*")` with the same safe projection.
- `SessionRoute` `ScenarioHeader`: remove the `unrealistic_aspects` block and stakeholder `posture` display. Keep title, industry, context, success_definition, success_pressure, stakeholder names/roles — that is the Client Brief.
- Add a regression test asserting the candidate projection excludes `system_prompt`, `ambiguity_factors`, `unrealistic_aspects`, `posture`.

## 1. Three-chapter orientation

- `src/lib/chapters.ts`: rename chapter 2 → "Facilitate the Work", chapter 3 → "Advance the Outcome"; update descriptors to outcome-through-line language. Step keys, statuses, and reachability logic unchanged (existing progress-based reachability is preserved — no new locking, no wizard).
- `SessionRoute` `ChapterNav`/`ChapterBanner`: lighter orientation copy — where you are, what you're establishing, what comes next. Update Scope tab labels to the three concepts: **Client** (scoping call + 1:1 conversations), **Engagement Brief** (persistent panel, already exists), **Your Approach** (was "Intervention thinking").
- `src/routes/index.tsx`: conservative copy cleanup — chapter names, hero graphic labels (Scope / Facilitate / Advance), remove obsolete terms. No redesign.

## 2. Client Brief at scenario entry

- `src/routes/_authenticated.scenarios.tsx`: library cards drop `ambiguity_factors`; start dialog reframed as receiving a Client Brief (who the client is, context, what they say they want, pressures, who's involved) — rendered dynamically from available fields, graceful when fields are absent.
- Session header becomes the persistent Client Brief summary (public fields only, per §0).

## 3. Persistent participant identity

- New `src/components/ParticipantIdentity.tsx`: avatar (initials + deterministic color hashed from name), name, role, optional public description. Supports an optional `portrait` URL in participant/stakeholder config if present; deterministic fallback otherwise. No imagery dependency.
- Apply everywhere a participant appears: Client Brief stakeholder list, scoping-call tiles, stakeholder 1:1 picker and transcript, Live Client Team roster and transcript speakers.
- Unit tests: deterministic fallback, stable across renders, no fixed-count assumptions.

## 4. Scope as one engagement workspace

- Merge the "Client conversation" and "Stakeholders" tabs into one **Client** tab with an internal toggle (scoping call / 1:1 conversations), so converse → learn → update brief → converse again is one workspace. Engagement Brief stays persistent alongside. Mechanics, revision history, evidence linkage, unsaved-change protection all preserved.
- **Duplication treatment:** legacy framing fields `decision` and `success` duplicate the brief's `Decision to enable` and `Success / intended outcome`. The editable legacy framing form becomes read-only "Saved framing evidence" (already shown in the brief); the scoping call and its summary stay. Historical `framing_notes` still render. `unclear`/`tried`/`nothing` remain visible as saved evidence but are no longer re-asked. Report any residual overlap that needs deeper change.

## 5. Your Approach (intervention reasoning)

- Retitle "Choose your intervention" → "Your approach"; copy reframed to "given the outcome, situation and evidence, how should I help this client make progress?" Preserve all four pathways (alignment, Playbook, evidence-first, deliberate pause), the rationale requirement, AI second opinion, and committed-intervention behavior. Primary action renamed **"Commit approach"**.
- Remove candidate-facing assessment mechanics: "Logged for reviewer", AI confidence display, "This is what the evaluator will read", Reward/Avoid/Penalize hints, "restraint scores above forced facilitation", "core of the simulation", "Deep vertical" badge (replace with neutral copy or remove).

## 6. Facilitate the Work — external runtime

- `getActivityRuntime`: add a safe Engagement Brief projection (`success`, `decision_to_enable`, `decision_maker`) to the session payload so the outcome through-line can render. No private fields.
- `StrategyzerWorkspace`: once connected, setup sections collapse behind a "Workspace setup details" disclosure (progressive disclosure; available on request). Fix obsolete copy ("will eventually operate"). Add a concise **Customer outcome** reference card rendered from the session's brief — never invented, hidden gracefully if the brief is empty.
- Terminology: "Set up assessment workspace" → natural language ("Connect your Strategyzer workspace"). Level 0 semantics and candidate-confirmed/not-verified labels preserved exactly. TEST/NON-PRODUCTION labels preserved.
- Internal `coach_compass` runtime and historical sessions render unchanged (runtime-aware dispatch stays).

## 7. Live Client Team as the working experience

- `LiveClientTeam.tsx`: reorder hierarchy — participants (with ParticipantIdentity), transcript, facilitation input first; activity/instructions and connection summary become compact secondary cards (collapsible once the session is active). Persistent unobtrusive "Open Strategyzer workspace" action while connected. Concluded sessions render the stored conclusion rationale, not just "Working session concluded."
- No simulation-engine changes.

## 8. Progress chapter — terminology only

- Rename labels to Advance the Outcome language; fix the stale toast ("Intervention saved — now apply a real playbook"); "Submit & generate evaluation" → "Submit for assessment". No functional redesign of Judgment/Orchestration.

## 9. Verification

- Unit tests: participant identity, safe projections, brief-projection helper; rerun existing 55+ suite.
- Privacy: signed-in browser check that candidate payloads exclude private truth; cross-candidate denial unchanged; Stage 4/5 boundaries intact.
- Regression: external-runtime journey end-to-end on the POC scenario; a second scenario for leak-check; internal runtime render; historical session render; refresh/resume across Scope, connection, Live Client Team; desktop + mobile viewports.
- Human-style walkthrough per spec §24; final report to `/mnt/documents/coach-compass-stage5.5-report.md` covering all 22 required items.

## Out of scope (per brief)

No Stage 6, no evaluator/scoring changes, no chapter locking, no scenario-library redesign, no new production scenarios, no Strategyzer API work, no broad rebrand. Stop after Stage 5.5.

## Files touched

- `src/lib/simulator.functions.ts`, `src/lib/scenarios.functions.ts`, `src/lib/activity-runtime.functions.ts` (safe projections)
- `src/lib/chapters.ts` (labels/descriptors)
- `src/routes/_authenticated.sessions.$sessionId.tsx` (header, tabs, Client merge, Your Approach, copy cleanup)
- `src/routes/_authenticated.scenarios.tsx`, `src/routes/index.tsx` (Client Brief, landing cleanup)
- `src/components/ParticipantIdentity.tsx` (new), `ScopeBrief.tsx` (read-only legacy framing), `StrategyzerWorkspace.tsx`, `LiveClientTeam.tsx`, `ActivityRuntime.tsx`
- New tests beside existing ones; report in /mnt/documents
