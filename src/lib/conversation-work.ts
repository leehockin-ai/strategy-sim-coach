import { customerProfileSections, reconcileTeamWork, sanitizeWork, type TeamWork } from "./team-work";

export type ConversationMessage = { id: string; phase: string | null; role: string; stakeholder_name: string | null; content: string };
export const conversationSections = [
  ...customerProfileSections.filter(s => s.key !== "evidence"),
  { key: "resources", label: "Key resources / assets" },
  { key: "activities", label: "Key activities" },
  { key: "partners", label: "Key partners" },
  { key: "segments", label: "Customer segments" },
  { key: "channels", label: "Channels" },
  { key: "relationships", label: "Customer relationships" },
  { key: "revenue", label: "Revenue streams" },
  { key: "costs", label: "Cost structure" },
  { key: "value", label: "Value proposition" },
];

// Bounded recognition, not semantic invention. Only explicit team statements
// become exact-quote notes. Unclassified dialogue remains in the transcript.
const categories: Array<[string, RegExp]> = [
  ["unknowns", /\b(assumption|untested hypothesis|(?:we|i)(?:['’](?:re|m)| are| am) (?:just )?(?:guessing|assuming|hypothesizing)|we(?:['’]re| are) proposing|still a guess|only a guess)\b/i],
  ["resources", /\b(key resources?|key assets?|our assets?|resource we (?:have|need)|we have (?:some |a |an |the |our )?(?:base code|code|prototype|database|developer|budget|funding))\b/i],
  ["activities", /\bkey activit(?:y|ies)\b/i], ["partners", /\bkey partners?\b/i],
  ["segments", /\bcustomer segments?\b/i], ["channels", /\b(?:our|distribution|sales) channels?\b/i],
  ["relationships", /\bcustomer relationships?\b/i], ["revenue", /\brevenue streams?\b/i],
  ["costs", /\bcost structure\b/i], ["value", /\bvalue proposition\b/i],
  ["jobs", /\b(?:customer(?:'s)? job\b|job (?:is|to)\b|jobs?:|help (?:students|customers|patients|users) (?:to )?(?:plan|cook|save|find|decide|manage|stop|reduce))/i],
  ["pains", /\b(?:pain (?:is|point)\b|pains?:|biggest frustration)/i],
  ["gains", /\b(?:gain (?:is|would be)\b|gains?:|relief of)/i],
  ["customer", /\b(?:customer focus|target customer)\b/i],
];

export function conversationWork(messages: ConversationMessage[], roster: string[]) {
  let work: TeamWork = { provenance: "simulated_client_team", status: "partial", sections: conversationSections.map(s => ({ ...s, items: [] })) };
  const history: Array<{ revision: number; work: TeamWork }> = [];
  const seen = new Set<string>();
  for (const m of messages) {
    if (seen.has(m.id) || m.role !== "stakeholder" || !m.stakeholder_name || !roster.includes(m.stakeholder_name)) continue;
    // Old composite replies cannot safely attribute every embedded speaker to
    // the row's first stakeholder. Keep those raw replies transcript-only.
    if (/\[[^\]]+\]/.test(m.content)) continue;
    seen.add(m.id);
    const source = { id: m.id, speaker: m.stakeholder_name, text: m.content, kind: "team" as const };
    const proposals = m.content.split(/(?<=[.!?])\s+|\n+/).flatMap(quote => {
      const text = quote.trim();
      // Questions, hypothetical suggestions and short social replies are not work.
      if (text.length < 12 || text.length > 900 || text.includes("?") || /^(?:if\b|could we\b|should we\b|maybe we should\b)/i.test(text)) return [];
      const category = categories.find(([, pattern]) => pattern.test(text));
      return category ? [{ key: category[0], label: category[0], items: [{ source_id: m.id, quote: text }] }] : [];
    });
    const proposed = sanitizeWork({ status: "partial", sections: conversationSections.map(s => ({ ...s, items: proposals.filter(p => p.key === s.key).flatMap(p => p.items).slice(0, 12) })).filter(s => s.items.length).slice(0, 8) }, [source]);
    const next = reconcileTeamWork(work, proposed, [source]);
    if (JSON.stringify(next) !== JSON.stringify(work)) { work = next; history.push({ revision: history.length + 1, work }); }
  }
  return { work: history.length ? work : null, revision: history.length, history };
}

/** Stable scene-setting, not a generated/persisted turn or assessment evidence. */
export function teamOpening(scenario: { title?: string; stakeholders?: Array<{ name: string; role?: string }> }, outcome?: unknown) {
  const lead = scenario.stakeholders?.[0];
  if (!lead) return null;
  const settings: Record<string, string> = {
    "The Student Founder": "We're bringing our student venture to this conversation.",
    "The Distant Sponsor": "We're bringing the team's perspective to this conversation, with the sponsor's role still important.",
    "The Solution Factory": "We're bringing our solution ideas to this conversation.",
    "The Confident Executive": "We're bringing our clinical team's perspective to this conversation.",
  };
  const focus = typeof outcome === "string" && outcome.trim() ? ` Our agreed focus is: ${outcome.trim()}` : "";
  return { speaker: lead.name, text: `${settings[scenario.title ?? ""] ?? "We're ready to talk about our work."}${focus} Where would you like us to begin?` };
}