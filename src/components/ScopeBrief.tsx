import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Save, Plus, Trash2, ArrowUp, ArrowDown, History } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateSession, listInterventions } from "@/lib/simulator.functions";
import { PlaybookChoice } from "@/components/PlaybookChoice";
import { resolveSelection } from "@/lib/playbook-selection";
import { BRIEF_FIELDS, readEngagementBrief, legacyFraming, type EngagementBrief } from "@/lib/scope-brief";

const CORE_FIELDS = [
  { key: "coaching_challenge", label: "The real challenge" },
  { key: "decision_to_enable", label: "The decision this work must enable" },
] as const;
const CORE_KEYS = new Set<string>(CORE_FIELDS.map(f => f.key));
const OPTIONAL_FIELDS = BRIEF_FIELDS.filter(f => !CORE_KEYS.has(f.key));
const AUTO_OPEN_AFTER_MESSAGES = 3;
const FIELD_EXAMPLES: Record<string, string> = {
  client_situation: "What is the client's situation right now?",
  stated_challenge: "What does the client say they want?",
  coaching_challenge: "What do you think needs attention, and why?",
  evidence: "What has the client actually reported, and how do they know?",
  assumptions: "What is being assumed but not yet tested?",
  decision_to_enable: "What decision should this engagement help them make?",
  decision_maker: "Who decides?",
  success: "What would show this engagement helped?",
  scope: "What is in scope for this engagement?",
  participants: "Who needs to take part?",
};
type Message = { id: string; phase: string; role: string; stakeholder_name: string | null; content: string };
type Revision = { id: string; revision: number; snapshot: unknown; evidence_message_ids: string[]; created_at: string };
export function ScopeBrief({ session, messages, revisions, onRefresh, onDirtyChange, onReadyToSubmit, onOpenChange }: {
  session: { id: string; engagement_brief?: unknown; framing_notes?: string | null; chosen_intervention_slug?: string | null; intervention_rationale?: string | null; scope_revision?: number };
  messages: Message[]; revisions: Revision[]; onRefresh: () => void; onDirtyChange: (dirty: boolean) => void; onReadyToSubmit?: () => void; onOpenChange?: (open: boolean) => void;
}) {
  const [brief, setBrief] = useState(() => readEngagementBrief(session.engagement_brief));
  const [dirty, setDirty] = useState(false);
  const [choiceInvalid, setChoiceInvalid] = useState(false);
  const latest = useRef(brief);
  const dirtyRef = useRef(false);
  const [showHistory, setShowHistory] = useState(false);
  const [saveState, setSaveState] = useState("Saved");
  const save = useServerFn(updateSession);
  const fetchInterventions = useServerFn(listInterventions);
  const { data } = useQuery({ queryKey: ["interventions"], queryFn: () => fetchInterventions(), staleTime: 300000 });
  const options = data?.interventions ?? [];
  useEffect(() => {
    if (!dirtyRef.current) { const next = readEngagementBrief(session.engagement_brief); latest.current = next; setBrief(next); }
  }, [session.engagement_brief]);
  function edit(next: EngagementBrief) { latest.current = next; dirtyRef.current = true; setBrief(next); setDirty(true); setSaveState("Unsaved changes"); }
  const saving = useMutation({
    mutationFn: (draft: EngagementBrief) => save({ data: { sessionId: session.id, engagementBrief: draft } }),
    onSuccess: (_result, draft) => {
      if (JSON.stringify(latest.current) === JSON.stringify(draft)) { dirtyRef.current = false; setDirty(false); setSaveState("Saved"); }
      onRefresh();
    },
    onError: (e: Error) => { setSaveState("Save failed — retry"); toast.error(e.message); },
  });
  useEffect(() => {
    if (!dirty || saving.isPending || saving.isError) return;
    const timer = setTimeout(() => saving.mutate(latest.current), 1200);
    return () => clearTimeout(timer);
  }, [brief, dirty, saving.isPending, saving.isError]);
  useEffect(() => {
    onDirtyChange(dirty || saving.isPending || choiceInvalid);
  }, [dirty, saving.isPending, choiceInvalid, onDirtyChange]);
  useEffect(() => {
    const preventLoss = (e: BeforeUnloadEvent) => { if (dirtyRef.current) { e.preventDefault(); e.returnValue = ""; } };
    const preventLinkLoss = (e: MouseEvent) => {
      if (dirtyRef.current && e.target instanceof Element && e.target.closest('a[href]')) {
        e.preventDefault(); e.stopPropagation(); toast.error("Save your engagement brief before leaving Scope.");
      }
    };
    window.addEventListener("beforeunload", preventLoss);
    document.addEventListener("click", preventLinkLoss, true);
    return () => { window.removeEventListener("beforeunload", preventLoss); document.removeEventListener("click", preventLinkLoss, true); };
  }, []);
  const framing = legacyFraming(session.framing_notes);
  const evidence = messages.filter(m => m.phase === "scoping" || m.phase === "intervention");
  const coachMessages = messages.filter(m => m.role === "candidate").length;
  const decided = !!brief.playbook_selection && brief.playbook_selection.choice !== "undecided";
  const drafted = CORE_FIELDS.filter(f => brief[f.key].trim()).length + (decided ? 1 : 0);
  const hasContent = BRIEF_FIELDS.some(f => brief[f.key].trim()) || !!brief.playbook_selection || brief.intervention_sequence.length > 0 || !!brief.revision_note.trim();
  const optionalFilled = OPTIONAL_FIELDS.filter(f => brief[f.key].trim()).length;
  const [open, setOpen] = useState(hasContent || coachMessages >= AUTO_OPEN_AFTER_MESSAGES);
  const touched = useRef(false);
  useEffect(() => { if (!touched.current && !open && (hasContent || coachMessages >= AUTO_OPEN_AFTER_MESSAGES)) setOpen(true); }, [hasContent, coachMessages, open]);
  useEffect(() => { onOpenChange?.(open); }, [open, onOpenChange]);
  const textField = (f: { key: typeof BRIEF_FIELDS[number]["key"]; label: string }) => <div key={f.key}>
    <label htmlFor={`brief-${f.key}`} className="text-xs block mb-1">{f.label}</label>
    <textarea id={`brief-${f.key}`} value={brief[f.key]} rows={2} maxLength={4000} placeholder={FIELD_EXAMPLES[f.key]} onChange={e => edit({ ...brief, [f.key]: e.target.value })} className="w-full resize-y border border-input bg-background p-2 text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-ring" />
  </div>;
  return <aside className="min-w-0 border-t border-ink pt-6 xl:border-t-0 xl:border-l xl:pl-6 xl:pt-0" aria-label="Your working view">
    <div className="flex flex-wrap justify-between gap-3 items-start mb-4">
      <button type="button" aria-expanded={open} aria-controls="working-view-body" onClick={() => { touched.current = true; setOpen(!open); }} className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="text-lg block">Your working view <span className="text-sm text-muted-foreground">· {drafted} of 3 drafted</span></span>
        <span role="status" className="text-xs text-muted-foreground block mt-1">{open ? "Hide" : "Open"} · {saving.isPending ? "Saving…" : saveState} · Revision {session.scope_revision ?? 0}</span>
      </button>
      {open && <Button variant="outline" size="icon" title="Save working view" aria-label="Save engagement brief" disabled={!dirty || saving.isPending} onClick={() => saving.mutate(latest.current)}><Save /></Button>}
    </div>
    <div id="working-view-body" hidden={!open}>
    <p className="mb-4 text-xs text-muted-foreground">Listen first, then write your working view. You can revise it anytime.</p>
    <div className="space-y-3 mb-4">{CORE_FIELDS.map(textField)}</div>
    <h3 className="text-sm border-t border-ink pt-4">How you'll help and why</h3>
    <PlaybookChoice brief={brief} onInvalidChange={setChoiceInvalid} onCommit={selection => { if (JSON.stringify(latest.current.playbook_selection) === JSON.stringify(selection)) return; edit({ ...latest.current, playbook_selection: selection }); }} />
    <p className="text-xs mb-4"><strong>Primary intervention:</strong> {options.find(o => o.slug === session.chosen_intervention_slug)?.label ?? session.chosen_intervention_slug ?? "Chosen under Your Approach"}{session.intervention_rationale && <span className="block text-muted-foreground mt-1 whitespace-pre-wrap">{session.intervention_rationale}</span>}</p>
    <details className="border-t border-ink py-3" data-brief-section="optional">
      <summary className="text-xs cursor-pointer">Add more detail (optional){optionalFilled > 0 ? ` · ${optionalFilled} drafted` : ""}</summary>
      <p className="text-[11px] text-muted-foreground mt-2 mb-3">Write in your own words — this is your hypothesis, not the client's statement. Tick client lines under "Conversation evidence" to show what they actually said.</p>
      <div className="space-y-3">{OPTIONAL_FIELDS.map(textField)}</div>
      <section className="mt-4 border-t border-input pt-3">
      <div className="flex justify-between items-center gap-2"><span className="text-xs">Proposed sequence (optional)</span><Button variant="ghost" size="icon" title="Add sequenced intervention" aria-label="Add sequenced intervention" disabled={brief.intervention_sequence.length >= 12} onClick={() => { const first = options[0]; if (first) edit({ ...brief, intervention_sequence: [...brief.intervention_sequence, { slug: first.slug, rationale: "" }] }); }}><Plus /></Button></div>
      {brief.intervention_sequence.map((entry, i) => <div key={i} className="border-t border-input pt-3 mt-2">
        <div className="flex gap-1 items-center"><span className="text-xs shrink-0">{i + 1}.</span><select aria-label={`Sequence intervention ${i + 1}`} value={entry.slug} onChange={e => edit({ ...brief, intervention_sequence: brief.intervention_sequence.map((s, j) => j === i ? { ...s, slug: e.target.value } : s) })} className="min-w-0 flex-1 w-full bg-background border border-input p-1 text-xs">{options.map(o => <option key={o.slug} value={o.slug}>{o.label}</option>)}</select></div>
        <label htmlFor={`sequence-rationale-${i}`} className="text-xs mt-2 block">Why this move, and when?</label><textarea id={`sequence-rationale-${i}`} rows={2} value={entry.rationale} maxLength={2000} onChange={e => edit({ ...brief, intervention_sequence: brief.intervention_sequence.map((s, j) => j === i ? { ...s, rationale: e.target.value } : s) })} className="w-full border border-input bg-background p-2 text-xs mt-1" />
        <div className="flex justify-end"><Button variant="ghost" size="icon" title="Move earlier" aria-label={`Move intervention ${i + 1} earlier`} disabled={i === 0} onClick={() => { const sequence = [...brief.intervention_sequence]; [sequence[i - 1], sequence[i]] = [sequence[i], sequence[i - 1]]; edit({ ...brief, intervention_sequence: sequence }); }}><ArrowUp /></Button><Button variant="ghost" size="icon" title="Move later" aria-label={`Move intervention ${i + 1} later`} disabled={i === brief.intervention_sequence.length - 1} onClick={() => { const sequence = [...brief.intervention_sequence]; [sequence[i], sequence[i + 1]] = [sequence[i + 1], sequence[i]]; edit({ ...brief, intervention_sequence: sequence }); }}><ArrowDown /></Button><Button variant="ghost" size="icon" title="Remove intervention" aria-label={`Remove intervention ${i + 1}`} onClick={() => edit({ ...brief, intervention_sequence: brief.intervention_sequence.filter((_, j) => j !== i) })}><Trash2 /></Button></div>
      </div>)}
    </section>
    <details className="border-t border-ink py-3"><summary className="text-xs cursor-pointer">Conversation evidence ({evidence.length})</summary><div className="max-h-72 overflow-y-auto space-y-3 mt-3">{evidence.map(m => <label key={m.id} className="flex gap-2 text-xs items-start"><input type="checkbox" className="mt-1" checked={brief.evidence_message_ids.includes(m.id)} onChange={e => edit({ ...brief, evidence_message_ids: e.target.checked ? [...brief.evidence_message_ids, m.id] : brief.evidence_message_ids.filter(id => id !== m.id) })} /><span><strong>{m.role === "candidate" ? "Coach" : m.stakeholder_name}</strong><span className="block whitespace-pre-wrap mt-1">{m.content}</span></span></label>)}</div></details>
    <label htmlFor="scope-change" className="text-xs block mt-3 mb-1">What changed your understanding?</label><textarea id="scope-change" rows={2} value={brief.revision_note} maxLength={2000} onChange={e => edit({ ...brief, revision_note: e.target.value })} className="w-full border border-input bg-background p-2 text-sm" />
    {Object.keys(framing).length > 0 && <details className="border-t border-ink py-3 mt-4"><summary className="text-xs cursor-pointer">Saved framing evidence</summary><dl className="text-xs space-y-2 mt-3">{Object.entries(framing).map(([k, v]) => <div key={k}><dt className="font-medium capitalize">{k}</dt><dd className="whitespace-pre-wrap text-muted-foreground">{v}</dd></div>)}</dl></details>}
    </details>
    <Button variant="ghost" className="mt-3" onClick={() => setShowHistory(!showHistory)}><History />Revision history ({revisions.length})</Button>
    {showHistory && <div className="mt-3 space-y-3 max-h-96 overflow-y-auto">{[...revisions].reverse().map(r => {
      const snapshot = r.snapshot as { engagement_brief?: unknown; framing_notes?: string; chosen_intervention_slug?: string; intervention_rationale?: string; dialogue_commitments?: string };
      const previous = readEngagementBrief(snapshot.engagement_brief);
      return <details key={r.id} className="border-t border-input pt-2"><summary className="text-xs cursor-pointer">Revision {r.revision} · {new Date(r.created_at).toLocaleString()}</summary><p className="text-xs my-2 whitespace-pre-wrap">{previous.revision_note}</p><dl className="text-xs space-y-2">{BRIEF_FIELDS.filter(f => previous[f.key]).map(f => <div key={f.key}><dt className="font-medium">{f.label}</dt><dd className="whitespace-pre-wrap">{previous[f.key]}</dd></div>)}<div><dt className="font-medium">Intervention</dt><dd>{snapshot.chosen_intervention_slug ?? "Not selected"} · {snapshot.intervention_rationale}</dd></div><div><dt className="font-medium">Playbook choice</dt><dd>{(() => { const p = resolveSelection(snapshot.engagement_brief); return p.kind === "selected" ? `${p.title} · ${p.url}` : p.source === "none" ? "Not recorded" : p.kind; })()}</dd></div><div><dt className="font-medium">Proposed sequence</dt><dd>{previous.intervention_sequence.map(s => `${s.slug}: ${s.rationale}`).join(" → ") || "None"}</dd></div><div><dt className="font-medium">Framing / commitments</dt><dd className="whitespace-pre-wrap">{snapshot.framing_notes}<br />{snapshot.dialogue_commitments}</dd></div></dl><div className="text-xs mt-2">{r.evidence_message_ids.length} conversation messages preserved at this revision</div></details>;
    })}</div>}
    </div>
    {onReadyToSubmit && <div className="border-t border-ink pt-4 mt-4"><button type="button" onClick={onReadyToSubmit} className="text-sm font-medium underline underline-offset-4 text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">I’m ready to submit my approach for coaching</button></div>}
  </aside>;
}