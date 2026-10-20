import { Button } from "@/components/ui/button";
import { customerProfileSections, type TeamWork } from "@/lib/team-work";

// Presentation adapters consume existing team work, never private simulation truth.
const adapters = { customer_profile: customerProfileSections };
export function TeamWorkingWall({ work, revision, history, selectedRevision, onRevision, onSource }: {
  work: TeamWork | null | undefined; revision: number; history: { revision: number }[];
  selectedRevision: number | null; onRevision: (revision: number | null) => void; onSource: (sourceId: string) => void;
}) {
  return <section className="min-w-0 border border-border bg-muted/20 p-4 space-y-4" aria-label="Client team working wall">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><h4 className="text-lg">Client team working wall</h4><p className="text-xs text-muted-foreground mt-1">Simulated team work · Not Strategyzer artifact state</p></div>
      {history.length > 0 && <label className="text-xs">Revision <select aria-label="Team work revision" className="ml-2 bg-background border border-border rounded-sm px-2 py-1 text-foreground" value={selectedRevision ?? "latest"} onChange={e => onRevision(e.target.value === "latest" ? null : Number(e.target.value))}><option value="latest">Latest ({revision})</option>{history.map(h => <option key={h.revision} value={h.revision}>{h.revision}</option>)}</select></label>}
    </header>
    {!work ? <p className="text-sm text-muted-foreground">No team work recorded yet.</p> : <>
      <p className="text-xs text-muted-foreground capitalize">{work.status.replaceAll("_", " ")} · revision {selectedRevision ?? revision}</p>
      <div className="grid sm:grid-cols-2 gap-3">{adapters.customer_profile.map(section => {
        const items = work.sections.find(s => s.key === section.key)?.items ?? [];
        return <section key={section.key} className="min-w-0 border-t border-border pt-3"><h5 className="font-medium text-sm mb-2">{section.label}</h5>
          {items.length ? <ul className="space-y-3">{items.map((item, i) => <li key={`${item.sourceId}:${i}`} className="border border-border bg-background p-3 rounded-sm text-sm break-words"><p className="whitespace-pre-wrap">{item.text}</p><Button variant="link" className="h-auto p-0 mt-2 text-xs text-muted-foreground whitespace-normal text-left" onClick={() => onSource(item.sourceId)} aria-label={`View ${item.speaker}'s contribution`}>{item.speaker} · View contribution</Button></li>)}</ul> : <p className="text-sm text-muted-foreground">—</p>}
        </section>;
      })}</div>
    </>}
  </section>;
}