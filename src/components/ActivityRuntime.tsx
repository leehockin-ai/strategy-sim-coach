import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Play, Save, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getActivityRuntime, startActivityRun, appendActivityEvent } from "@/lib/activity-runtime.functions";
import { workspaceKind, artifactForWorkspace, type ActivityEventInput } from "@/lib/activity-runtime";
import type { Json } from "@/integrations/supabase/types";

type RuntimeData = Awaited<ReturnType<typeof getActivityRuntime>>;
type Run = RuntimeData["runs"][number];
type Definition = RuntimeData["definitions"][number];

export function ActivityRuntimeEntry({ sessionId }: { sessionId: string }) {
  const fetchRuntime = useServerFn(getActivityRuntime);
  const { data } = useQuery({ queryKey: ["activity-runtime", sessionId], queryFn: () => fetchRuntime({ data: { sessionId } }) });
  if (!data || (!data.definitions.length && !data.runs.length)) return null;
  return <div className="flex justify-end mb-4"><Button variant="outline" asChild><Link to="/sessions/$sessionId/activities" params={{ sessionId }}><Play />{data.testAllowed ? "TEST activity workspace" : "Activity workspace"}</Link></Button></div>;
}

export function ActivityRuntime({ data }: { data: RuntimeData }) {
  const qc = useQueryClient();
  const start = useServerFn(startActivityRun);
  const [selected, setSelected] = useState<string | null>(null);
  const pendingStart = useRef<{ definitionId: string; requestKey: string } | null>(null);
  const startMut = useMutation({
    mutationFn: (definitionId: string) => {
      if (!pendingStart.current || pendingStart.current.definitionId !== definitionId) pendingStart.current = { definitionId, requestKey: crypto.randomUUID() };
      return start({ data: { sessionId: data.session.id, ...pendingStart.current } });
    },
    onSuccess: async result => { pendingStart.current = null; setSelected(result.runId); await qc.invalidateQueries({ queryKey: ["activity-runtime", data.session.id] }); },
    onError: e => toast.error(e.message),
  });
  const run = data.runs.find(r => r.id === selected) ?? data.runs.at(-1);
  return <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-8">
    <Button variant="link" className="px-0 mb-6" asChild><Link to="/sessions/$sessionId" params={{ sessionId: data.session.id }}><ArrowLeft />Back to engagement</Link></Button>
    <div className="border-b border-border pb-6 mb-8">
      <p className="text-xs uppercase text-muted-foreground mb-2">Apply · {data.intervention?.label ?? "Activity runs"}</p>
      <h1 className="text-3xl md:text-4xl">Activity workspace</h1>
    </div>
    <div className="grid lg:grid-cols-[260px_minmax(0,1fr)] gap-8">
      <aside className="min-w-0">
        <h2 className="text-lg mb-4">Activities</h2>
        {!data.definitions.length && <p className="text-sm text-muted-foreground">No approved activities configured.</p>}
        {data.definitions.map(def => <div key={def.id} className="border-b border-border pb-5 mb-5">
          {def.test_only && <p className="text-xs font-semibold text-destructive mb-2">TEST / NON-PRODUCTION · Not approved methodology</p>}
          <p className="font-medium break-words">{def.title}</p>
          <p className="text-xs text-muted-foreground mt-1">Version {def.version}</p>
          <Button variant="outline" className="mt-3" disabled={startMut.isPending} onClick={() => startMut.mutate(def.id)}><Play />Start activity</Button>
        </div>)}
        {!!data.runs.length && <><h2 className="text-lg mt-8 mb-3">Attempts</h2>{data.runs.map((r, i) => <Button key={r.id} variant={run?.id === r.id ? "secondary" : "ghost"} className="w-full justify-start mb-1" onClick={() => setSelected(r.id)}>Attempt {i + 1} · {r.status}</Button>)}</>}
      </aside>
      <main className="min-w-0">{run ? <RunWorkspace key={run.id} run={run} data={data} /> : <p className="text-muted-foreground text-sm py-4">No activity run started.</p>}</main>
    </div>
  </div>;
}

function RunWorkspace({ run, data }: { run: Run; data: RuntimeData }) {
  const def = run.definition_snapshot as unknown as Definition;
  const qc = useQueryClient();
  const append = useServerFn(appendActivityEvent);
  const [artifact, setArtifact] = useState<Record<string, unknown>>(run.artifact_state as Record<string, unknown>);
  const [content, setContent] = useState("");
  const [eventType, setEventType] = useState<"coach_message" | "evidence_surfaced" | "assumption_surfaced" | "synthesis" | "decision">("coach_message");
  const [confidence, setConfidence] = useState<"unknown" | "low" | "medium" | "high">("unknown");
  const [ambiguity, setAmbiguity] = useState(false);
  const [stopReason, setStopReason] = useState("");
  const pending = useRef<ActivityEventInput | null>(null);
  const events = data.events.filter(e => e.run_id === run.id);
  const history = data.artifacts.filter(a => a.run_id === run.id);
  useEffect(() => { setArtifact(run.artifact_state as Record<string, unknown>); }, [run.artifact_revision, run.artifact_state]);
  const saveMut = useMutation({
    mutationFn: () => { if (!pending.current) throw new Error("No pending event"); return append({ data: pending.current }); },
    onSuccess: async () => { const type = pending.current?.type; pending.current = null; if (type !== "artifact_edit") setContent(""); await qc.invalidateQueries({ queryKey: ["activity-runtime", run.session_id] }); toast.success("Activity evidence saved"); },
    onError: e => toast.error(e.message),
  });
  const busy = saveMut.isPending || run.status !== "active";
  function record(input: Omit<ActivityEventInput, "runId" | "requestKey">) {
    if (pending.current) return;
    pending.current = { ...input, runId: run.id, requestKey: crypto.randomUUID() };
    saveMut.mutate();
  }
  return <>
    {def.test_only && <div className="border border-destructive text-destructive p-4 mb-6 text-sm font-medium">TEST / NON-PRODUCTION — Not approved Strategyzer methodology</div>}
    <div className="flex flex-wrap justify-between items-start gap-3 mb-6"><div><h2 className="text-2xl break-words">{def.title}</h2><p className="text-sm text-muted-foreground mt-2">Version {run.activity_version} · {run.status} · Scope revision {run.scope_context && typeof run.scope_context === "object" && !Array.isArray(run.scope_context) ? String(run.scope_context.scope_revision ?? "—") : "—"}</p></div></div>
    <dl className="space-y-4 text-sm mb-8">
      <div><dt className="font-semibold">Objective</dt><dd className="mt-1 whitespace-pre-wrap">{def.objective}</dd></div>
      <div><dt className="font-semibold">Activity instructions</dt><dd className="mt-1 whitespace-pre-wrap">{def.instructions}</dd></div>
      <div><dt className="font-semibold">Intended output</dt><dd className="mt-1">{def.intended_output}</dd></div>
      <div><dt className="font-semibold">Methodology reference</dt><dd className="mt-1 whitespace-pre-wrap break-words">{typeof def.methodology_reference === "object" ? JSON.stringify(def.methodology_reference) : String(def.methodology_reference)}</dd></div>
    </dl>
    <section className="border-t border-border pt-6 mb-8">
      <h3 className="text-xl mb-4">Artifact <span className="text-sm text-muted-foreground">· revision {run.artifact_revision}</span></h3>
      <ArtifactEditor definition={def} value={artifact} onChange={setArtifact} disabled={busy || !!pending.current} />
      <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
        <label className="flex gap-2 items-center">Evidence confidence<select aria-label="Evidence confidence" className="border border-input bg-background rounded-sm p-2" value={confidence} onChange={e => setConfidence(e.target.value as typeof confidence)} disabled={busy}><option value="unknown">Unknown</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
        <label className="flex gap-2 items-center"><input type="checkbox" checked={ambiguity} onChange={e => setAmbiguity(e.target.checked)} disabled={busy} />Unresolved ambiguity</label>
        <Button disabled={busy || !!pending.current} onClick={() => record({ type: "artifact_edit", content: "Candidate artifact revision", artifact, expectedRevision: run.artifact_revision, confidence, ambiguity })}><Save />Save artifact</Button>
      </div>
    </section>
    <section className="border-t border-border pt-6 mb-8">
      <h3 className="text-xl mb-4">Activity record</h3>
      <label className="text-sm block mb-3">Record type<select className="block mt-1 border border-input bg-background rounded-sm p-2" value={eventType} onChange={e => setEventType(e.target.value as typeof eventType)} disabled={busy}><option value="coach_message">Coach question / message</option><option value="evidence_surfaced">Evidence surfaced</option><option value="assumption_surfaced">Assumption surfaced</option><option value="synthesis">Synthesis</option><option value="decision">Decision</option></select></label>
      <textarea aria-label="Activity record" className="w-full min-h-24 border border-input bg-background p-3 text-sm rounded-sm" value={content} onChange={e => setContent(e.target.value)} disabled={busy || !!pending.current} />
      <Button className="mt-3" disabled={busy || !content.trim() || !!pending.current} onClick={() => record({ type: eventType, content })}><Save />Save record</Button>
      {saveMut.isError && <div className="mt-4 text-sm text-destructive"><p>{saveMut.error.message}</p><Button variant="outline" className="mt-2" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>Retry saved action</Button><Button variant="ghost" onClick={() => { pending.current = null; saveMut.reset(); qc.invalidateQueries({ queryKey: ["activity-runtime", run.session_id] }); }}>Reload current evidence</Button></div>}
      <ol className="mt-6 divide-y divide-border">{events.map(e => <li key={e.id} className="py-4 text-sm"><div className="text-xs text-muted-foreground mb-1">Event {e.sequence} · {e.actor_type} · {e.event_type.replaceAll("_", " ")}</div><p className="whitespace-pre-wrap break-words">{e.content}</p><p className="text-xs text-muted-foreground mt-2 break-all">{e.evidence_reference}</p></li>)}</ol>
    </section>
    {!!history.length && <details className="border-t border-border py-4 text-sm"><summary className="cursor-pointer font-medium">Artifact history · {history.length} revisions</summary>{history.map(h => <div key={h.id} className="py-4 border-b border-border"><p>Revision {h.revision} · {h.actor_type} · confidence {h.confidence} {h.unresolved_ambiguity ? "· unresolved ambiguity" : ""}</p><pre className="whitespace-pre-wrap break-words text-xs mt-2">{JSON.stringify(h.state, null, 2)}</pre><p className="text-xs text-muted-foreground mt-2 break-all">Event {h.event_id}</p></div>)}</details>}
    {run.status === "active" && <section className="border-t border-border pt-6 mt-4"><h3 className="text-lg mb-3">Stop activity</h3><textarea aria-label="Stop rationale" className="w-full min-h-20 border border-input bg-background rounded-sm p-3 text-sm" value={stopReason} onChange={e => setStopReason(e.target.value)} placeholder="Your rationale" /><Button variant="outline" className="mt-3" disabled={busy || !stopReason.trim() || !!pending.current} onClick={() => record({ type: "candidate_stop", content: stopReason })}><Square />Stop activity</Button></section>}
  </>;
}

function ArtifactEditor({ definition, value, onChange, disabled }: { definition: Definition; value: Record<string, unknown>; onChange: (v: Record<string, unknown>) => void; disabled: boolean }) {
  const kind = workspaceKind(definition.workspace_type);
  const [structured, setStructured] = useState(JSON.stringify(value, null, 2));
  const [invalid, setInvalid] = useState(false);
  useEffect(() => { setStructured(JSON.stringify(value, null, 2)); }, [value]);
  if (kind === "notes") return <textarea aria-label="Artifact notes" className="w-full min-h-44 border border-input bg-background p-3 text-sm rounded-sm" value={String(value.notes ?? "")} onChange={e => onChange({ ...value, notes: e.target.value })} disabled={disabled} />;
  if (kind === "canvas") {
    const normalized = artifactForWorkspace(definition.workspace_type, value) as { cells: Record<string, string> };
    const config = definition.workspace_config as { fields?: Array<{ id: string; label: string }> };
    const fields = config.fields ?? Object.keys(normalized.cells).map(id => ({ id, label: id }));
    return <div className="grid sm:grid-cols-2 gap-4">{fields.map(f => <label key={f.id} className="text-sm">{f.label}<textarea className="block w-full mt-2 min-h-28 border border-input bg-background rounded-sm p-3" value={normalized.cells[f.id] ?? ""} onChange={e => onChange({ ...normalized.cells, [f.id]: e.target.value })} disabled={disabled} /></label>)}</div>;
  }
  return <><textarea aria-label="Structured artifact" className="w-full min-h-44 border border-input bg-background rounded-sm p-3 text-sm font-mono" value={structured} onChange={e => { setStructured(e.target.value); try { const parsed: Json = JSON.parse(e.target.value); if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error(); setInvalid(false); onChange(parsed); } catch { setInvalid(true); } }} disabled={disabled} />{invalid && <p className="text-destructive text-xs mt-2">Enter a valid structured object.</p>}</>;
}