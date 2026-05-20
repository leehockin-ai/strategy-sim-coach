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

