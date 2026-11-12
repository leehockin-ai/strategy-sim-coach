import { Button } from "@/components/ui/button";
import { customerProfileSections, type TeamWork } from "@/lib/team-work";
import type { BoardNote } from "@/lib/conversation-work";

function noteLabel(n: BoardNote, key: string) {
  const kind = key === "unknowns" ? "Assumption / unresolved" : "Draft";
  if (n.origin === "starter" && !n.revisions?.length) return `Starting draft · simulated · ${kind}`;
  if (n.revisions?.length) return `Revised by the team (${n.revisions.length}×) · ${kind}`;
  return `Added in session · ${kind}`;
}

// Presentation adapters consume existing team work, never private simulation truth.
const adapters = { customer_profile: customerProfileSections };
export function TeamWorkingWall({ work, revision, history, selectedRevision, onRevision, onSource, compact = false }: {
  work: TeamWork | null | undefined; revision: number; history: { revision: number }[];
  selectedRevision: number | null; onRevision: (revision: number | null) => void; onSource: (sourceId: string) => void;
  compact?: boolean;
}) {
  return <section className="min-w-0 border border-border bg-muted/20 p-4 space-y-4" aria-label="Client team working wall">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><h4 className="text-lg">{compact ? "Team work" : "Client team working wall"}</h4><p className="text-xs text-muted-foreground mt-1">{compact ? "Team-owned simulated notes · Drafts, not verified evidence" : "Simulated team work · Not Strategyzer artifact state"}</p></div>
      {history.length > 0 && <label className="text-xs">Revision <select aria-label="Team work revision" className="ml-2 bg-background border border-border rounded-sm px-2 py-1 text-foreground" value={selectedRevision ?? "latest"} onChange={e => onRevision(e.target.value === "latest" ? null : Number(e.target.value))}><option value="latest">Latest ({revision})</option>{history.map(h => <option key={h.revision} value={h.revision}>{h.revision}</option>)}</select></label>}
    </header>
    {!work ? <p className="text-sm text-muted-foreground">No team work recorded yet.</p> : <>
      <p className="text-xs text-muted-foreground capitalize">{work.status.replaceAll("_", " ")} · revision {selectedRevision ?? revision}</p>
      <div className={compact ? "grid gap-3" : "grid sm:grid-cols-2 gap-3"}>{(compact ? work.sections.filter(s => s.items.length) : adapters.customer_profile).map(section => {
        const items = work.sections.find(s => s.key === section.key)?.items ?? [];
        return <section key={section.key} className="min-w-0 border-t border-border pt-3"><h5 className="font-medium text-sm mb-2">{section.label}</h5>
          {items.length ? <ul className="space-y-3">{items.map((item, i) => <li key={`${item.sourceId}:${i}`} className={`border border-border p-3 rounded-sm text-sm break-words ${compact ? "bg-brand-yellow/15" : "bg-background"}`}>{compact && <p className="text-xs text-muted-foreground mb-1" data-testid="note-label">{(item as BoardNote).noteId ? `${(item as BoardNote).noteId} · ` : ""}{noteLabel(item as BoardNote, section.key)}</p>}<p className="whitespace-pre-wrap">{item.text}</p>{compact && !!(item as BoardNote).revisions?.length && <details className="mt-2 text-xs text-muted-foreground"><summary className="cursor-pointer">Earlier versions</summary><ol className="mt-1 space-y-1">{(item as BoardNote).revisions!.map((r, j) => <li key={j}><span className="line-through">{r.text}</span> — <button type="button" className="underline" onClick={() => onSource(r.sourceId)}>{r.speaker}</button></li>)}</ol></details>}<Button variant="link" className="h-auto p-0 mt-2 text-xs text-muted-foreground whitespace-normal text-left" onClick={() => onSource(item.sourceId)} aria-label={`View ${item.speaker}'s contribution`}>{item.speaker} · View contribution</Button></li>)}</ul> : <p className="text-sm text-muted-foreground">—</p>}
        </section>;
      })}</div>
    </>}
  </section>;
}