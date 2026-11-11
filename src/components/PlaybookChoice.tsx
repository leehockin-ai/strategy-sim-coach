import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildSelection, LIBRARY_BROWSE_URL, parsePlaybookUrl, PLAYBOOK_LINK_GUIDANCE, PROVENANCE_LABEL, resolveSelection, verifiedFor, type PlaybookSelection } from "@/lib/playbook-selection";

/** Scope-time playbook decision. Saved inside the versioned Engagement Brief only when valid. */
export function PlaybookChoice({ brief, onCommit }: { brief: { playbook_selection?: PlaybookSelection }; onCommit: (s: PlaybookSelection) => void }) {
  const saved = brief.playbook_selection;
  const [choice, setChoice] = useState<PlaybookSelection["choice"]>(saved?.choice ?? "undecided");
  const [url, setUrl] = useState(saved?.canonical_url ?? ""), [title, setTitle] = useState(saved?.title ?? ""), [reason, setReason] = useState(saved?.reason ?? "");
  const [wb, setWb] = useState(saved?.working_brief ?? { purpose: "", activities: "", expected_output: "" });
  useEffect(() => { if (!saved) return; setChoice(saved.choice); setUrl(saved.canonical_url); setTitle(saved.title); setReason(saved.reason); setWb(saved.working_brief); }, [JSON.stringify(saved)]);
  const parsed = parsePlaybookUrl(url);
  const verified = parsed?.referenceKind === "library_listing" ? verifiedFor(parsed.library, parsed.listingId) : null;
  const valid = choice !== "selected" || (!!parsed && !!title.trim());
  const current = resolveSelection(brief);
  const commit = () => onCommit(buildSelection({ choice, url, title, reason, working_brief: wb }));
  return <section className="mb-5 border-t border-ink pt-4" aria-label="Playbook choice">
    <h3 className="text-sm mb-1">Playbook choice</h3>
    <p className="text-xs text-muted-foreground mb-2">Pick any Strategyzer Library playbook, or deliberately choose none or defer. Your working session inherits this saved choice.</p>
    <p className="text-xs mb-2">Saved: {current.kind === "selected" ? <><a className="underline" href={current.url} target="_blank" rel="noopener noreferrer">{current.title}</a> · {PROVENANCE_LABEL[current.provenance]}</> : current.kind === "undecided" ? "Not decided" : current.kind === "none" ? "No playbook" : "Deferred"}</p>
    <select aria-label="Playbook decision" value={choice} onChange={e => setChoice(e.target.value as PlaybookSelection["choice"])} className="w-full bg-background border border-input p-1 text-xs mb-2">
      <option value="undecided">Not decided yet</option><option value="selected">Use a Library playbook</option><option value="none">No playbook — coach without one</option><option value="defer">Defer the playbook decision</option>
    </select>
    {choice === "selected" && <div className="space-y-2">
      <p className="text-xs text-muted-foreground">No catalog feed is connected. <a className="underline inline-flex items-center gap-1" href={LIBRARY_BROWSE_URL} target="_blank" rel="noopener noreferrer">Browse the Library<ExternalLink className="size-3" /></a> and paste a Library listing link, or use a project playbook run link. A project dashboard alone is not enough. Links do not load private project content.</p>
      <Button type="button" variant="ghost" size="sm" onClick={() => { setUrl(`${LIBRARY_BROWSE_URL}/listings/18`); setTitle("Map out your customer profile with AI"); }}>Use known: Map out your customer profile with AI</Button>
      <label className="text-xs block">Playbook link<Input aria-label="Playbook link" className="mt-1" value={url} onChange={e => setUrl(e.target.value)} placeholder={`${LIBRARY_BROWSE_URL}/listings/…`} /></label>
      {url && !parsed && <p role="alert" className="text-xs text-destructive">{PLAYBOOK_LINK_GUIDANCE}</p>}
      <label className="text-xs block">Playbook title<Input aria-label="Playbook title" className="mt-1" value={title} onChange={e => setTitle(e.target.value)} /></label>
      {parsed && <p className="text-xs text-muted-foreground">{parsed.referenceKind === "library_listing" ? `Library listing ${parsed.listingId}` : `Project playbook run ${parsed.runId}`} · {verified ? PROVENANCE_LABEL.verified_metadata : PROVENANCE_LABEL.link_only}</p>}
      {parsed && !verified && <div className="space-y-2 border-l border-input pl-3">
        <p className="text-xs">Optional working brief (your words, labelled as coach-supplied)</p>
        {(["purpose", "activities", "expected_output"] as const).map(k => <label key={k} className="text-xs block capitalize">{k.replace("_", " ")}<textarea aria-label={`Working brief ${k}`} rows={2} maxLength={k === "activities" ? 1500 : 1000} value={wb[k]} onChange={e => setWb({ ...wb, [k]: e.target.value })} className="w-full border border-input bg-background p-2 text-xs mt-1" /></label>)}
      </div>}
    </div>}
    {choice !== "undecided" && <label className="text-xs block mt-2">Why this choice?<textarea aria-label="Playbook choice reason" rows={2} maxLength={1500} value={reason} onChange={e => setReason(e.target.value)} className="w-full border border-input bg-background p-2 text-xs mt-1" /></label>}
    <Button type="button" size="sm" className="mt-2" disabled={!valid} onClick={commit}>Save playbook choice</Button>
  </section>;
}
