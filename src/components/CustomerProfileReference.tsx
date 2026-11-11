import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { sendPlaybookTeamTurn } from "@/lib/simulator.functions";
import { LEGACY_CUSTOMER_PROFILE_PHASE, PROVENANCE_LABEL, SELECTION_PHASE, resolveSelection } from "@/lib/playbook-selection";
import { conversationWork, teamOpening } from "@/lib/conversation-work";
import { TeamWorkingWall } from "@/components/TeamWorkingWall";

const strip = (c: string) => c.replace(/^\[(playbook_selection_v1|customer_profile_ai_reference_v1)\] /, "");

/** Chapter 2: shows the playbook decision inherited from Scope. No reselection here. */
export function CustomerProfileReference({ session, messages, onSaved }: {
  session: any;
  messages: Array<{ id: string; phase: string | null; role: string; stakeholder_name: string | null; content: string }>;
  onSaved: () => void;
}) {
  const send = useServerFn(sendPlaybookTeamTurn);
  const [busy, setBusy] = useState(false), [draft, setDraft] = useState("");
  const [selectedRevision, setSelectedRevision] = useState<number | null>(null);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const sel = resolveSelection(session.engagement_brief, session.playbook_facilitation_plan);
  const turns = messages.filter(m => m.phase === SELECTION_PHASE || m.phase === LEGACY_CUSTOMER_PROFILE_PHASE);
  const roster = (session.scenarios?.stakeholders ?? []).map((s: { name: string }) => s.name);
  const wall = conversationWork(turns, roster);
  const shownWork = selectedRevision === null ? wall.work : wall.history.find(h => h.revision === selectedRevision)?.work ?? wall.work;
  const opening = teamOpening(session.scenarios ?? {}, session.engagement_brief?.success);
  function showSource(id: string) {
    setSourceId(id);
    const node = document.getElementById(`team-turn-${id}`);
    node?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "center" });
    node?.focus({ preventScroll: true });
  }
  async function say() {
    if (!draft.trim() || busy) return;
    setBusy(true);
    try { await send({ data: { sessionId: session.id, activityKey: "selected_playbook", coachMessage: draft.trim(), reference: true } }); setDraft(""); onSaved(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "The team could not reply"); onSaved(); }
    finally { setBusy(false); }
  }
  const first = turns.length === 0;
  const outcome = session.engagement_brief?.success;
  const transcript = <ol className="divide-y divide-border" aria-label="Conversation with the team">{opening && <li className="py-3 text-sm"><p className="font-medium">{opening.speaker} <span className="text-xs font-normal text-muted-foreground">· Opening scene</span></p><p className="whitespace-pre-wrap mt-1">{opening.text}</p></li>}{turns.map(m => <li id={`team-turn-${m.id}`} tabIndex={-1} key={m.id} className={`py-3 text-sm break-words ${sourceId === m.id ? "bg-brand-yellow/15 outline outline-1 outline-border" : ""}`}><p className="font-medium">{m.role === "candidate" ? "Coach" : m.stakeholder_name ?? "Team"}</p><p className="whitespace-pre-wrap mt-1">{strip(m.content)}</p></li>)}</ol>;
  return <section className="border border-ink p-5 mb-6 space-y-4 bg-paper" aria-labelledby="ws-heading">
    <h2 id="ws-heading" className="text-xl">Working session with the client team</h2>
    {sel.kind === "selected" && <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-border py-2">
        <p className="text-sm font-medium min-w-0 break-words" data-testid="scope-playbook-title">{sel.title}</p>
        <a data-testid="scope-playbook-link" href={sel.url} target="_blank" rel="noopener noreferrer" className="text-sm underline inline-flex items-center gap-1">{sel.referenceKind === "project_run" ? "Open playbook run" : "Open in Library"}<ExternalLink className="h-3.5 w-3.5" /></a>
      </div>
      {(outcome || sel.verified || sel.coachBrief) && <details className="text-sm" open={false}><summary className="cursor-pointer text-muted-foreground">Context from your Scope</summary>
        <div className="pt-2 space-y-1">
          {outcome && <p><strong>Outcome:</strong> {String(outcome)}</p>}
          {sel.verified && <><p><strong>Playbook goal:</strong> {sel.verified.goal}</p><p><strong>Output:</strong> {sel.verified.outputs.join("; ")}</p></>}
          {!sel.verified && sel.coachBrief && <><p><strong>Purpose:</strong> {sel.coachBrief.purpose || "—"}</p><p><strong>Expected output:</strong> {sel.coachBrief.expected_output || "—"}</p></>}
          <p className="text-xs text-muted-foreground">{PROVENANCE_LABEL[sel.provenance]}. Coach Compass doesn't read the linked playbook. To change it, revise your Scope.</p>
        </div>
      </details>}
    </>}
    {sel.kind !== "selected" && <div className="border-l-2 border-ink pl-3 text-sm space-y-1" aria-label="Where to start">
      <p className="font-medium">Start without a playbook</p>
      <p>{sel.kind === "none" ? "You chose to coach without a playbook." : sel.kind === "defer" ? "You deferred the playbook decision." : "No playbook decision saved in Scope."}{sel.reason ? ` Reason: ${sel.reason}` : ""}</p>
      {sel.kind === "undecided" && <p className="text-xs text-muted-foreground">To use a playbook, choose it in your Scope brief.</p>}
    </div>}
    <p className="text-sm" aria-label="Where to start">{sel.kind === "selected" ? "Open the playbook beside this conversation. Ask the team where they are, guide them through the next activity, and challenge what is still an assumption." : "Ask the team where they are, agree what to explore next, and challenge what is still an assumption."}</p>
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)]">
      <div className="min-w-0 space-y-4">
        {transcript}
        <label className="block text-sm font-medium">Your coaching turn<textarea aria-label="Coach the client team" placeholder={first ? "Where are you with the work, and what remains uncertain?" : ""} className="block mt-2 min-h-24 w-full border border-input bg-background p-3" value={draft} disabled={busy} onChange={e => setDraft(e.target.value)} /></label>
        <Button disabled={busy || !draft.trim()} onClick={say}><Send />{busy ? "Team responding…" : "Send to team"}</Button>
      </div>
      <aside className="min-w-0 lg:sticky lg:top-4 self-start"><TeamWorkingWall compact work={shownWork} revision={wall.revision} history={wall.history} selectedRevision={selectedRevision} onRevision={setSelectedRevision} onSource={showSource} /></aside>
    </div>
  </section>;
}
