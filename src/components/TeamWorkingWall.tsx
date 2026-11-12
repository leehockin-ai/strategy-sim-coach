import { Button } from "@/components/ui/button";
import { customerProfileSections, type TeamWork } from "@/lib/team-work";
import type { BoardNote } from "@/lib/conversation-work";
import { workspaceGroups, type WorkspaceView, type NoteOrigin } from "@/lib/workspace-view";

function noteLabel(n: BoardNote, key: string) {
  const kind = key === "unknowns" ? "Assumption / unresolved" : "Draft";
  if (n.origin === "starter" && !n.revisions?.length) return `Starting draft · simulated · ${kind}`;
  if (n.revisions?.length) return `Revised by the team (${n.revisions.length}×) · ${kind}`;
  return `Added in session · ${kind}`;
}

// Presentation adapters consume existing team work, never private simulation truth.
const adapters = { customer_profile: customerProfileSections };
export function TeamWorkingWall({ work, revision, history, selectedRevision, onRevision, onSource, compact = false, view, origins }: {
  work: TeamWork | null | undefined; revision: number; history: { revision: number }[];
  selectedRevision: number | null; onRevision: (revision: number | null) => void; onSource: (sourceId: string) => void;
  compact?: boolean;
  view?: WorkspaceView; origins?: Map<string, NoteOrigin>;
}) {
  return <section className="min-w-0 border border-border bg-muted/20 p-4 space-y-4" aria-label="Client team working wall">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><h4 className="text-lg">{compact ? "Team work" : "Client team working wall"}</h4><p className="text-xs text-muted-foreground mt-1">{compact ? "Team-owned simulated notes · Drafts, not verified evidence" : "Simulated team work · Not Strategyzer artifact state"}</p></div>
      {history.length > 0 && <label className="text-xs">Revision <select aria-label="Team work revision" className="ml-2 bg-background border border-border rounded-sm px-2 py-1 text-foreground" value={selectedRevision ?? "latest"} onChange={e => onRevision(e.target.value === "latest" ? null : Number(e.target.value))}><option value="latest">Latest ({revision})</option>{history.map(h => <option key={h.revision} value={h.revision}>{h.revision}</option>)}</select></label>}
    </header>
    {!work ? <p className="text-sm text-muted-foreground">No team work recorded yet.</p> : <>
      <p className="text-xs text-muted-foreground capitalize">{work.status.replaceAll("_", " ")} · revision {selectedRevision ?? revision}</p>
      <div className={view ? `workspace-blocks workspace-${view}` : compact ? "grid gap-3" : "grid sm:grid-cols-2 gap-3"}>{(view ? workspaceGroups(work, view) : compact ? work.sections.filter(s => s.items.length) : adapters.customer_profile).map(section => {
        const items = "items" in section ? section.items : work.sections.find(s => s.key === section.key)?.items ?? [];
        return <section key={section.key} className="min-w-0 border-t border-border pt-3"><h5 className="font-medium text-sm mb-2">{section.label}</h5>
          {items.length ? <ul className="space-y-3">{items.map((item, i) => {
            const n = item as BoardNote;
            const originalSource = n.revisions?.[0]?.sourceId ?? item.sourceId;
            const origin = origins?.get(originalSource);
            const currentOrigin = origins?.get(item.sourceId);
            return <li key={n.noteId ?? `${item.sourceId}:${i}`} data-note-id={n.noteId} className={`border border-border p-3 rounded-sm text-sm break-words ${compact ? "bg-brand-yellow/15" : "bg-background"}`}>
              {view && <span className="inline-flex min-w-8 h-5 items-center justify-center border border-border bg-background px-1 text-xs mb-2" title={origin?.name ?? "Legacy origin unavailable"} aria-label={`Playbook origin: ${origin?.badge ?? "?"} · ${origin?.name ?? "Legacy origin unavailable"}`}>{origin?.badge ?? "?"}</span>}
              {compact && <p className="text-xs text-muted-foreground mb-1" data-testid="note-label">{n.noteId ? `${n.noteId} · ` : ""}{noteLabel(n, section.key)}</p>}
              <p className="whitespace-pre-wrap">{item.text}</p>
              {compact && !!n.revisions?.length && <details className="mt-2 text-xs text-muted-foreground"><summary className="cursor-pointer">Earlier versions</summary><ol className="mt-1 space-y-2">{n.revisions.map((r, j) => <li key={j}><span className="line-through">{r.text}</span><p>{origins?.get(r.sourceId)?.badge ?? "?"} · {origins?.get(r.sourceId)?.name ?? "Origin unavailable"}</p><Button type="button" variant="link" className="h-auto p-0 text-xs whitespace-normal" onClick={() => onSource(r.sourceId)}>{r.speaker} · View contribution</Button></li>)}</ol></details>}
              {view && n.revisions?.length ? <p className="text-xs text-muted-foreground mt-2">Latest revision · {currentOrigin?.badge ?? "?"} · {currentOrigin?.name ?? "Origin unavailable"}</p> : null}
              <Button variant="link" className="h-auto p-0 mt-2 text-xs text-muted-foreground whitespace-normal text-left" onClick={() => onSource(item.sourceId)} aria-label={`View ${item.speaker}'s contribution`}>{item.speaker} · View contribution</Button>
            </li>;
          })}</ul> : <p className="text-sm text-muted-foreground">—</p>}
        </section>;
      })}</div>
    </>}
  </section>;
}