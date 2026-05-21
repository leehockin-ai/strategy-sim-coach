// ============================================================================
// STRATEGYZER SIMULATOR METHODOLOGY KERNEL
// Canonical methodology, facilitation, and playbook intelligence layer.
// Consumed by: evaluation.functions.ts, simulator.functions.ts (suggestPlaybook).
// Do NOT couple this file to UI — it is pure reasoning context for the AI layer.
// ============================================================================

export const KERNEL_PURPOSE = `SIMULATOR PURPOSE
The simulator evaluates ONE question:
"Can this coach responsibly guide a team through structured Strategyzer thinking under
ambiguity while maintaining evidence rigor, stakeholder alignment, and practical momentum?"

EVALUATE: coaching judgment, facilitation quality, evidence-based thinking, methodology
sequencing, stakeholder navigation, intervention discipline, playbook orchestration,
customer-centric thinking.

DO NOT REWARD: framework memorization, generic consulting behavior, polished jargon alone,
artifact completion for its own sake, excessive methodology usage, fictional business
success alone.`;

export const CORE_PRINCIPLES = `PART 1 — CORE STRATEGYZER COACHING PRINCIPLES

01 EVIDENCE OVER OPINION
  Strong: separates assumptions from facts; surfaces uncertainty; prioritizes learning
    before scaling; challenges unsupported confidence; moves teams to evidence generation.
  Weak:   allows assumptions to become truth; moves to execution prematurely; confuses
    confidence with validation; lets politics replace learning.
  Reward: evidence-seeking, validation thinking, explicit uncertainty management.
  Penalize: unsupported certainty, hypotheticals treated as evidence, "we already know" logic.

02 STRUCTURED PROGRESS OVER PERFECTION
  Purpose of the methodology is reducing ambiguity, improving decision quality, generating
  movement, increasing clarity, creating meaningful next steps — NOT perfect canvases.
  Strong: simplifies; prioritizes; reduces complexity; creates momentum; stops unnecessary work.
  Weak:   overengineers; expands exercises endlessly; consulting theater; confuses activity
    with progress.
  Reward: simplification, prioritization, intervention discipline.
  Penalize: overfacilitation, unnecessary methodology, excessive process.

03 CUSTOMER-CENTRIC THINKING
  Starts with customers, users, buyers, behaviors, jobs, pains, gains, contexts.
  Strong: redirects to customer reality; challenges internal assumptions; pushes specificity;
    forces evidence-based customer thinking.
  Weak:   stays internally focused; jumps to solutions; vague customer language; features
    confused with value.
  Reward: customer specificity, behavioral thinking, evidence-based customer understanding.
  Penalize: vague customer definitions, internally projected assumptions, feature-first logic.

04 COACHING, NOT CONSULTING
  The coach FACILITATES structured thinking — does NOT become the strategist, complete work
  for the team, prescribe every answer, or dominate workshops.
  Strong: guides; asks open-ended questions; transfers ownership; constructively challenges;
    creates psychological safety; facilitates alignment.
  Weak:   over-prescribes; lectures; dominates; over-explains methodology; creates dependency.
  Reward: facilitation quality, ownership transfer, neutrality, coaching posture.
  Penalize: over-prescribing, consulting theater, excessive directionality.

05 METHODOLOGY RESTRAINT
  Not every situation requires a canvas, workshop, playbook, or deeper methodology now.
  Strong: knows when NOT to use a framework; recognizes organizational unreadiness;
    simplifies intervention scope; stops when enough clarity exists.
  Weak:   forces frameworks reflexively; applies methodology performatively; overcomplicates.
  Reward: sequencing quality, readiness awareness, intervention restraint.
  Penalize: framework dumping, excessive methodology application, activity without movement.`;

export const FOUNDATIONAL_CONCEPTS = `PART 2 — FOUNDATIONAL STRATEGYZER METHODOLOGY CONCEPTS

VALUE PROPOSITION CANVAS (VPC)
Purpose: deepen customer understanding and value fit. NOT a messaging exercise, feature list,
box-filling, or completion task.
Structure:
  Customer Profile — Jobs / Pains / Gains
  Value Map       — Products & Services / Pain Relievers / Gain Creators
Strong coaching: deep customer understanding BEFORE refining solutions; evidence rigor;
  continuous assumption challenge.
Weak coaching: jumps to solutions; treats VPC as a worksheet; auto-completes unsupported ideas.

CUSTOMER JOBS — what the customer is trying to get done (functional / emotional / social / operational).
  Strong jobs: specific, contextual, behavior-oriented.
  Weak jobs:   vague, feature-oriented, solution-oriented.
  Good examples:
    "Get approved for a business loan quickly without feeling financially exposed."
    "Reduce the time required to prepare monthly reporting."
    "Confidently choose healthy meal options during a busy workday."
  Bad examples:
    "Use our app." / "Access the dashboard." / "Buy our product." / "Manage finances better."
  Strong coach prompts:
    "What is the customer actually trying to accomplish?"
    "What behavior have we directly observed?"
    "What happens before and after this moment?"
    "In what situation does this occur?"

PAINS — frustrations, fears, risks, barriers, undesired outcomes, obstacles.
  Strong pains: meaningful, specific, evidence-aware.
  Weak pains:   generic, hypothetical, internally projected.
  Good examples:
    "Fear of rejection during the loan application process."
    "Manually reconciling spreadsheets every month."
    "Not trusting whether healthy meal options are actually healthy."
  Bad examples:
    "People dislike inconvenience." / "Customers want things faster." / "Users hate complexity."
  Strong coach prompts:
    "What happens if this pain is not solved?"
    "How frequently does this occur?"
    "What workarounds exist today?"
    "What evidence suggests this matters?"

GAINS — desired outcomes, improvements, aspirations, success criteria.
  Strong gains: specific, measurable, behavior-oriented.
  Weak gains:   generic, marketing-oriented, vague aspirations.
  Good examples:
    "Reduce reporting time from 8 hours to 1 hour."
    "Feel confident submitting a loan application independently."
    "Quickly identify healthy meal options while shopping."
  Bad examples:
    "Customers want innovation." / "People want better service." / "Users want convenience."
  Strong coach prompts:
    "What meaningful improvement would occur?"
    "What would success look like for the customer?"
    "How would behavior change if this worked?"

VALUE MAP — how value is created, pains relieved, gains created.
  Strong: connect solutions directly to customer evidence; avoid feature dumping; challenge
    unsupported claims.
  Weak:   disconnected features; overstated differentiation; premature solutioning.

BUSINESS MODEL CANVAS (BMC) — systemic view of how value is created, delivered, captured.
NOT a static business plan, presentation artifact, or box-filling exercise.
Blocks: Customer Segments, Value Propositions, Channels, Customer Relationships, Revenue Streams,
Key Activities, Key Resources, Key Partnerships, Cost Structure.
Strong coaching: dependencies, relationships, tradeoffs, strategic coherence, evidence gaps.
Weak coaching: mechanical completion, isolated blocks, superficial detail.
Strong BMC prompts:
  "What assumptions exist in this revenue stream?"
  "Which customer segment matters most initially?"
  "What dependency creates operational risk?"
  "What must be true for this partnership to work?"`;

export const PLAYBOOK_HEURISTICS = `PART 3 — PLAYBOOK / TOOL PURPOSE MAP

CUSTOMER PROFILE INTERVIEWS
  Best when: customer evidence is weak; assumptions dominate; team internally focused.
  Strong signals: narrow interview objectives; behavior focus; non-leading questions; prioritize learning.
  Weak signals:   confirmation-seeking; broad/unfocused; pitching during interviews.
  Do NOT use when: WHO the customer is hasn't been named — do ecosystem mapping first.

STRONG VALUE PROPOSITIONS & DIFFERENTIATION
  Best when: customer understanding exists; positioning weak; differentiation unclear.
  Strong signals: claims tied to evidence; challenge generic value; push specificity.
  Weak signals:   feature obsession; vague differentiation; unsupported claims.
  Do NOT use when: customer profile is hypothetical — building value map on assumptions amplifies risk.

COMPETING ON BUSINESS MODELS
  Best when: strategic redesign needed; pricing / value capture questions exist; ecosystem logic matters.
  Strong signals: explores tradeoffs; surfaces assumptions; challenges legacy logic.
  Weak signals:   superficial economics; incremental thinking; ignored dependencies.

IDEA GENERATION
  Strong signals: expands possibilities before converging; delays premature evaluation; connects ideas
    to customer needs.
  Weak signals:   converges too quickly; reinforces existing assumptions; evaluates prematurely.
  Do NOT use when: the problem isn't framed — ideation without a problem is consulting theater.

INNOVATION EVALUATION / INVEST OR KILL
  Strong signals: separates evidence from confidence; challenges sunk-cost thinking; prioritizes decision
    quality; willing to kill.
  Weak signals:   emotional attachment; political prioritization; false certainty; everything scored "promising".

STRATEGY COMMUNICATION / ALIGNMENT
  Strong signals: surfaces conflicting narratives; clarifies success criteria; improves alignment;
    named owners; explicit decisions and trade-offs captured.
  Weak signals:   assumes alignment exists; ignores politics; focuses only on artifacts; deck-driven theater.
  Do NOT use when: team hasn't done the discovery work — communicating an unvalidated strategy entrenches it.

ECOSYSTEM MAPPING
  Strong signals: separate end users, beneficiaries, economic buyers, decision makers, channel partners,
    influencers, recommenders, saboteurs — NAMED people/roles, not generic categories;
    identifies hidden influence; surfaces political dynamics; chooses a priority customer.
  Weak signals:   oversimplifies stakeholders; lumps everyone into "users"; ignores ecosystem realities;
    no priority customer chosen.

PLAYBOOK INTELLIGENCE — WHEN TO NOT PRESCRIBE ONE:
  - Evidence too weak → no playbook yet; gather evidence first.
  - Stakeholder alignment is the real blocker → run alignment moves before any canvas.
  - Multiple playbooks plausible → sequence them; pick the smallest first.
  - Team unready (politically, cognitively, capacity) → reduce scope or defer.`;

export const FACILITATION_SIGNALS = `PART 4 — UNIVERSAL FACILITATION SIGNALS

REWARD:
  open-ended questioning, ownership transfer, simplification, psychological safety,
  sequencing discipline, evidence rigor, customer specificity, intervention restraint,
  prioritization clarity.

PENALIZE:
  solution jumping, framework dumping, consulting theater, overfacilitation, premature certainty,
  unnecessary complexity, feature obsession, mechanically completed artifacts.

STRONG facilitation prompts (cite when observed):
  "What evidence supports that?"
  "Who specifically experiences this pain — name them."
  "What remains uncertain after this exercise?"
  "What behavior have we directly observed (not what customers said they'd do)?"
  "What's the smallest test that would change our mind?"
  "Whose buy-in do we need before we run this?"

WEAK facilitation prompts (cite when observed):
  "Would customers want this?" (hypothetical, unfalsifiable)
  "Should we add this feature?" (solutioning, not discovery)
  "Do we think this is valuable?" (opinion-seeking)
  Framework name-dropping with no facilitation move attached.
  Telling the team the answer ("you should…", "the right BMC is…") — consulting, not coaching.

ARTIFACT INTELLIGENCE:
  Artifacts SUPPORT thinking; they are not the goal. Reward incomplete artifacts that explicitly
  surface evidence gaps. Penalize mechanically filled canvases, unsupported specificity
  (suspiciously confident detail with no evidence trail), AI-generated-sounding outputs, and
  over-completion without evidence. Reward explicit uncertainty: "we don't know X yet — next test is Y".`;

export const ENGAGEMENT_PATHWAY = `PART 5 — ENGAGEMENT PATHWAY LOGIC

Strong coaches think:
  "What is the MINIMUM structured intervention required to create meaningful progress?"
NOT:
  "How many frameworks can we apply?"

Reward: coherent sequencing, lightweight interventions, evidence progression, readiness awareness,
  stakeholder alignment, practical momentum.

EXAMPLE PATHWAY — situation: weak customer clarity + sponsor pressure.
  1. Stakeholder alignment session
  2. Ecosystem mapping
  3. Customer profile interviews
  4. Evidence review checkpoint
  5. Value proposition refinement
  Risks: sponsor impatience, weak evidence, internal assumptions.
  Strong signals: narrows scope; gains commitment incrementally; maintains evidence rigor;
    avoids over-engineering.`;

export const SCORING_WEIGHTS = `SCORING WEIGHTS (apply when assigning section scores and the final recommendation):
INCREASE weight for: simplification, evidence rigor, facilitation quality, methodology restraint,
  sequencing coherence, practical next steps, ownership transfer to the team, customer specificity.
DECREASE weight for: verbosity, consulting language, framework density, polished outputs with no
  evidence trail, artifact completion alone.

A coach who deliberately did LESS but did it WELL — challenged the success definition, gathered
evidence, ran a partial artifact with clear rationale — should score ABOVE a coach who applied
every framework end-to-end without judgment. The simulator evaluates FACILITATION QUALITY and
COACHING JUDGMENT, not polished strategic answers.`;

export const FINAL_PRINCIPLE = `FINAL PRINCIPLE
The simulator evaluates: "Can this coach responsibly create structured progress through
Strategyzer methodology under ambiguity?"

Reward coaches who: simplify · sequence appropriately · maintain evidence rigor · create
alignment · guide rather than dominate · know when to stop · know when to go deeper ·
facilitate structured customer-centric thinking responsibly.`;

export const STRATEGYZER_INTELLIGENCE = [
  KERNEL_PURPOSE,
  CORE_PRINCIPLES,
  FOUNDATIONAL_CONCEPTS,
  PLAYBOOK_HEURISTICS,
  FACILITATION_SIGNALS,
  ENGAGEMENT_PATHWAY,
  SCORING_WEIGHTS,
  FINAL_PRINCIPLE,
].join("\n\n");
