import type { LiveEvidence } from "@/lib/evaluation-live-evidence";

export function ReviewLiveEvidence({ evidence }: { evidence: LiveEvidence }) {
  return <section className="space-y-5" aria-label="Public live-room assessment evidence">
    <h3 className="text-lg">Live client-team evidence</h3>
    <p className="text-sm text-muted-foreground">Simulated client-team work · Strategyzer contents are not verified.</p>
    {!evidence.runs.length && <p className="text-sm text-muted-foreground">No observable live client-team session recorded. Legacy evidence remains below.</p>}
    {evidence.runs.map(run => <div key={run.id} className="border-t border-border pt-4 space-y-4">
      <p className="font-medium break-words">{run.intervention} · Run {run.id}</p>
      <p className="text-sm">{run.identities.map(p => `${p.name} · ${p.role}`).join(" / ")}</p>
      <details><summary className="cursor-pointer text-sm font-medium">Bound Scope {run.scope ? `· Revision ${run.scope.revision}` : "unavailable"}</summary>
        {run.scope && <dl className="text-sm space-y-2 mt-3"><dt>Intended outcome</dt><dd className="whitespace-pre-wrap">{run.scope.brief.success || "Not articulated"}</dd><dt>Decision to enable</dt><dd>{run.scope.brief.decision_to_enable || "Not articulated"}</dd><dt>Decision-maker</dt><dd>{run.scope.brief.decision_maker || "Not articulated"}</dd><dt>Scope reference</dt><dd className="break-all">{run.scope.id}</dd></dl>}
      </details>
      <ul className="text-sm text-muted-foreground space-y-1">{run.gaps.map(gap => <li key={gap}>{gap}</li>)}</ul>
      <details><summary className="cursor-pointer text-sm font-medium">Public conversation and conclusion · {run.moments.length} moments</summary>
        <ol className="mt-3 space-y-4">{run.moments.map(m => <li key={m.id} id={`review-live-${m.id}`} className="text-sm break-words"><p className="font-medium">{m.speaker} · {m.kind}{m.conclusionType === "early_stop" ? " (early stop by coach decision, no synthesis step)" : m.conclusionType === "after_synthesis" ? " (after synthesis)" : ""} · {m.timestamp}</p><p className="whitespace-pre-wrap">{m.text}</p><p className="text-xs text-muted-foreground">#{m.sequence} · {m.id}</p></li>)}</ol>
      </details>
      <details><summary className="cursor-pointer text-sm font-medium">Team-owned work revisions · {run.revisions.length}</summary>
        <div className="space-y-5 mt-3">{run.revisions.map(r => <div key={r.id} className="border-t border-border pt-3 text-sm space-y-2"><p className="font-medium">Revision {r.revision} from {r.baseRevision} · {r.work.status} · {r.timestamp}</p><p className="text-xs text-muted-foreground break-all">{r.id} · Work event {r.eventId} · Coach event {r.instructionEventId}</p>{r.work.sections.map(s => <div key={s.key}><h4 className="font-medium">{s.label}</h4><ul>{s.items.map((item, i) => <li key={`${item.sourceId}-${i}`} className="py-1 whitespace-pre-wrap">{item.speaker}: {item.text} <a className="underline text-primary break-all" href={`#review-live-${item.sourceId}`}>{item.sourceId}</a></li>)}</ul>{!s.items.length && <p className="text-muted-foreground">No recorded contribution</p>}</div>)}</div>)}</div>
      </details>
    </div>)}
  </section>;
}