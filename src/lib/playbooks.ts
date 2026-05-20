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
