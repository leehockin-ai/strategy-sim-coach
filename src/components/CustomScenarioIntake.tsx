import { useState, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { draftCustomScenario, extractCustomScenarioSource, startCustomPractice, customPracticeCapability } from "@/lib/custom-scenario.functions";
import { INTAKE_LIMIT, UPLOAD_LIMIT, PRACTICE_START_BLOCKER, practiceDraftSchema, practiceIntakeSchema, type PracticeDraft, type PracticeIntake } from "@/lib/custom-scenario";

type Props = { generate?: (data: PracticeIntake) => Promise<{ draft: PracticeDraft; ownerId: string }>; extract?: (data: { name: string; type: string; base64: string }) => Promise<{ text: string; truncated: boolean }>; start?: (draft: PracticeDraft) => Promise<void> };
export function CustomScenarioIntake({ generate, extract, start }: Props = {}) {
  const navigate = useNavigate();
  const capabilityFn = useServerFn(customPracticeCapability);
  const [available, setAvailable] = useState(false);
  const requestId = useRef<string | null>(null);
  useEffect(() => { if (!start) void capabilityFn().then(r => setAvailable(r.available)).catch(() => setAvailable(false)); }, [capabilityFn, start]);
  const draftFn = useServerFn(draftCustomScenario);
  const extractFn = useServerFn(extractCustomScenarioSource);
  const startFn = useServerFn(startCustomPractice);
  const [open, setOpen] = useState(false);
  const [intake, setIntake] = useState({ situation: "", complexity: "beginner" as PracticeIntake["complexity"], dynamics: "", outcome: "", constraints: "" });
  const [safe, setSafe] = useState(false);
  const [draft, setDraft] = useState<PracticeDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const field = "w-full min-w-0 border border-input bg-background p-3 text-sm rounded-sm";
  async function generateDraft() {
    setError(""); setNotice(""); setBusy(true);
    try {
      const data = practiceIntakeSchema.parse({ ...intake, clientSafe: safe });
      const result = await (generate ? generate(data) : draftFn({ data }));
      setDraft(practiceDraftSchema.parse(result.draft));
      requestId.current = null;
      setIntake(i => ({ ...i, situation: "" }));
      setNotice("Review draft created. Original source is no longer held in this form.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create a draft. Your input is retained."); }
    finally { setBusy(false); }
  }
  async function upload(file: File | undefined) {
    if (!file) return;
    setError(""); setBusy(true);
    try {
      if (!file.size || file.size > UPLOAD_LIMIT) throw new Error("Use a nonempty file up to 4 MB.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = ""; for (const b of bytes) binary += String.fromCharCode(b);
      const data = { name: file.name, type: file.type, base64: btoa(binary) };
      const result = await (extract ? extract(data) : extractFn({ data }));
      setIntake(i => ({ ...i, situation: result.text })); setSafe(false);
      setNotice(result.truncated ? "Only the first 24,000 characters were extracted. Check the text before drafting." : "Text extracted; check and redact it before drafting. The file was not saved.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not read the document."); }
    finally { setBusy(false); }
  }
  function clear() { requestId.current = null; setDraft(null); setIntake({ situation: "", complexity: "beginner", dynamics: "", outcome: "", constraints: "" }); setSafe(false); setError(""); setNotice(""); setOpen(false); }
  return <section className="mb-10 border-b border-border pb-8 min-w-0">
    <Button variant="outline" aria-expanded={open} onClick={() => setOpen(!open)}>Create your own scenario to coach</Button>
    {open && <div className="mt-5 max-w-3xl space-y-4">
      <h2 className="text-xl">Custom practice · private review draft</h2>
      <p className="text-sm text-muted-foreground">Practice only, not standardized certification. This draft stays in this open page and is lost on refresh or closing. Nothing is publicly shared.</p>
      {!draft ? <form className="space-y-4" onSubmit={e => { e.preventDefault(); void generateDraft(); }}>
        <label className="block text-sm">Situation or transcript<textarea required minLength={20} maxLength={INTAKE_LIMIT} rows={8} className={field} value={intake.situation} onChange={e => setIntake({ ...intake, situation: e.target.value })} /></label>
        <label className="block text-sm">Upload a document or transcript<input disabled={busy} className="block mt-2 max-w-full text-sm" type="file" accept=".pdf,.txt,.md,.vtt,.srt" onChange={e => { void upload(e.target.files?.[0]); e.target.value = ""; }} /></label>
        <p className="text-xs text-muted-foreground">PDF, TXT, MD, VTT, SRT · up to 4 MB. PDF: up to 50 pages, selectable text only; no OCR, images, audio or Word files. First 24,000 characters only. Upload replaces the text above.</p>
        <label className="block text-sm">Complexity<select className={field} value={intake.complexity} onChange={e => setIntake({ ...intake, complexity: e.target.value as PracticeIntake["complexity"] })}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label>
        {([['dynamics', 'Public stakeholder dynamics'], ['outcome', 'Desired customer outcome'], ['constraints', 'Constraints']] as const).map(([key, label]) => <label key={key} className="block text-sm">{label}<textarea maxLength={2000} rows={2} className={field} value={intake[key]} onChange={e => setIntake({ ...intake, [key]: e.target.value })} /></label>)}
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={safe} onChange={e => setSafe(e.target.checked)} />I have removed private notes, assessment criteria and identifying/confidential details. This source may be used as client-visible practice context by Lovable AI.</label>
        <Button type="submit" disabled={busy || !safe}>{busy ? "Preparing…" : "Create review draft"}</Button>
      </form> : <div className="space-y-4">
        <p className="text-sm text-muted-foreground">AI-created, provisional practice content. Edit the brief and team before starting; it is not verified evidence.</p>
        {([['title', 'Title'], ['brief', 'Client brief'], ['tensions', 'Public tensions'], ['scope', 'Scope'], ['outcome', 'Outcome'], ['constraints', 'Constraints'], ['challenge', 'Coaching challenge']] as const).map(([key, label]) => <label key={key} className="block text-sm">{label}<textarea className={field} rows={key === 'brief' ? 5 : 2} maxLength={key === 'title' ? 160 : key === 'brief' ? 5000 : 2000} value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })} /></label>)}
        <h3 className="text-base">Client team</h3>
        {draft.team.map((member, idx) => <fieldset key={idx} className="grid gap-2 border-t border-border pt-3"><legend className="text-sm">Team member {idx + 1}</legend>{(['name', 'role', 'description'] as const).map(key => <label key={key} className="block text-sm capitalize">{key}<input className={field} maxLength={key === 'description' ? 1000 : key === 'name' ? 100 : 160} value={member[key]} onChange={e => setDraft({ ...draft, team: draft.team.map((m, i) => i === idx ? { ...m, [key]: e.target.value } : m) })} /></label>)}</fieldset>)}
        <p role="status" className="text-sm text-muted-foreground">{available || start ? "Starting freezes this reviewed scenario and team for private practice. It never counts toward certification." : PRACTICE_START_BLOCKER}</p>
        <Button disabled={busy || (!start && !available)} onClick={async () => { setBusy(true); setError(""); try { const d = practiceDraftSchema.parse(draft); if (start) await start(d); else { requestId.current ??= crypto.randomUUID(); const result = await startFn({ data: { requestId: requestId.current, draft: d } }); await navigate({ to: "/sessions/$sessionId", params: { sessionId: result.session.id } }); } } catch (e) { setError(e instanceof Error ? e.message : "Could not start practice."); } finally { setBusy(false); } }}>Start practice · Scope → Approach → Facilitate</Button>
      </div>}
      {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
      {error && <p role="alert" className="text-sm text-destructive break-words">{error}</p>}
      <Button variant="ghost" disabled={busy} onClick={clear}>Discard and close</Button>
    </div>}
  </section>;
}