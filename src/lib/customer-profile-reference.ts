// Historical compatibility shim: the Customer Profile listing is now verified
// metadata within the general Scope playbook selection (see playbook-selection.ts).
import { LEGACY_CUSTOMER_PROFILE_PHASE, selectedPlaybookAssessmentContext, selectedPlaybookTeamContext } from "./playbook-selection";
export const CUSTOMER_PROFILE_REFERENCE = {
  id: "customer_profile_ai_reference_v1",
  title: "Map out your customer profile with AI",
  url: "https://platform.strategyzer.com/playbook_libraries/strategyzer_library/listings/18",
  phase: LEGACY_CUSTOMER_PROFILE_PHASE,
} as const;
export const customerProfileTeamContext = selectedPlaybookTeamContext;
export const customerProfileAssessmentContext = selectedPlaybookAssessmentContext;
