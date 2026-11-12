// Presentation helpers for My sessions. No data is changed.
const SEEDED_TEST_ID = /^(?:2[a-e]000000|5e1a5e00)-/i;
export function isSeededTestSession(id: unknown): boolean {
  return typeof id === "string" && SEEDED_TEST_ID.test(id);
}
export function lastActivity(s: { updated_at?: string | null; created_at?: string | null }): string {
  return s.updated_at ?? s.created_at ?? "";
}
export type Groupable = { id: string; scenario_id?: string | null; updated_at?: string | null; created_at?: string | null; archived_at?: string | null; title: string };
/** Groups attempts by scenario, most recent activity first; hides seeded test and archived attempts. */
export function groupSessions<T extends Groupable>(sessions: T[]): { key: string; title: string; attempts: T[] }[] {
  const groups = new Map<string, { key: string; title: string; attempts: T[] }>();
  for (const s of sessions) {
    if (isSeededTestSession(s.id) || s.archived_at) continue;
    const key = s.scenario_id ?? `custom:${s.title}`;
    const g = groups.get(key) ?? { key, title: s.title, attempts: [] };
    g.attempts.push(s); groups.set(key, g);
  }
  const list = [...groups.values()];
  for (const g of list) g.attempts.sort((a, b) => lastActivity(b).localeCompare(lastActivity(a)));
  return list.sort((a, b) => lastActivity(b.attempts[0]).localeCompare(lastActivity(a.attempts[0])));
}
