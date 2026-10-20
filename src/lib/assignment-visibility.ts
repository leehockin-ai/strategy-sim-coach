import { publicScenario } from "./scenario-visibility";

// Explicit candidate assignment projection; never spread privileged query rows.
export function publicAssignment(raw: Record<string, any>) {
  const scenario = Array.isArray(raw.scenarios) ? raw.scenarios[0] : raw.scenarios;
  return { id: raw.id, status: raw.status, admin_note: raw.admin_note, due_at: raw.due_at, created_at: raw.created_at,
    program_id: raw.program_id, scenario_id: raw.scenario_id, assigned_to_user_id: raw.assigned_to_user_id,
    programs: raw.programs, scenarios: publicScenario(scenario) };
}