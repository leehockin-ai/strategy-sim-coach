// Public client context vs private assessment truth.
//
// Candidate-facing payloads must only ever carry PUBLIC CLIENT CONTEXT —
// information a coach could plausibly know before engaging the client.
// Private assessment truth (system_prompt, ambiguity_factors,
// unrealistic_aspects, stakeholder posture/hidden dynamics) is
// simulation-internal and must never reach candidate payloads.
//
// Context is provided. Diagnosis is earned.

// Columns safe to select for candidate-facing scenario reads.
export const PUBLIC_SCENARIO_COLUMNS =
  "id, slug, title, industry, difficulty, summary, context, success_definition, success_pressure, stakeholders";

export type PublicStakeholder = {
  name: string;
  role?: string;
  // Optional public description / portrait if a scenario config provides them.
  description?: string;
  portrait?: string;
};

// Narrow one configured stakeholder to its public identity. Anything else
// (posture, hidden motives, private notes) is assessment truth and dropped.
export function publicStakeholder(raw: unknown): PublicStakeholder | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  const name = typeof s.name === "string" ? s.name.trim() : "";
  if (!name) return null;
  const out: PublicStakeholder = { name };
  if (typeof s.role === "string" && s.role.trim()) out.role = s.role;
  if (typeof s.description === "string" && s.description.trim()) out.description = s.description;
  if (typeof s.visible === "string" && s.visible.trim() && !out.description) out.description = s.visible;
  if (typeof s.portrait === "string" && s.portrait.trim()) out.portrait = s.portrait;
  return out;
}

export function publicStakeholders(raw: unknown): PublicStakeholder[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(publicStakeholder).filter((s): s is PublicStakeholder => s !== null);
}

// Narrow a full scenario row (any shape) to its public client-context shape.
// Unknown/private columns are dropped even if a caller selected them.
export function publicScenario<T extends Record<string, unknown> | null | undefined>(scenario: T): T {
  if (!scenario || typeof scenario !== "object") return scenario;
  const s = scenario as Record<string, unknown>;
  return {
    id: s.id,
    slug: s.slug,
    title: s.title,
    industry: s.industry,
    difficulty: s.difficulty,
    summary: s.summary,
    context: s.context,
    success_definition: s.success_definition,
    success_pressure: s.success_pressure,
    stakeholders: publicStakeholders(s.stakeholders),
  } as T;
}
