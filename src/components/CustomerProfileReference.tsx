import { useState, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Send, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { sendPlaybookTeamTurn, switchPlaybookReference } from "@/lib/simulator.functions";
import { PlaybookSwitcher } from "@/components/PlaybookSwitcher";
import { SWITCH_PHASE, activeReference, describeSwitch } from "@/lib/playbook-switch";
import { LEGACY_CUSTOMER_PROFILE_PHASE, COACH_PROVENANCE_LABEL, SELECTION_PHASE, resolveSelection } from "@/lib/playbook-selection";
import { OPENING_ID, conversationWork, starterBoard, stripOps, isWorkingConversation } from "@/lib/conversation-work";
import { TeamWorkspace } from "@/components/TeamWorkspace";
import { sourceOrigins } from "@/lib/workspace-view";
import { VoiceInput, appendTranscript } from "@/components/VoiceInput";
import { TeamReplyAudio } from "@/components/TeamReplyAudio";
import { MAX_SCREENSHOT_BYTES, validateScreenshot } from "@/lib/team-attachment";
import { followTranscript, transcriptNearBottom } from "@/lib/transcript-scroll";

const strip = (c: string) => stripOps(c.replace(/^\[(playbook_selection_v1|customer_profile_ai_reference_v1)\] /, ""));

/** Chapter 2: shows the playbook decision inherited from Scope. No reselection here. */
export function CustomerProfileReference({ session, messages, onSaved }: {
  session: any;
  messages: Array<{ id: string; phase: string | null; role: string; stakeholder_name: string | null; content: string }>;
  onSaved: () => void;
}) {
  const send = useServerFn(sendPlaybookTeamTurn);
  const [busy, setBusy] = useState(false), [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState<{ dataUrl: string } | null>(null);
  const [attachmentBusy, setAttachmentBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const transcriptPane = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const coachSent = useRef(false);
  const openedSession = useRef<string | null>(null);
  async function attach(file: File) {
    if (busy || attachmentBusy) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || !file.size || file.size > MAX_SCREENSHOT_BYTES) { setError("Choose a PNG, JPEG or WebP screenshot, no larger than 4 MB."); return; }
    setAttachmentBusy(true); setError("");
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not open screenshot")); reader.onerror = () => reject(new Error("Could not open screenshot")); reader.readAsDataURL(file); });
      validateScreenshot(dataUrl);
      const image = new Image(); image.src = dataUrl; await image.decode();
      if (image.naturalWidth * image.naturalHeight > 20_000_000) throw new Error("Screenshot dimensions are too large (maximum 20 megapixels).");
      setAttachment({ dataUrl });
    } catch (e) { setError(e instanceof Error ? e.message : "Could not open screenshot"); }
    finally { setAttachmentBusy(false); }
  }
  const [selectedRevision, setSelectedRevision] = useState<number | null>(null);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const scopeSel = resolveSelection(session.engagement_brief, session.playbook_facilitation_plan);
  const turns = messages.filter(isWorkingConversation);
  const shown = messages.filter(m => isWorkingConversation(m) || m.phase === SWITCH_PHASE);
  const lastTurn = shown.at(-1)?.id;
  useEffect(() => {
    const pane = transcriptPane.current;
    if (!pane) return;
    const initial = openedSession.current !== session.id;
    if (followTranscript(initial, nearBottom.current, coachSent.current)) {
      pane.scrollTop = pane.scrollHeight;
      nearBottom.current = true;
    }
    openedSession.current = session.id;
    coachSent.current = false;
  }, [session.id, lastTurn]);
  const active = activeReference(scopeSel, messages);
  const sel = active.selection;
  const switchRef = useServerFn(switchPlaybookReference);
  const [switching, setSwitching] = useState(false);
  async function changeReference(change: unknown) {
    setSwitching(true);
    try { await switchRef({ data: { sessionId: session.id, expectedReferenceId: active.id, change: change as any } }); onSaved(); return true; }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not change playbook"); onSaved(); return false; }
    finally { setSwitching(false); }
  }
  const roster = (session.scenarios?.stakeholders ?? []).map((s: { name: string }) => s.name);
  const opening = starterBoard(session.scenarios ?? {}, scopeSel, !!session.custom_practice_snapshot);
  // Historical activity rows are visible, but not replayed into new numbered notes:
  // doing so would shift existing N IDs and invalidate explicit revision targets.
  const wall = conversationWork(turns.filter(m => m.phase === SELECTION_PHASE || m.phase === LEGACY_CUSTOMER_PROFILE_PHASE), roster, opening);
  const origins = sourceOrigins(scopeSel, messages);
  const shownWork = selectedRevision === null ? wall.work : wall.history.find(h => h.revision === selectedRevision)?.work ?? wall.work;
  function showSource(id: string) {
    setSourceId(id);
    const pane = transcriptPane.current;
    const node = document.getElementById(`team-turn-${id}`);
    if (!pane || !node || !pane.contains(node)) return;
    nearBottom.current = false;
    coachSent.current = false;
    pane.scrollTo({ top: pane.scrollTop + node.getBoundingClientRect().top - pane.getBoundingClientRect().top - (pane.clientHeight - node.clientHeight) / 2, behavior: "instant" });
    node?.focus({ preventScroll: true });
  }
  async function say() {
    if (!draft.trim() || busy || attachmentBusy || listening || switching) return;
    setBusy(true); setError("");
    try { await send({ data: { sessionId: session.id, activityKey: "selected_playbook", coachMessage: draft.trim(), reference: true, expectedReferenceId: active.id, ...(attachment ? { attachment } : {}) } }); coachSent.current = true; setDraft(""); setAttachment(null); onSaved(); }
    catch (e) { const message = e instanceof Error ? e.message : "The team could not reply"; setError(message); toast.error(message); onSaved(); }
    finally { setBusy(false); }
  }
  const first = turns.length === 0;
  const outcome = session.engagement_brief?.success;
  const transcript = <ol className="divide-y divide-border" aria-label="Conversation with the team">{opening && <li id={`team-turn-${OPENING_ID}`} tabIndex={-1} className={`py-3 text-sm ${sourceId === OPENING_ID ? "bg-brand-yellow/15 outline outline-1 outline-border" : ""}`}><p className="font-medium">{opening.speaker} <span className="text-xs font-normal text-muted-foreground">· Opening update · simulated, not scored</span></p><p className="whitespace-pre-wrap mt-1">{opening.text}</p></li>}{shown.map(m => m.phase === SWITCH_PHASE ? <li key={m.id} data-testid="playbook-switch-event" className="break-words py-2 text-xs text-muted-foreground border-l-2 border-ink pl-3 my-2">Playbook change · coach decision, not team speech — {describeSwitch(m.content, active.history)}</li> : <li id={`team-turn-${m.id}`} tabIndex={-1} key={m.id} className={`py-3 text-sm break-words ${sourceId === m.id ? "bg-brand-yellow/15 outline outline-1 outline-border" : ""}`}><p className="font-medium">{m.role === "candidate" ? "Coach" : m.stakeholder_name ?? "Team"}</p><p className="whitespace-pre-wrap mt-1">{strip(m.content)}</p></li>)}</ol>;
  return <section className="border border-ink p-5 mb-6 space-y-4 bg-paper" aria-labelledby="ws-heading">
    <h2 id="ws-heading" className="text-xl">Working session with the client team</h2>
    {sel.kind === "selected" && <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-border py-2">
        <p className="text-sm font-medium min-w-0 break-words" data-testid="scope-playbook-title">{sel.title}</p>
        <a data-testid="scope-playbook-link" href={sel.url} target="_blank" rel="noopener noreferrer" className="text-sm underline inline-flex items-center gap-1">{sel.referenceKind === "project_run" ? "Open playbook run" : "Open in Library"}<ExternalLink className="h-3.5 w-3.5" /></a>
      </div>
      {sel.source === "chapter2_switch" && <p className="text-xs text-muted-foreground" data-testid="active-switch-note">Added in this session{active.reason ? ` · Reason: ${active.reason}` : ""}. Scope decision kept: {scopeSel.kind === "selected" ? scopeSel.title : scopeSel.kind}.</p>}
      {(outcome || sel.verified || sel.coachBrief || sel.source === "chapter2_switch") && <details className="text-sm" open={false}><summary className="cursor-pointer text-muted-foreground">Context from your Scope</summary>
        <div className="pt-2 space-y-1">
          {outcome && <p><strong>Outcome:</strong> {String(outcome)}</p>}
          {sel.verified && <><p><strong>Playbook goal:</strong> {sel.verified.goal}</p><p><strong>Output:</strong> {sel.verified.outputs.join("; ")}</p></>}
          {!sel.verified && sel.coachBrief && <><p><strong>Purpose:</strong> {sel.coachBrief.purpose || "—"}</p><p><strong>Expected output:</strong> {sel.coachBrief.expected_output || "—"}</p></>}
          <p className="text-xs text-muted-foreground">{COACH_PROVENANCE_LABEL[sel.provenance]}.{sel.source === "chapter2_switch" ? " Added during this session; your Scope decision is unchanged." : ""}</p>
        </div>
      </details>}
    </>}
    {sel.kind !== "selected" && <div className="border-l-2 border-ink pl-3 text-sm space-y-1" aria-label="Where to start">
      <p className="font-medium">Start without a playbook</p>
      <p>{sel.kind === "none" ? "You chose to coach without a playbook." : sel.kind === "defer" ? "You deferred the playbook decision." : "No playbook decision saved in Scope."}{sel.reason ? ` Reason: ${sel.reason}` : ""}</p>
      {sel.kind === "undecided" && <p className="text-xs text-muted-foreground">You can add a playbook below without changing your Scope.</p>}
    </div>}
    <PlaybookSwitcher activeId={active.id} history={active.history} disabled={busy || switching} onChange={changeReference} />
    <p className="text-sm" aria-label="Where to start">{sel.kind === "selected" ? "Open the playbook beside this conversation. Ask the team where they are, guide them through the next activity, and challenge what is still an assumption." : "Ask the team where they are, agree what to explore next, and challenge what is still an assumption."}</p>
    <p className="text-sm text-muted-foreground" aria-label="Working with the board">Ask the team to explain, test or revise a note.</p>
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div className="min-w-0 space-y-4">
        <div ref={transcriptPane} role="region" aria-label="Coaching transcript" tabIndex={0} className="min-w-0 max-h-[min(25rem,55svh)] overflow-y-auto overflow-x-hidden overscroll-contain pr-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring" onScroll={e => { const p = e.currentTarget; nearBottom.current = transcriptNearBottom(p.scrollTop, p.scrollHeight, p.clientHeight); }}>{transcript}</div>
        <label className="block text-sm font-medium">Your coaching turn<textarea aria-label="Coach the client team" maxLength={4000} placeholder={first ? "Where are you with the work, and what remains uncertain?" : ""} className="block mt-2 min-h-24 w-full border border-input bg-background p-3" value={draft} disabled={busy} onPaste={e => { const image = Array.from(e.clipboardData.files).find(f => f.type.startsWith("image/")); if (image) { e.preventDefault(); void attach(image); } }} onChange={e => setDraft(e.target.value)} /></label>
        {attachment && <figure className="space-y-2"><img src={attachment.dataUrl} alt="Screenshot draft" className="max-h-60 max-w-full object-contain border border-border" /><figcaption className="text-xs text-muted-foreground">Coach-provided reference · not verified evidence. Pixels are used only for this turn, not saved; the image will be unavailable after refresh.</figcaption><Button type="button" variant="outline" disabled={busy} onClick={() => setAttachment(null)} aria-label="Remove screenshot"><X />Remove screenshot</Button></figure>}
        <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" aria-label="Attach screenshot" onChange={e => { const file = e.target.files?.[0]; if (file) void attach(file); e.target.value = ""; }} />
        <div className="flex flex-wrap items-center gap-2"><Button type="button" variant="outline" title="Attach a screenshot (PNG, JPEG or WebP; up to 4 MB)" disabled={busy || attachmentBusy} onClick={() => fileInput.current?.click()}><ImagePlus />{attachmentBusy ? "Opening screenshot…" : "Attach screenshot"}</Button><VoiceInput singleTurn showFallback disabled={busy} onListeningChange={setListening} onTranscript={c => setDraft(p => appendTranscript(p, c))} /><Button disabled={busy || attachmentBusy || listening || switching || !draft.trim()} onClick={say}><Send />{busy ? "Team responding…" : "Send to team"}</Button></div>
        <p className="text-xs text-muted-foreground">Dictation uses your browser's speech service only when started. Review the text before sending. Unsent questions and screenshots are not saved across refresh.</p>
        <TeamReplyAudio messages={turns} roster={roster} busy={busy || listening} />
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
      <TeamWorkspace work={shownWork} revision={wall.revision} history={wall.history} selectedRevision={selectedRevision} onRevision={setSelectedRevision} onSource={showSource} origins={origins} />
    </div>
  </section>;
}
