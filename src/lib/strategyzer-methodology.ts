// Strategyzer methodology intelligence — shared by suggestPlaybook and the
// evaluation engine. This file encodes facilitation heuristics, NOT UI.
// The goal: the simulator should reason about coaching quality, evidence rigor,
// methodology restraint, and sequencing — not artifact completion.

export const CORE_PRINCIPLES = `STRATEGYZER CORE PRINCIPLES (apply across every assessment):
- Evidence over opinion. Observed customer behavior > stated preference > internal opinion.
- Customer-centric thinking. Real, named customers; jobs/pains/gains tied to that customer; no generic "users".
- Structured progress over perfection. A small evidence-grounded step beats a polished but unsupported artifact.
- Coaching over consulting. The coach prompts, sequences, and transfers ownership — they do NOT supply answers.
- Methodology restraint. The fewest, lightest interventions that move the team forward.
- Sequencing discipline. Ecosystem → customer profile → value map → BMC; discovery before delivery; alignment before scaling.
- Simplification over over-engineering. Cut surface area; deepen where it matters.`;

export const FACILITATION_SIGNALS = `FACILITATION SIGNALS the simulator must detect.

STRONG facilitation prompts (reward):
- "What evidence supports that?"
- "Who specifically experiences this pain — name them."
- "What remains uncertain after this exercise?"
- "What behavior have we directly observed (not what customers said they'd do)?"
- "What's the smallest test that would change our mind?"
- "Whose buy-in do we need before we run this?"

WEAK facilitation prompts (penalize):
- "Would customers want this?" (hypothetical, unfalsifiable)
- "Should we add this feature?" (solutioning, not discovery)
- "Do we think this is valuable?" (opinion-seeking)
- Framework name-dropping with no facilitation move attached.
- Telling the team the answer ("you should…", "the right BMC is…") — that's consulting, not coaching.

ARTIFACT INTELLIGENCE:
- Artifacts SUPPORT thinking; they are not the goal. Reward incomplete artifacts that explicitly surface evidence gaps.
- Penalize mechanically filled canvases, unsupported specificity (suspiciously confident detail with no evidence trail),
  AI-generated-sounding outputs, and over-completion without evidence.
- Reward explicit uncertainty: "we don't know X yet — next test is Y".`;

export const PLAYBOOK_HEURISTICS = `PLAYBOOK / TOOL HEURISTICS (use to judge fit, sequencing, and facilitation quality):

1) CUSTOMER PROFILE INTERVIEWS
   Use when: jobs/pains/gains are assumed not observed; team is solutioning before discovery.
   Don't use when: the team hasn't named WHO the customer is (do ecosystem mapping first).
   Strong facilitation: open behavioral questions, probing for context, capturing exact language.
   Weak facilitation: leading questions, pitching solutions, validating preferences instead of behavior.
   Failure modes: confirmation bias, talking to the wrong segment, mixing interview + sales pitch.
   Evidence bar: direct observations or quoted statements from named individuals.

2) STRONG VALUE PROPOSITIONS & DIFFERENTIATION
   Use when: a customer profile exists with real evidence and the team needs to articulate fit.
   Don't use when: customer profile is hypothetical — building value map on assumptions amplifies risk.
   Strong facilitation: explicit pain-reliever / gain-creator mapping; differentiation grounded in evidence.
   Weak facilitation: feature listing, copying competitor language, "everyone is our customer".
   Failure modes: value map disconnected from profile; differentiation by adjective ("better", "easier").

3) BUSINESS MODEL CANVAS
   Use when: a viable value proposition has supporting evidence and the team needs to test viability.
   Don't use when: there is no validated value prop yet — BMC becomes wishful thinking.
   Strong facilitation: every block tied to a known assumption; riskiest assumptions tagged for testing.
   Weak facilitation: filling all 9 blocks confidently in one session, treating it as a planning doc.
   Failure modes: BMC-as-business-plan; no Test Card follow-up; no assumption prioritization.

4) ECOSYSTEM MAPPING
   Use when: stakeholders are unclear; "the customer" is being conflated with users/buyers/beneficiaries.
   Don't use when: ecosystem is well known and the bottleneck is value-prop articulation.
   Strong facilitation: separate end users, beneficiaries, economic buyers, decision makers, channel partners,
     influencers, recommenders, saboteurs. NAMED roles/people, not generic categories.
   Weak facilitation: lumping everyone into "users"; missing saboteurs/influencers; no priority customer chosen.
   Failure modes: ecosystem with no priority customer chosen → cascade of unfocused profiles.

5) IDEA GENERATION
   Use when: a defined problem space exists and the team needs divergent options before convergence.
   Don't use when: the problem isn't framed yet — ideation without a problem produces consulting theater.
   Strong facilitation: constraints, prompts, diverge-then-converge, idea-as-hypothesis (testable).
   Weak facilitation: brainstorming without constraint; ranking by enthusiasm; no test plan after.
   Failure modes: idea backlog with no testing pathway.

6) INNOVATION EVALUATION / INVEST OR KILL
   Use when: multiple options exist and the team needs an evidence-based portfolio call.
   Don't use when: no evidence has been gathered — "invest or kill" without evidence is opinion theater.
   Strong facilitation: evidence-weighted scoring; explicit kill criteria; willingness to kill.
   Weak facilitation: scoring on enthusiasm; no killed options; sunk-cost reasoning.
   Failure modes: every option scored "promising"; no portfolio discipline.

7) STRATEGY COMMUNICATION / ALIGNMENT
   Use when: leadership / cross-functional alignment is the actual bottleneck.
   Don't use when: the team hasn't done the discovery work — communicating an unvalidated strategy entrenches it.
   Strong facilitation: shared language; named owners; explicit decisions and trade-offs.
   Weak facilitation: deck-driven theater; consensus by exhaustion; no decisions captured.
   Failure modes: alignment slides without alignment behavior.

PLAYBOOK INTELLIGENCE (when to NOT prescribe one):
- If evidence is too weak → no playbook yet; gather evidence first.
- If stakeholder alignment is the actual blocker → run alignment moves before any canvas.
- If multiple playbooks make sense → sequence them; pick the smallest first.`;

export const SCORING_WEIGHTS = `SCORING WEIGHTS (apply when assigning section scores and the final recommendation):
- INCREASE weight for: simplification, evidence rigor, facilitation quality, methodology restraint,
  sequencing coherence, practical next steps, ownership transfer to the team.
- DECREASE weight for: verbosity, consulting language, framework density, polished outputs with no evidence trail.

A coach who deliberately did LESS but did it WELL — challenged the success definition, gathered evidence,
ran a partial artifact with clear rationale — should score ABOVE a coach who applied every framework end-to-end
without judgment. The simulator evaluates FACILITATION QUALITY, not polished strategic answers.`;

export const STRATEGYZER_INTELLIGENCE = [
  CORE_PRINCIPLES,
  FACILITATION_SIGNALS,
  PLAYBOOK_HEURISTICS,
  SCORING_WEIGHTS,
].join("\n\n");
