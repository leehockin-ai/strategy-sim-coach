/** Validates "[Name] ..." team replies against the scenario roster and splits multi-speaker replies. */
const TITLES = new Set(["dr", "dr.", "mr", "mr.", "ms", "ms.", "mrs", "mrs.", "prof", "prof.", "nurse", "manager"]);
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/** Canonical names plus first-name aliases (honorifics/role words skipped); an alias shared by two members is ambiguous. */
export function rosterAliases(names: string[]): Map<string, string | null> {
  const map = new Map<string, string | null>();
  const add = (alias: string, name: string) => {
    const k = norm(alias);
    if (!k) return;
    const prev = map.get(k);
    map.set(k, prev === undefined || prev === name ? name : null);
  };
  for (const name of names) add(name, name);
  for (const name of names) {
    const words = name.split(/\s+/);
    const personal = words.filter((w) => !TITLES.has(w.toLowerCase()));
    if (personal.length) {
      add(personal[0], name);
      add(personal.join(" "), name);
    }
  }
  // Canonical full names always win over another member's alias.
  for (const name of names) map.set(norm(name), name);
  return map;
}

export type TeamSegment = { speaker: string; content: string };
export type ParsedTeamReply = { ok: true; segments: TeamSegment[] } | { ok: false; reason: string };

const TAG = /^[ \t]*(?:\*\*|__)?\[([^\]\n]{1,80})\](?:\*\*|__)?[ \t]*:?[ \t]*/gm;

export function parseTeamReply(reply: string, roster: string[]): ParsedTeamReply {
  const aliases = rosterAliases(roster);
  const tags = [...reply.matchAll(TAG)];
  if (!tags.length) return { ok: false, reason: "no speaker tag" };
  if (reply.slice(0, tags[0].index).trim()) return { ok: false, reason: "untagged text before first speaker" };
  const segments: TeamSegment[] = [];
  for (let i = 0; i < tags.length; i++) {
    const raw = tags[i][1].replace(/\(.*?\)/g, "").replace(/[:\s]+$/, "");
    const speaker = aliases.get(norm(raw));
    if (speaker === undefined) return { ok: false, reason: `unknown speaker "${raw}"` };
    if (speaker === null) return { ok: false, reason: `ambiguous speaker "${raw}"` };
    const start = tags[i].index! + tags[i][0].length;
    const content = reply.slice(start, i + 1 < tags.length ? tags[i + 1].index : undefined).trim();
    if (!content) return { ok: false, reason: `empty line for ${speaker}` };
    const last = segments[segments.length - 1];
    if (last && last.speaker === speaker) last.content += `\n\n${content}`;
    else segments.push({ speaker, content });
  }
  return { ok: true, segments };
}
