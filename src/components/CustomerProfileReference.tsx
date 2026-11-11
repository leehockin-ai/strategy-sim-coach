import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { sendPlaybookTeamTurn } from "@/lib/simulator.functions";
import { LEGACY_CUSTOMER_PROFILE_PHASE, PROVENANCE_LABEL, SELECTION_PHASE, resolveSelection } from "@/lib/playbook-selection";

const strip = (c: string) => c.replace(/^\[(playbook_selection_v1|customer_profile_ai_reference_v1)\] /, "");

/** Chapter 2: shows the playbook decision inherited from Scope. No reselection here. */
export function CustomerProfileReference({ session, messages, onSaved }: {
  session: any;
  messages: Array<{ id: string; phase: string | null; role: string; stakeholder_name: string | null; content: string }>;
  onSaved: () => void;
}) {
  const send = useServerFn(sendPlaybookTeamTurn);
  const [busy, setBusy] = useState(false), [draft, setDraft] = useState("");
  const sel = resolveSelection(session.engagement_brief, session.playbook_facilitation_plan);
  const turns = messages.filter(m => m.phase === SELECTION_PHASE || m.phase === LEGACY_CUSTOMER_PROFILE_PHASE);
  async function say() {
    if (!draft.trim() || busy) return;
    setBusy(true);
    try { await send({ data: { sessionId: session.id, activityKey: "selected_playbook", coachMessage: draft.trim(), reference: true } }); setDraft(""); onSaved(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "The team could not reply"); onSaved(); }
    finally { setBusy(false); }
  }
  const first = turns.length === 0;
  return <section className="border border-ink p-5 mb-6 space-y-4 bg-paper" aria-label="Playbook from Scope">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">From your Scope · revision {session.scope_revision ?? 0}</div><h2 className="text-xl mt-1" data-testid="scope-playbook-title">{sel.kind === "selected" ? sel.title : "Working session"}</h2>
        <p className="text-sm text-muted-foreground mt-2">{sel.kind === "selected" ? <span className="break-all" data-testid="scope-playbook-url">{sel.url}</span> : sel.kind === "none" ? "You chose to coach without a playbook." : sel.kind === "defer" ? "You deferred the playbook decision." : "No playbook decision saved in Scope."}{sel.reason ? ` Reason: ${sel.reason}` : ""}</p></div>
      {sel.kind === "selected" && <Button asChild variant="outline"><a href={sel.url} target="_blank" rel="noopener noreferrer">{sel.referenceKind === "project_run" ? "Open Strategyzer playbook run" : "Open in Strategyzer Library"}<ExternalLink /></a></Button>}
    </div>
    {sel.kind === "selected" && <>
      <p className="text-xs text-muted-foreground">{PROVENANCE_LABEL[sel.provenance]}{sel.source === "legacy_customer_profile_opt_in" ? " · earlier session choice" : ""}. Not connected to your Strategyzer account. To change it, revise your Scope.</p>
      {sel.verified && <div className="text-sm space-y-1"><p><strong>Goal:</strong> {sel.verified.goal}</p><p><strong>Sequence:</strong> {sel.verified.sequence.join(" → ")}</p><p><strong>Output:</strong> {sel.verified.outputs.join("; ")}</p></div>}
      {!sel.verified && sel.coachBrief && <div className="text-sm space-y-1"><p><strong>Purpose:</strong> {sel.coachBrief.purpose || "—"}</p><p><strong>Activities:</strong> {sel.coachBrief.activities || "—"}</p><p><strong>Expected output:</strong> {sel.coachBrief.expected_output || "—"}</p></div>}
      {first && <div className="border-l-2 border-ink pl-3 text-sm space-y-1" aria-label="Where to start">
        <p className="font-medium">Where to start</p>
        <ol className="list-decimal pl-4 space-y-0.5"><li>Get familiar with the playbook via the link above.</li><li>Decide what the team should do first.</li><li>Tell the team where to start and what to bring back.</li></ol>
        <p className="text-xs text-muted-foreground">For example: ask them to do the playbook's intro e-learning, if it has one; start the first activity together; or ask what they've already done.</p>
      </div>}
      <p className="text-sm text-muted-foreground">{session.scenarios?.title} · fictional client team. Their ideas and reported evidence remain simulated.</p>
      <ol className="divide-y divide-border">{turns.map(m => <li key={m.id} className="py-3 text-sm"><p className="font-medium">{m.role === "candidate" ? "Coach" : m.stakeholder_name ?? "Team"}</p><p className="whitespace-pre-wrap mt-1">{strip(m.content)}</p></li>)}</ol>
      <label className="block text-sm font-medium">{first ? "Open the session with the team" : "Your coaching turn"}<textarea aria-label="Coach the client team" placeholder={first ? "Where should the team start, and what should they bring back?" : ""} className="block mt-2 min-h-24 w-full border border-input bg-background p-3" value={draft} disabled={busy} onChange={e => setDraft(e.target.value)} /></label>
      <Button disabled={busy || !draft.trim()} onClick={say}><Send />{busy ? "Team responding…" : "Send to team"}</Button>
    </>}
    {sel.kind !== "selected" && <div className="border-l-2 border-ink pl-3 text-sm space-y-1" aria-label="Where to start">
      <p className="font-medium">Start without a playbook</p>
      <p>Open with questions: what has the team done, what do they need to decide, what's still unclear? Agree where to start and what to bring back.</p>
      {sel.kind === "undecided" && <p className="text-xs text-muted-foreground">To use a playbook, choose it in your Scope brief.</p>}
    </div>}
    {sel.kind !== "selected" && turns.length > 0 && <details><summary className="text-sm cursor-pointer">Earlier playbook conversation</summary>{turns.map(m => <p key={m.id} className="text-sm py-2">{m.stakeholder_name ?? "Coach"}: {strip(m.content)}</p>)}</details>}
  </section>;
}
