import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PLAYBOOK_LINK_GUIDANCE, PROVENANCE_LABEL, parsePlaybookUrl, type ResolvedSelection } from "@/lib/playbook-selection";
import { SCOPE_REFERENCE_ID, referenceLabel } from "@/lib/playbook-switch";

/** Collapsed control: add another validated playbook reference or switch back to an earlier one. */
export function PlaybookSwitcher({ activeId, history, disabled, onChange }: {
  activeId: string; history: Array<{ id: string; selection: ResolvedSelection }>; disabled: boolean;
  onChange: (change: unknown) => Promise<boolean>;
}) {
  const [url, setUrl] = useState(""), [title, setTitle] = useState(""), [reason, setReason] = useState(""), [activities, setActivities] = useState("");
  const [returnTo, setReturnTo] = useState<string | null>(null), [returnReason, setReturnReason] = useState("");
  const urlOk = !!parsePlaybookUrl(url);
  const earlier = history.filter(h => h.id !== activeId);
  const input = "block mt-1 w-full border border-input bg-background p-2 text-sm";
  async function add() {
    if (await onChange({ action: "add", url: url.trim(), title: title.trim(), reason: reason.trim(), working_brief: { purpose: "", activities: activities.trim(), expected_output: "" } })) { setUrl(""); setTitle(""); setReason(""); setActivities(""); }
  }
  async function back() {
    if (returnTo && await onChange({ action: "return", target: returnTo, reason: returnReason.trim() })) { setReturnTo(null); setReturnReason(""); }
  }
  return <details className="text-sm border border-border p-3" data-testid="playbook-switcher">
    <summary className="cursor-pointer font-medium">Playbooks used · {history.filter(h => h.selection.kind === "selected").length}</summary>
    <div className="pt-3 space-y-3">
      <p className="font-medium">Add another playbook</p>
      <label className="block">Playbook link<input aria-label="Playbook link" className={input} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://platform.strategyzer.com/…" /></label>
      {url && !urlOk && <p className="text-xs text-destructive">{PLAYBOOK_LINK_GUIDANCE}</p>}
      <label className="block">Title shown in Strategyzer<input aria-label="Playbook title" className={input} value={title} maxLength={200} onChange={e => setTitle(e.target.value)} /></label>
      <label className="block">Why switch now?<textarea aria-label="Reason for adding playbook" className={input} value={reason} maxLength={1500} onChange={e => setReason(e.target.value)} /></label>
      <label className="block">Activity brief <span className="text-muted-foreground">(optional, your own summary)</span><textarea aria-label="Activity brief" className={input} value={activities} maxLength={1500} onChange={e => setActivities(e.target.value)} /></label>
      <Button type="button" variant="outline" disabled={disabled || !urlOk || !title.trim() || !reason.trim()} onClick={add}>Use this playbook</Button>
      {earlier.length > 0 && <div className="border-t border-border pt-3 space-y-2"><p className="font-medium">Earlier references</p>
        <ul className="space-y-2">{earlier.map(h => <li key={h.id} className="flex flex-wrap items-center justify-between gap-2"><span className="min-w-0 break-words">{h.selection.kind === "selected" ? <a href={h.selection.url} target="_blank" rel="noopener noreferrer" className="underline">{referenceLabel(h.selection)}</a> : referenceLabel(h.selection)}{h.id === SCOPE_REFERENCE_ID ? " · from Scope" : ""}{h.selection.kind === "selected" ? <span className="block text-xs text-muted-foreground">{PROVENANCE_LABEL[h.selection.provenance]}{h.selection.reason ? ` · ${h.selection.reason}` : ""}</span> : null}</span><Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={() => setReturnTo(h.id)}>Switch back</Button></li>)}</ul>
        {returnTo && history.find(h => h.id === returnTo) && <div className="space-y-2"><label className="block">Why switch back to {referenceLabel(history.find(h => h.id === returnTo)?.selection ?? { kind: "undecided", reason: "", source: "none" })}?<textarea aria-label="Reason for switching back" className={input} value={returnReason} maxLength={1500} onChange={e => setReturnReason(e.target.value)} /></label><div className="flex gap-2"><Button type="button" variant="outline" disabled={disabled || !returnReason.trim()} onClick={back}>Confirm switch back</Button><Button type="button" variant="ghost" onClick={() => setReturnTo(null)}>Cancel</Button></div></div>}
      </div>}
    </div>
  </details>;
}
