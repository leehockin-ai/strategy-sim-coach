// Public, extractive team-work representation. Private truth is never a source.
import { z } from "zod";

export const workIntents = ["conversation", "assign_work", "coach_work", "revise_work", "intentional_stop"] as const;
export type WorkIntent = typeof workIntents[number];
export type WorkSource = { id: string; speaker: string; text: string; kind: "team" | "coach" | "shared" };
export type WorkItem = { text: string; sourceId: string; speaker: string };
export type TeamWork = {
  provenance: "simulated_client_team"; status: "complete" | "partial" | "revised" | "unresolved" | "stopped_intentionally";
  sections: { key: string; label: string; items: WorkItem[] }[];
};
const proposalSchema = z.object({
  status: z.enum(["complete", "partial", "revised", "unresolved", "stopped_intentionally"]),
  sections: z.array(z.object({ key: z.string().max(60), label: z.string().max(80), items: z.array(z.object({ source_id: z.string(), quote: z.string().min(1).max(900) }).strict()).max(12) }).strict()).max(8),
}).strict();

// The model selects/categorizes exact public quotes; it cannot manufacture new artifact prose.
// This does not establish that a team utterance is true or that an LLM's disclosure was legitimate.
export function sanitizeWork(raw: unknown, sources: WorkSource[]): TeamWork | null {
  const parsed = proposalSchema.safeParse(raw);
  if (!parsed.success) return null;
  const sections = parsed.data.sections.map(section => ({
    key: section.key, label: section.label,
    items: section.items.flatMap(item => {
      const source = sources.find(s => s.id === item.source_id);
      if (!source || source.kind !== "team" || !source.text.includes(item.quote)) return [];
      return [{ text: item.quote, sourceId: source.id, speaker: source.speaker }];
    }),
  }));
  // Labels are supplied by the activity adapter, not trusted model text.
  return { provenance: "simulated_client_team", status: parsed.data.status, sections };
}

export function readTeamWork(raw: unknown): TeamWork | null {
  if (!raw || typeof raw !== "object" || !("provenance" in raw) || raw.provenance !== "simulated_client_team") return null;
  const schema = z.object({ provenance: z.literal("simulated_client_team"), status: proposalSchema.shape.status,
    sections: z.array(z.object({ key: z.string(), label: z.string(), items: z.array(z.object({ text: z.string(), sourceId: z.string(), speaker: z.string() }).strict()) }).strict()),
  }).strict();
  const parsed = schema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export const customerProfileSections = [
  { key: "customer", label: "Customer focus" }, { key: "jobs", label: "Jobs" },
  { key: "pains", label: "Pains" }, { key: "gains", label: "Gains" },
  { key: "evidence", label: "Evidence currently surfaced" }, { key: "unknowns", label: "Assumptions / unknowns" },
] as const;

export function customerProfileWork(raw: unknown, sources: WorkSource[]): TeamWork | null {
  const work = sanitizeWork(raw, sources);
  if (!work) return null;
  return { ...work, sections: customerProfileSections.map(s => ({ ...s, items: work.sections.find(x => x.key === s.key)?.items ?? [] })) };
}

type Correction = { item: WorkItem; from: string; target: string | null; source: WorkSource; quote: string };
const normalized = (text: string) => text.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();
const sameItem = (a: WorkItem, b: WorkItem) => a.sourceId === b.sourceId && a.text === b.text && a.speaker === b.speaker;

// Bounded literal self-corrections only, independent of model intent. No semantic
// inference, coach input, private truth, pronoun resolution or majority voting.
export function reconcileTeamWork(current: TeamWork, proposed: TeamWork | null, responses: WorkSource[]): TeamWork {
  const originals = current.sections.flatMap(s => s.items.map(item => ({ item, from: s.key })));
  const changes: Correction[] = [];
  const blocked: WorkItem[] = [];
  for (const entry of originals) {
    const anchor = normalized(entry.item.text);
    if (anchor.length < 5 || originals.filter(x => normalized(x.item.text) === anchor).length !== 1) continue;
    const candidates: Correction[] = [];
    let conflict = false;
    for (const source of responses.filter(s => s.kind === "team")) {
      for (const quote of source.text.split(/(?<=[.!?])\s+(?=[A-Z])/)) {
        const clause = normalized(quote);
        // A literal quoted short reference is accepted only if it identifies
        // exactly one existing item, never fuzzy similarity or a pronoun.
        const references = [...clause.matchAll(/['"]([^'"]{5,})['"]/g)].map(m => m[1]).filter(ref => anchor.includes(ref) && originals.filter(x => normalized(x.item.text).includes(ref)).length === 1);
        const reference = clause.includes(anchor) ? anchor : references[0];
        if (!reference) continue;
        const at = clause.indexOf(reference);
        if (at < 0 || quote.length > 900) continue;
        // Reject questions, hypotheticals, negation and explicit disagreement.
        if (/\?|\b(if|maybe|perhaps|could|should|might|would)\b/.test(clause)) { conflict = true; continue; }
        if (/\b(not|isn't|wasn't|don't|disagree|keep)\b/.test(clause)) { conflict = true; continue; }
        const before = clause.slice(Math.max(0, at - 100), at), after = clause.slice(at + reference.length, at + reference.length + 130);
        const move = /\b(?:i(?:'ll| will)?|we(?:'ll| will)?) (?:move|reclassify|put)\b/.test(before) && after.match(/\b(?:to|under|in) (?:the )?(unknowns|assumptions|evidence|gains|pains|jobs|customer)\b/);
        const guess = /^(?:['"])?(?: thing)?[\s.,…]*(?:is|was|remains|is still|was just|is just|is only|is still only|i guess that was) (?:a |an |only a |just a |bit of a )?(?:guess|assumption|unknown|untested hypothesis)\b/.test(after)
          || /\b(?:riskiest guess|we(?:'re| are) (?:still )?guessing)\b/.test(before);
        const retract = /\b(?:i|we) (?:retract|withdraw)\s*['"]?$/.test(before);
        const replacement = retract ? after.match(/['"]?[\s;,.-]+(?:instead|replace it with)\s+['"]([^'"]+)['"]/) : null;
        const target = move ? (move[1] === "assumptions" ? "unknowns" : move[1]) : guess ? "unknowns" : retract ? (replacement ? entry.from : null) : undefined;
        if (target === undefined) continue;
        if (source.speaker !== entry.item.speaker) { conflict = true; continue; }
        candidates.push({ ...entry, source, target, quote: replacement?.[1] ?? quote });
      }
    }
    if (conflict || new Set(candidates.map(c => c.target)).size > 1) { blocked.push(entry.item); continue; }
    const correction = candidates[0];
    if (correction) changes.push(correction);
  }
  // Preserve ALL old items unless an explicit authorized correction permits a
  // removal/move. Extractor omission or reclassification alone is insufficient.
  const sections = current.sections.map(s => ({ ...s, items: [...s.items] }));
  for (const change of changes) {
    if (change.target === change.from && !/\b(retract|withdraw)\b/i.test(change.source.text)) continue;
    const from = sections.find(s => s.key === change.from);
    if (!from) continue;
    from.items = from.items.filter(i => !sameItem(i, change.item));
    const target = sections.find(s => s.key === change.target);
    if (target) target.items.push({ text: change.quote, sourceId: change.source.id, speaker: change.source.speaker });
  }
  // Add only current-turn contributions. Historical quotes cannot silently move
  // or reintroduce retracted claims. Conflicting claims stay in the transcript.
  for (const section of proposed?.sections ?? []) {
    const target = sections.find(s => s.key === section.key);
    if (!target) continue;
    for (const item of section.items) {
      const source = responses.find(s => s.id === item.sourceId && s.kind === "team" && s.speaker === item.speaker && s.text.includes(item.text));
      if (!source || originals.some(x => normalized(x.item.text) === normalized(item.text)) || changes.some(c => c.source.id === source.id) || blocked.some(i => normalized(source.text).includes(normalized(i.text)))) continue;
      if (!sections.some(s => s.items.some(i => sameItem(i, item))) && target.items.length < 12) target.items.push(item);
    }
  }
  const changed = JSON.stringify(sections) !== JSON.stringify(current.sections);
  return changed ? { ...current, status: "revised", sections } : current;
}