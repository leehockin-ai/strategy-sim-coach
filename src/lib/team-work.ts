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