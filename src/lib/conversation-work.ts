import { customerProfileSections, reconcileTeamWork, sanitizeWork, type TeamWork, type WorkItem } from "./team-work";
import type { ResolvedSelection } from "./playbook-selection";
import { explicitWorkRefusal } from "./team-interaction";

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

export function conversationWork(messages: ConversationMessage[], roster: string[], starter?: ReturnType<typeof starterBoard>) {
  let work: TeamWork = { provenance: "simulated_client_team", status: "partial", sections: conversationSections.map(s => ({ ...s, items: [] as BoardNote[] })) };
  const history: Array<{ revision: number; work: TeamWork }> = [];
  let counter = 1;
  const nextId = () => `N${counter++}`;
  if (starter?.notes.length) {
    work = { ...work, sections: work.sections.map(s => ({ ...s, items: starter.notes.filter(n => n.key === s.key).map(n => ({ text: n.text, sourceId: OPENING_ID, speaker: starter.speaker, noteId: n.noteId, origin: "starter" as const })) })) };
    history.push({ revision: 1, work });
  }
  const seen = new Set<string>();
  for (const m of messages) {
    if (seen.has(m.id) || m.role !== "stakeholder" || !m.stakeholder_name || !roster.includes(m.stakeholder_name)) continue;
    // Old composite replies cannot safely attribute every embedded speaker to
    // the row's first stakeholder. Keep those raw replies transcript-only.
    if (/\[[^\]]+\]/.test(m.content)) continue;
    seen.add(m.id);
    const { clean, ops } = parseOps(m.content);
    if (explicitWorkRefusal(clean)) continue;
    const source = { id: m.id, speaker: m.stakeholder_name, text: clean, kind: "team" as const };
    const applied = applyOps(work, ops, source, nextId);
    const proposals = clean.split(/(?<=[.!?])\s+|\n+/).flatMap(quote => {
      const text = quote.trim();
      // Questions, hypothetical suggestions, short social replies and explicit board operations are handled separately.
      if (applied.used.some(u => u.includes(text) || text.includes(u)) || text.length < 12 || text.length > 900 || text.includes("?") || /^(?:if\b|could we\b|should we\b|maybe we should\b)/i.test(text)) return [];
      const category = categories.find(([, pattern]) => pattern.test(text));
      return category ? [{ key: category[0], label: category[0], items: [{ source_id: m.id, quote: text }] }] : [];
    });
    const proposed = sanitizeWork({ status: "partial", sections: conversationSections.map(s => ({ ...s, items: proposals.filter(p => p.key === s.key).flatMap(p => p.items).slice(0, 12) })).filter(s => s.items.length).slice(0, 8) }, [source]);
    const reconciled = reconcileTeamWork(applied.work, proposed, [source]);
    const next = { ...reconciled, sections: reconciled.sections.map(s => ({ ...s, items: s.items.map(i => (i as BoardNote).noteId ? i : { ...i, noteId: nextId(), origin: "live" as const }) })) };
    if (JSON.stringify(next.sections) !== JSON.stringify(work.sections)) { work = { ...next, status: history.length ? "revised" : next.status }; history.push({ revision: history.length + 1, work }); }
  }
  return { work: history.length ? work : null, revision: history.length, history };
}

// ── Starting board + explicit team board operations ──────────────────────────
export type BoardNote = WorkItem & { noteId?: string; origin?: "starter" | "live"; revisions?: Array<{ text: string; sourceId: string; speaker: string }> };
export const OPENING_ID = "opening";
export type BoardFormat = "business_model" | "customer_profile" | "light";

/** Layout only. Verified metadata wins; otherwise the coach-saved title/brief picks
 * which standard blocks the team's own starting notes use. Playbook contents are never inferred. */
export function boardFormat(sel: ResolvedSelection): BoardFormat {
  if (sel.kind !== "selected") return "light";
  if (sel.verified) return /customer profile/i.test(sel.verified.goal + sel.verified.outputs.join(" ")) || /customer profile/i.test(sel.title) ? "customer_profile" : "light";
  const said = `${sel.title} ${sel.coachBrief?.purpose ?? ""} ${sel.coachBrief?.expected_output ?? ""}`;
  if (/business model/i.test(said)) return "business_model";
  if (/customer profile|value proposition/i.test(said)) return "customer_profile";
  return "light";
}

type Facts = { update: string; segment: string; value: string; resource: string; job: string; pain: string; assumption: string };
// Team-owned starting drafts written only from each scenario's public context.
const STARTERS: Record<string, Facts> = {
  "The Student Founder": {
    update: "Quick update before we start: the pitch competition is six weeks away and we've kept building.",
    segment: "Our draft customer segment is university students who want to eat better on a tight budget.",
    value: "Our draft value proposition is an app that plans your week of meals and builds the grocery list for you.",
    resource: "What we already have is wireframes and a feature list with AI meal recommendations, grocery integrations and social sharing.",
    job: "We think the job students need done is planning cheap meals for the week without much effort.",
    pain: "We think the biggest pain is not knowing what to cook when money and time are short.",
    assumption: "Our biggest assumption is that students want an app for this at all, because we haven't interviewed anyone yet.",
  },
  "The Distant Sponsor": {
    update: "Quick update: Marcus missed another steering meeting, so we're moving ahead on our own for now.",
    segment: "Our draft customer segment is small business owners who need a loan decision faster than a branch can give them.",
    value: "Our draft value proposition is a digital lending journey that gets a small business an answer in days, not weeks.",
    resource: "What we already have is a working prototype and customer interviews we're preparing.",
    job: "We think the job these owners need done is getting working capital before a cash crunch hits.",
    pain: "We think the biggest pain is waiting weeks on paperwork with no idea where the application stands.",
    assumption: "Our biggest assumption is that credit risk will sign off on a paid pilot, and we haven't really brought Dale's team in yet.",
  },
  "The Solution Factory": {
    update: "Quick update: the roadmap is set and we're working toward the six-month launch.",
    segment: "Our draft customer segment is HR leaders at mid-market companies already using Helix analytics.",
    value: "Our draft value proposition is an AI HR copilot that answers people questions straight from their Helix data.",
    resource: "What we already have is wireframes, a roadmap and a launch date.",
    job: "We think the job HR leaders need done is getting answers about their workforce without waiting on an analyst.",
    pain: "We think the biggest pain is that HR reporting is slow and needs specialists to interpret.",
    assumption: "Our biggest assumption is that customers want a copilot at all, since our main signal so far is that three competitors announced one.",
  },
  "The Confident Executive": {
    update: "Quick update: the twelve-week pilot in three clinics is finished and I want us planning the move to all twenty-two clinics.",
    segment: "Our draft customer segment is patients arriving at our clinics who need to be triaged quickly.",
    value: "Our draft value proposition is a digital triage tool that gets patients to the right care with shorter waits.",
    resource: "What we already have is the triage tool itself and twelve weeks of pilot results from three clinics.",
    job: "We think the job patients need done is being seen by the right person without a long wait.",
    pain: "We think the biggest pain is long, uncertain waits at the front desk.",
    assumption: "The open question the team keeps raising is whether the wait-time gains hold, since one clinic improved, one was unchanged and one got slower.",
  },
};

/** View-only opening scene with team-owned starting notes. Never persisted or scored;
 * every note is an exact sentence of the visible, attributed opening. */
export function starterBoard(scenario: { title?: string; stakeholders?: Array<{ name: string }> }, sel: ResolvedSelection) {
  const speaker = scenario.stakeholders?.[0]?.name;
  const f = STARTERS[scenario.title ?? ""];
  if (!speaker) return null;
  const format = boardFormat(sel);
  if (!f) return { speaker, format, text: "We're ready to talk about our work. Where would you like us to begin?", notes: [] as Array<{ key: string; text: string; noteId: string }> };
  const picks: Array<[string, string]> = format === "business_model" ? [["segments", f.segment], ["value", f.value], ["resources", f.resource], ["unknowns", f.assumption]]
    : format === "customer_profile" ? [["customer", f.segment], ["jobs", f.job], ["pains", f.pain], ["unknowns", f.assumption]]
    : [["resources", f.resource], ["unknowns", f.assumption]];
  const lead = format === "light" ? "Here's where things stand." : "Here's what we've already got on the board.";
  const text = `${f.update} ${lead} ${picks.map(p => p[1]).join(" ")} Where would you like us to start?`;
  return { speaker, format, text, notes: picks.map(([key, t], i) => ({ key, text: t, noteId: `S${i + 1}` })) };
}

const OP = /<<\s*(add|revise)\s+([A-Za-z0-9_]{1,30})\s*>>\s*/gi;
export const stripOps = (c: string) => c.replace(OP, "");
/** Explicit board operations written by a team speaker: the sentence after the marker IS the note. */
export function parseOps(content: string) {
  const ops: Array<{ op: "add" | "revise"; target: string; quote: string }> = [];
  const clean = stripOps(content);
  for (const m of content.matchAll(OP)) {
    const rest = stripOps(content.slice(m.index! + m[0].length));
    const quote = (rest.match(/^[^\n]*?[.!](?=\s|$)/)?.[0] ?? rest.split("\n")[0]).trim();
    if (quote.length >= 12 && quote.length <= 400 && !quote.includes("?") && clean.includes(quote)) ops.push({ op: m[1].toLowerCase() as "add" | "revise", target: m[2], quote });
  }
  return { clean, ops };
}

export function boardPrompt(work: TeamWork | null) {
  const notes = (work?.sections ?? []).flatMap(s => s.items.map(i => { const n = i as BoardNote; return `${n.noteId} [${s.key}] "${n.text}" — ${n.speaker}${n.origin === "starter" ? " (starting draft)" : ""}`; }));
  return `\nCURRENT TEAM BOARD (the team's own simulated sticky notes; drafts, not evidence):\n${notes.join("\n") || "(empty)"}
BOARD RULES:
- The board belongs to the team. Only change it when, in this reply, a team member genuinely decides to in their own words — because the coach's question made them rethink, never just because the coach told them what to write.
- To revise an existing note, start that member's sentence with <<revise ID>> (e.g. <<revise S1>>); the sentence that follows becomes the note's new text, so make it a standalone statement. To add a note, start the sentence with <<add KEY>> where KEY is one of: ${conversationSections.filter(s => s.key !== "evidence").map(s => s.key).join(", ")}.
- At most two markers per reply. Keep uncertainty honest: if something is still untested, say so in the note. Do not invent agreement between members. Never mention the markers or the board mechanics aloud.`;
}

function applyOps(work: TeamWork, ops: ReturnType<typeof parseOps>["ops"], source: { id: string; speaker: string }, next: () => string) {
  const sections = work.sections.map(s => ({ ...s, items: [...s.items] as BoardNote[] }));
  const used: string[] = [];
  for (const o of ops.slice(0, 2)) {
    if (o.op === "add") {
      const s = sections.find(x => x.key === o.target);
      if (!s || s.key === "evidence" || sections.some(x => x.items.some(i => i.text === o.quote)) || s.items.length >= 12) continue;
      s.items.push({ text: o.quote, sourceId: source.id, speaker: source.speaker, noteId: next(), origin: "live" });
    } else {
      for (const s of sections) {
        const at = s.items.findIndex(i => i.noteId === o.target);
        if (at < 0) continue;
        const old = s.items[at];
        if (old.text === o.quote) break;
        s.items[at] = { ...old, text: o.quote, sourceId: source.id, speaker: source.speaker, revisions: [...(old.revisions ?? []), { text: old.text, sourceId: old.sourceId, speaker: old.speaker }] };
        break;
      }
    }
    used.push(o.quote);
  }
  return { work: { ...work, sections }, used };
}
