// Presentation-only cleanup for coach-facing report text. Stored evaluations
// are never rewritten; reviewers keep the detailed view in their own flow.

export const COACH_SECTION_DESCRIPTION: Record<string, string> = {
  situation_framing: "How well you understood the client, framed the real problem and separated evidence from opinion.",
  coaching_strategy: "How you chose to help, and how clearly you explained why that approach fits this client.",
  stakeholder_navigation: "How you worked with different people on the team, their views and their tensions.",
  working_session_facilitation: "How you guided the working session while leaving ownership of the work with the team.",
  methodological_soundness: "How appropriately you used Strategyzer tools and methods for this situation.",
  intervention_discipline: "Whether you stayed focused on the right next step rather than doing too much at once.",
  engagement_pathway: "How sensibly you planned what should come after this session.",
  intervention_fit: "How well your chosen playbook or approach matched what the client actually needed.",
  intervention_execution: "How well you carried out the approach you chose with the team.",
};

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

function humanizeSlug(slug: string): string {
  const words = slug.split("_").filter(Boolean).map((w) => (w === "ai" ? "AI" : w === "vpc" ? "VPC" : w === "bmc" ? "BMC" : w));
  const text = words.join(" ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function coachText(input: unknown): string {
  if (typeof input !== "string") return "";
  let s = input;
  // Internal field names with empty values: "dialogue_commitments: null".
  s = s.replace(/`?\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+`?\s*[:=]\s*(?:null|undefined|""|''|\(empty\)|empty)\b/g, "");
  // IDs (optionally labelled) and their wrappers.
  s = s.replace(/\(?\s*\b(?:moment|revision|message|event|run|id|evidence)?\s*(?:id)?\s*[#:]?\s*`?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}`?\s*\)?/gi, "");
  s = s.replace(UUID, "");
  // Sequence / revision numbers.
  s = s.replace(/\(\s*(?:at\s+)?(?:sequence|seq\.?|turn)\s*#?\s*\d+\s*\)/gi, "");
  s = s.replace(/\b(?:at|in|on)\s+(?:sequence|seq\.?)\s*#?\s*\d+/gi, "during the session");
  s = s.replace(/\b(?:sequence|seq\.?)\s*#?\s*\d+/gi, "a moment in the session");
  s = s.replace(/\brevision\s*#?\s*\d+/gi, "a saved revision");
  // Remaining snake_case tokens (playbook slugs, field names) -> display words.
  s = s.replace(/`?\b([a-z][a-z0-9]*(?:_[a-z0-9]+)+)\b`?/g, (_, slug: string) => humanizeSlug(slug));
  // Address the coach directly.
  s = s.replace(/\bthe candidate's\b/g, "your").replace(/\bThe candidate's\b/g, "Your");
  s = s.replace(/\bthe candidate (is|was|has)\b/g, (_, v: string) => `you ${v === "is" ? "are" : v === "was" ? "were" : "have"}`);
  s = s.replace(/\bThe candidate (is|was|has)\b/g, (_, v: string) => `You ${v === "is" ? "are" : v === "was" ? "were" : "have"}`);
  s = s.replace(/\bthe candidate\b/g, "you").replace(/\bThe candidate\b/g, "You");
  // Tidy leftovers.
  s = s.replace(/\(\s*[,;]?\s*\)/g, "").replace(/[ \t]{2,}/g, " ").replace(/\s+([,.;:)])/g, "$1").replace(/([,;])\s*([,;.])/g, "$2");
  return s.trim();
}

export function coachList(items: unknown): string[] {
  return Array.isArray(items) ? items.map(coachText).filter(Boolean) : [];
}

const TEST_TITLE = /\bTEST\b|NON-PRODUCTION|Phase\s*\d+\s*validation/i;
export function coachDisplayTitle(name: unknown, scenarioTitle: unknown): string {
  const n = typeof name === "string" ? name : "";
  const t = typeof scenarioTitle === "string" && scenarioTitle ? scenarioTitle : "Practice session";
  return !n || TEST_TITLE.test(n) ? t : n;
}
