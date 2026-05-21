
## Goal

Shift the simulator from "complete the modules in order" to "demonstrate coaching judgment under ambiguity." Preserve all existing visuals, components, and interaction mechanics. This is a structural + evaluative refactor, not a redesign.

## 1. Rename & rearchitect the step model

In `src/routes/_authenticated.sessions.$sessionId.tsx`, replace the linear `STEPS` array and forced auto-advance with a 6-section workspace:

```
01 Situation Framing      (was: Framing)
02 Coaching Strategy      (was: Method) — playbook optional / multi / none
03 Stakeholder Workspace  (was: Dialogue) — persistent, always accessible
04 Working Session Design (was: Canvas / Application) — artifacts optional
05 Intervention Decision  (kept) — Continue / Pivot / Escalate / Stop
06 Engagement Pathway     (was: Playbook Application) — sequencing recommendation
```

Changes to the nav shell:
- All sections become freely navigable at any time (no locking, no required completion order).
- Remove the `onSaved → setStep(next)` auto-advance behavior. Save stays, advance becomes a user choice via a "Continue" affordance the user can ignore.
- Step labels and the small chip subtext get updated copy that emphasizes judgment, not completion (e.g. Working Session Design subtitle: "Facilitate Strategyzer thinking — fidelity is a choice, not a goal").
- Stakeholder Workspace surfaces a persistent side affordance ("Revisit a stakeholder") from sections 02, 04, 05, 06 so the coach can return to dialogue without leaving their current section context.

## 2. Coaching Strategy section (was Method)

In the same route file's `MethodStep`:
- Allow three coach choices: **One playbook · Multiple playbooks · No playbook yet (gather more evidence)**.
- The rationale prompt reframes from "why this playbook" to "what is your engagement approach, sequencing, and evidence focus — and why is restraint or escalation appropriate here?"
- AI suggestion endpoint (`suggestPlaybook`) gets a second mode: when the coach selects "no playbook yet", the suggestion returns evidence-gathering moves instead of a playbook id.

DB: `sessions.methodology_choice` already free-text; no schema change. Store multi-select as comma-joined ids, or `"none"`.

## 3. Stakeholder Workspace (was Dialogue)

In `DialogueStep`:
- Remove the "continue to next step" terminal CTA; replace with a persistent "Return to whatever section you came from" link.
- Already supports per-stakeholder threads + transcript — preserve mechanics.
- Stakeholder system prompts (server side in `sendStakeholderMessage`) get an addendum: "Carry political realism. You may resist, contradict earlier statements when pressed, or escalate emotionally. Remember the full transcript."
- Each scenario gains `success_definition` and `success_pressure` fields (see §6) that stakeholders reference so the coach can challenge success expectations.

## 4. Working Session Design (was Canvas / Application)

In `ApplicationStep` and `PlaybookStep`:
- Reframe copy: artifacts are tools, not deliverables. Add a visible "Stop early — gather evidence first" option that records a justified decision instead of an artifact.
- Keep VPC / ecosystem / BMC canvas mechanics intact.
- Add a per-activity "fidelity level" selector (sketch / working / decision-ready) — recorded into `playbook_application` JSON.
- Saving an empty or partial artifact is valid IF a written rationale ("why we stopped here") is provided.

## 5. Intervention Decision

Keep the four options. Update prompt copy to emphasize restraint / scope discipline / sequencing / stakeholder readiness. No structural change.

## 6. Engagement Pathway (was Playbook Application)

Reframe `PlaybookStep`:
- Output is a **sequenced engagement plan**, not a single applied playbook.
- Fields: next playbook(s) in order, evidence goals per step, workshop cadence, stakeholder alignment needs, follow-on interventions.
- Save into existing `sessions.playbook_application` jsonb under key `engagement_pathway`.
- Tone guardrails in the AI prompt: "consultative, customer-centered. Reject upsell phrasing. Reward minimal sufficient intervention."

## 7. Evaluation rubric realignment

In `src/lib/evaluation.functions.ts`, update `SECTION_RUBRIC` keys and focus copy so they grade the new philosophy. Keys become:

- `situation_framing` — ambiguity surfaced, success definition challenged, evidence vs opinion separated
- `coaching_strategy` — methodology restraint, sequencing logic, fit-for-purpose orchestration (single / multi / none)
- `stakeholder_navigation` — uses persistent dialogue, surfaces resistance, captures commitments, manages politics
- `working_session_facilitation` — fidelity judgment, asks better questions, stops at the right depth, doesn't over-canvas
- `methodological_soundness` — Strategyzer rigor, customer-first sequencing, discovery vs delivery
- `intervention_discipline` — restraint, scope, stakeholder readiness, aligned to dialogue commitments
- `engagement_pathway` — sequencing quality, evidence goals, alignment moves, NOT upsell

Each section's prompt explicitly rewards: simplification, evidence rigor, sequencing, alignment, restraint. Explicitly penalizes: forced playbook application, over-engineering, canvas-completion thinking.

Final assessment prompt gets an added directive: "A coach who deliberately did less but did it well should be rated above a coach who applied every framework."

## 8. Scenario shape (DB migration)

Add to `scenarios` table:
- `success_definition text` — what the team currently believes good looks like
- `success_pressure text` — organizational/timeline pressure shaping that belief
- `unrealistic_aspects text[]` — where the success definition is likely off

Migration also backfills existing scenarios with reasonable defaults so the UI never renders blank. Stakeholder dialogue prompts read these so they can voice the pressure naturally.

## 9. Report page

In `src/routes/_authenticated.sessions.$sessionId.report.tsx`, update the `SECTION_RUBRIC` consumer to render the new keys/labels. No visual redesign — same hero, same per-section cards, same final assessment block. The verdict colors and scorebars stay.

## Out of scope

- No visual redesign, no component library swaps, no new color tokens.
- No changes to auth, routing shell, voice input, or playbook PDF ingestion.
- No new tables beyond the scenarios columns above; reuse existing jsonb columns.

## Technical summary

Files touched:
- `src/routes/_authenticated.sessions.$sessionId.tsx` — step model, copy, persistent dialogue affordance, fidelity selector, "stop early" option, free navigation
- `src/routes/_authenticated.sessions.$sessionId.report.tsx` — consume new rubric keys
- `src/lib/evaluation.functions.ts` — new `SECTION_RUBRIC`, updated prompt copy
- `src/lib/simulator.functions.ts` — `suggestPlaybook` gains "no playbook yet" mode; `sendStakeholderMessage` system prompt addendum reading new scenario fields; new `saveEngagementPathway` server fn
- `supabase/migration` — add `success_definition`, `success_pressure`, `unrealistic_aspects` to `scenarios`; backfill defaults

No new dependencies. No changes to `src/integrations/supabase/*`, `src/components/Shell.tsx`, or routing shell.
