// Strategyzer official playbook taxonomy (from Project Scoping & Playbook Selection Guide)
// Library: https://platform.strategyzer.com/playbook_libraries/strategyzer_library

export type Playbook = {
  id: string;
  name: string;
  diagnosis: string;
  whenToUse: string;
  signals: string[];
  outcome: string;
  accent: string;
  libraryUrl: string;
};

export const STRATEGYZER_LIBRARY_URL =
  "https://platform.strategyzer.com/playbook_libraries/strategyzer_library";

export const PLAYBOOKS: Playbook[] = [
  {
    id: "customer_profile_interviews",
    name: "Customer Profile Interviews",
    diagnosis: "Customer Understanding",
    whenToUse: "We don't fully understand our customers.",
    signals: ["Unclear pains or jobs", "Few customer interviews", "Assumptions about needs"],
    outcome: "Prioritized customer problem",
    accent: "var(--brand-blue)",
    libraryUrl: STRATEGYZER_LIBRARY_URL,
  },
  {
    id: "idea_generation",
    name: "Idea Generation",
    diagnosis: "Opportunity Exploration",
    whenToUse: "We need new ideas or opportunities.",
    signals: ["Looking for innovation ideas", "Exploring new markets", "Building opportunity pipeline"],
    outcome: "Portfolio of opportunity ideas",
    accent: "var(--brand-yellow)",
    libraryUrl: STRATEGYZER_LIBRARY_URL,
  },
  {
    id: "strong_value_propositions",
    name: "Strong Value Propositions",
    diagnosis: "Value Proposition Clarity",
    whenToUse: "We have ideas but don't know why customers would choose us.",
    signals: ["Weak positioning", "Unclear differentiation", "Testing messaging or conversion"],
    outcome: "Tested positioning direction",
    accent: "var(--brand-red)",
    libraryUrl: STRATEGYZER_LIBRARY_URL,
  },
  {
    id: "competing_on_business_models",
    name: "Competing on Business Models",
    diagnosis: "Business Model Strategy",
    whenToUse: "We need to rethink how we create or capture value.",
    signals: ["Pricing challenges", "Revenue model questions", "Strategic redesign"],
    outcome: "Redesigned business model hypothesis",
    accent: "var(--brand-purple)",
    libraryUrl: STRATEGYZER_LIBRARY_URL,
  },
];

export const ENGAGEMENT_MODELS = [
  {
    id: "workshop_facilitation",
    name: "Workshop Facilitation",
    bestFor: "Student teams, early-stage teams, teams needing alignment",
    structure: "Scoping call → 90–120 min workshop → Optional follow-up",
    coachRole: "Facilitate playbook exercises, challenge assumptions, guide insights",
  },
  {
    id: "guided_coaching",
    name: "Guided Coaching",
    bestFor: "Founder teams, teams already working on the problem",
    structure: "Scoping call → Session 1 (45–60 min) → Homework → Session 2 review",
    coachRole: "Frame the problem, help interpret outputs, push for evidence",
  },
];

// ----- Strategyzer canvases for the Application step -----
// Each playbook maps to its primary canvas. The coach fills cells with the team.

export type CanvasCell = { key: string; label: string; hint: string; column?: "customer" | "value" | "right" | "left" | "bottom" };
export type CanvasDef = {
  id: string;            // matches a playbook id
  name: string;
  blurb: string;
  cells: CanvasCell[];
};

export const CANVASES: Record<string, CanvasDef> = {
  customer_profile_interviews: {
    id: "customer_profile_interviews",
    name: "Customer Profile",
    blurb: "Map what your customer is trying to get done, what gets in the way, and the outcomes they want — sourced from interviews, not assumptions.",
    cells: [
      { key: "jobs", label: "Customer Jobs", hint: "Functional, social, and emotional jobs the customer is trying to get done. Verbs first.", column: "customer" },
      { key: "pains", label: "Pains", hint: "Bad outcomes, obstacles, and risks they experience before/during/after the job.", column: "customer" },
      { key: "gains", label: "Gains", hint: "Required, expected, desired, and unexpected outcomes that would delight them.", column: "customer" },
    ],
  },
  strong_value_propositions: {
    id: "strong_value_propositions",
    name: "Value Proposition Canvas",
    blurb: "Match a value proposition (right) to a customer profile (left). A 'fit' exists when your pain relievers and gain creators address real pains and gains.",
    cells: [
      { key: "jobs", label: "Customer Jobs", hint: "What is the customer trying to get done?", column: "customer" },
      { key: "pains", label: "Pains", hint: "What frustrates them about getting the job done?", column: "customer" },
      { key: "gains", label: "Gains", hint: "What outcomes would make this a win for them?", column: "customer" },
      { key: "products", label: "Products & Services", hint: "What you offer that the customer uses to do the job.", column: "value" },
      { key: "pain_relievers", label: "Pain Relievers", hint: "How exactly your offer eliminates or reduces specific pains.", column: "value" },
      { key: "gain_creators", label: "Gain Creators", hint: "How your offer produces the gains the customer cares about.", column: "value" },
    ],
  },
  idea_generation: {
    id: "idea_generation",
    name: "Opportunity Portfolio",
    blurb: "Generate and triage ideas across Desirability, Feasibility, and Viability before betting on one.",
    cells: [
      { key: "ideas", label: "Top Ideas", hint: "5–10 distinct opportunity ideas, one per line.", column: "left" },
      { key: "desirability", label: "Desirability", hint: "Who wants this and why. What evidence do we have that customers care?", column: "right" },
      { key: "feasibility", label: "Feasibility", hint: "Can we build/deliver it with the capabilities we have or can acquire?", column: "right" },
      { key: "viability", label: "Viability", hint: "Can it make money / sustain the business model?", column: "right" },
      { key: "next_test", label: "Riskiest Assumption · Next Test", hint: "The single assumption that, if wrong, kills the idea. The cheapest test to check it.", column: "bottom" },
    ],
  },
  competing_on_business_models: {
    id: "competing_on_business_models",
    name: "Business Model Canvas",
    blurb: "Redesign how the organization creates, delivers, and captures value across 9 building blocks.",
    cells: [
      { key: "customer_segments", label: "Customer Segments", hint: "For whom are we creating value?", column: "left" },
      { key: "value_propositions", label: "Value Propositions", hint: "What bundle of products/services do we offer each segment?", column: "left" },
      { key: "channels", label: "Channels", hint: "How are segments reached and served?", column: "left" },
      { key: "customer_relationships", label: "Customer Relationships", hint: "What kind of relationship does each segment expect?", column: "left" },
      { key: "revenue_streams", label: "Revenue Streams", hint: "What are customers willing to pay for, and how?", column: "right" },
      { key: "key_resources", label: "Key Resources", hint: "What assets are required to deliver?", column: "right" },
      { key: "key_activities", label: "Key Activities", hint: "What must we do well to deliver the value proposition?", column: "right" },
      { key: "key_partners", label: "Key Partners", hint: "Who helps us reduce risk or acquire resources?", column: "right" },
      { key: "cost_structure", label: "Cost Structure", hint: "What are the most important costs in this model?", column: "bottom" },
    ],
  },
};

export function canvasForPlaybook(playbookId: string | null | undefined): CanvasDef | null {
  if (!playbookId) return null;
  // methodology_choice is stored as `${playbookId}::${engagementId}`
  const id = playbookId.split("::")[0];
  return CANVASES[id] ?? null;
}

// ----- Built-in playbook for the Application step (MVP: one playbook, two activities) -----
// Mirrors the Strategyzer "Strong Value Propositions and Differentiation with Gen AI" playbook
// on platform.strategyzer.com. These two paper-and-pen activities are the first working
// sessions after the e-learning modules — the coach has already gone through the e-learning
// and asked the team to review it ahead of time.

export type BuiltinActivity = {
  key: string;
  number: number;
  title: string;
  duration: string;
  objective: string;
  whyItMatters: string;
  facilitatorSteps: string[];
  promptsForTeam: string[];
  artifact:
    | { kind: "ecosystem"; categories: { key: string; label: string; description: string }[] }
    | { kind: "customer_profile"; quadrants: { key: "jobs" | "pains" | "gains"; label: string; hint: string }[] };
};

export type BuiltinPlaybook = {
  id: string;
  name: string;
  source: string;
  overview: string;
  activities: BuiltinActivity[];
};

export const BUILTIN_PLAYBOOK: BuiltinPlaybook = {
  id: "strong_vp_gen_ai",
  name: "Strong Value Propositions and Differentiation with Gen AI",
  source: "Strategyzer Playbook Library",
  overview:
    "Craft clear value propositions that truly resonate with customers. The coach has completed the e-learning ahead of time and now runs two paper-and-pen working sessions with the team: map the customer ecosystem, then map the first Customer Profile.",
  activities: [
    {
      key: "ecosystem",
      number: 1,
      title: "Map out your customer ecosystem",
      duration: "15 min",
      objective:
        "List all the customers, users, and stakeholders in the team's context, then label each by the role they play in the buying/usage system.",
      whyItMatters:
        "Teams almost always conflate the user with the buyer with the decision-maker — and then build a value proposition for the wrong person. Mapping the ecosystem first forces the team to separate roles so they can later pick the right customer to focus on.",
      facilitatorSteps: [
        "Write down every customer, user, and stakeholder the team can think of on sticky notes.",
        "Label each one with one of the role types (end user, beneficiary, economic buyer, decision maker, channel partner, influencer, recommender, saboteur).",
        "Cluster duplicates and surface disagreements about who plays which role — that disagreement is the insight.",
      ],
      promptsForTeam: [
        "Who actually uses your offering day-to-day?",
        "Who pays for it, and is that the same person as the user?",
        "Who can say 'no' and kill the deal — and are we talking to them?",
        "Who benefits indirectly, and who might quietly block this?",
      ],
      artifact: {
        kind: "ecosystem",
        categories: [
          { key: "end_user", label: "End user / customer", description: "Ultimate end user / consumer of the offering." },
          { key: "beneficiary", label: "Beneficiaries", description: "Benefit from others using what you have to offer." },
          { key: "economic_buyer", label: "Economic buyers", description: "Hold the budget required for what you have to offer." },
          { key: "decision_maker", label: "Decision makers", description: "Have the ultimate decision-making power." },
          { key: "channel_partner", label: "Channel partners", description: "Intermediaries who help deliver what you offer." },
          { key: "influencer", label: "Influencers", description: "Trendsetters who shape opinions in your space." },
          { key: "recommender", label: "Recommenders", description: "Informally influence & shape buying and decision-making." },
          { key: "saboteur", label: "Saboteurs", description: "Undermine decision-making for various reasons." },
        ],
      },
    },
    {
      key: "customer_profile",
      number: 2,
      title: "Map your first Customer Profile",
      duration: "15 min",
      objective:
        "Pick the priority customer from the ecosystem and map their Customer Profile — Jobs, Pains, and Gains — based on current evidence.",
      whyItMatters:
        "The Customer Profile is the foundation of every value proposition decision that comes next. If Jobs, Pains, and Gains are vague or assumed, every downstream artifact (Value Map, A/B tests, messaging) inherits that fuzziness. This is where the team's assumptions get put on paper so they can be tested.",
      facilitatorSteps: [
        "From the ecosystem map, have the team pick ONE priority customer to focus on first.",
        "Name the segment specifically (not 'small businesses' — 'two-person legal practices in the EU').",
        "Walk through Jobs, then Pains, then Gains. Use verbs for Jobs. Push back on guesses — flag them as assumptions to test, don't delete them.",
      ],
      promptsForTeam: [
        "What is this customer actually trying to get done — functionally, socially, emotionally?",
        "What frustrates them today before, during, or after doing that job?",
        "What outcomes would make this a clear win — required, expected, or surprise-and-delight?",
        "Which of these do we have evidence for vs. which are we assuming?",
      ],
      artifact: {
        kind: "customer_profile",
        quadrants: [
          { key: "jobs", label: "Customer Jobs", hint: "Functional, social, and emotional jobs the customer is trying to get done. Verbs first." },
          { key: "pains", label: "Pains", hint: "Bad outcomes, obstacles, and risks they experience before/during/after the job." },
          { key: "gains", label: "Gains", hint: "Required, expected, desired, and unexpected outcomes that would delight them." },
        ],
      },
    },
  ],
};


