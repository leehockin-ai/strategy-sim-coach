import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, ExternalLink, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { connectStrategyzerPlaybook, getStrategyzerConnections, recordStrategyzerLaunch, type getActivityRuntime } from "@/lib/activity-runtime.functions";
import { normalizeStrategyzerUrl } from "@/lib/activity-runtime";
import { LiveClientTeam } from "@/components/LiveClientTeam";

type RuntimeData = Awaited<ReturnType<typeof getActivityRuntime>>;
type Run = RuntimeData["runs"][number];
type Event = RuntimeData["events"][number];

const CAPABILITY = ["Linked", "Verified", "Observable", "Participatory", "Embedded"];

export function StrategyzerWorkspace({ run, events, briefOutcome }: { run: Run; events: Event[]; briefOutcome?: RuntimeData["briefOutcome"] }) {
  const qc = useQueryClient();
  const fetchConn = useServerFn(getStrategyzerConnections);
  const connect = useServerFn(connectStrategyzerPlaybook);
  const launch = useServerFn(recordStrategyzerLaunch);
  const key = ["strategyzer-connections", run.id];
  const { data } = useQuery({ queryKey: key, queryFn: () => fetchConn({ data: { runId: run.id } }) });
  const current = data?.connections.find(c => c.status === "connected");
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState("");
  const [playbookTitle, setPlaybookTitle] = useState("");
  const [c1, setC1] = useState(false), [c2, setC2] = useState(false), [c3, setC3] = useState(false);
  const pending = useRef<string | null>(null);
  const snap = run.definition_snapshot as { intervention_label?: string };
  const projectName = run.required_project_name ?? "";
  const check = url ? normalizeStrategyzerUrl(url, data?.allowedHosts ?? []) : null;

  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: key }), qc.invalidateQueries({ queryKey: ["activity-runtime", run.session_id] })]);
  const connectMut = useMutation({
    mutationFn: () => { pending.current ??= crypto.randomUUID(); return connect({ data: { runId: run.id, requestKey: pending.current, url, confirmProject: true, confirmName: true, confirmPlaybook: true, projectName, playbookTitle } }); },
    onSuccess: async () => { pending.current = null; setEditing(false); setUrl(""); setC1(false); setC2(false); setC3(false); await refresh(); toast.success("Playbook connected"); },
    onError: e => toast.error(e.message),
  });
  async function open() {
    if (!current) return;
    window.open(current.launch_url, "_blank", "noopener,noreferrer");
    try { await launch({ data: { runId: run.id, requestKey: crypto.randomUUID() } }); await refresh(); } catch (e) { toast.error((e as Error).message); }
  }
  async function copy() { await navigator.clipboard.writeText(projectName); toast.success("Project name copied"); }

  const showForm = !current || editing;
  const outcome = briefOutcome && (briefOutcome.success || briefOutcome.decision_to_enable) ? briefOutcome : null;
  const setupSection = <section className="border-t border-border pt-6">
    <h3 className="text-xl mb-2">1. Create your Strategyzer assessment project</h3>
    <p className="text-sm mb-4">Sign into your Strategyzer Playbook Library account and create a new project using the exact name below. Coach Compass never asks for your Strategyzer password.</p>
    <div className="flex flex-wrap items-center gap-3"><code className="border border-border bg-muted px-3 py-2 text-sm break-all">{projectName}</code><Button variant="outline" onClick={copy}><Copy />Copy project name</Button></div>
    <p className="text-sm mt-4">Inside that project, create or open the <strong>{snap.intervention_label ?? run.intervention_slug}</strong> Playbook — the intervention you committed to in Scope.</p>
  </section>;
  return <div className="space-y-8">
    <div>
      <p className="text-xs uppercase text-muted-foreground mb-2">Assessment {run.assessment_reference} · Capability level {run.integration_capability_level} — {CAPABILITY[run.integration_capability_level ?? 0]}</p>
      <h2 className="text-2xl">Working session with the client team</h2>
      <p className="text-sm text-muted-foreground mt-3 max-w-2xl">You facilitate the real work in your own Strategyzer Playbook environment while the client team responds here in Coach Compass. Keep both open alongside each other.</p>
      <p className="text-sm mt-3 border-l-2 border-border pl-3">Coach Compass cannot see what you do inside Strategyzer.</p>
    </div>

    {outcome && <section className="border border-border p-4 bg-muted/40">
      <p className="text-xs uppercase text-muted-foreground mb-2">The outcome you're working toward · Engagement Brief{outcome.revision ? ` · revision ${outcome.revision}` : ""}</p>
      {outcome.success && <p className="text-sm"><span className="font-medium">Success: </span>{outcome.success}</p>}
      {outcome.decision_to_enable && <p className="text-sm mt-1"><span className="font-medium">Decision to enable: </span>{outcome.decision_to_enable}{outcome.decision_maker ? ` — ${outcome.decision_maker}` : ""}</p>}
    </section>}

    {current && !editing ? <details className="border-t border-border py-4 text-sm">
      <summary className="cursor-pointer font-medium">Setup & connection · {current.confirmed_project_name ?? projectName}</summary>
      <div className="pt-4 space-y-6">
        {setupSection}
        <section className="border-t border-border pt-6">
          <h3 className="text-xl mb-3">Connected workspace</h3>
          <p className="font-medium break-words">{current.confirmed_project_name ?? projectName}</p>
          <p className="text-sm mt-1">Playbook: {current.confirmed_playbook_title || snap.intervention_label}</p>
          <p className="text-sm mt-1">Status: <strong>Connected by candidate</strong> · Candidate confirmed (not verified by Strategyzer)</p>
          <p className="text-xs text-muted-foreground mt-1 break-all">{current.launch_url}</p>
          <div className="flex flex-wrap gap-3 mt-4"><Button onClick={open}><ExternalLink />Open Strategyzer Playbook</Button><Button variant="outline" onClick={() => setEditing(true)} disabled={run.status !== "active"}>Change connection</Button></div>
        </section>
      </div>
    </details> : setupSection}

    {showForm && run.status === "active" && <section className="border-t border-border pt-6">
      <h3 className="text-xl mb-2">2. Connect your Strategyzer Playbook</h3>
      <label className="text-sm block">Project / Playbook URL<Input className="mt-1" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…strategyzer.com/…" /></label>
      {check && !check.ok && <p className="text-xs text-destructive mt-1">{check.error}</p>}
      <label className="text-sm block mt-4">Playbook title as shown in Strategyzer (optional)<Input className="mt-1" value={playbookTitle} maxLength={300} onChange={e => setPlaybookTitle(e.target.value)} /></label>
      <div className="space-y-2 mt-4 text-sm">
        <label className="flex gap-2 items-start"><input type="checkbox" checked={c1} onChange={e => setC1(e.target.checked)} />This is the project I created for this assessment.</label>
        <label className="flex gap-2 items-start"><input type="checkbox" checked={c2} onChange={e => setC2(e.target.checked)} />It uses the required name: {projectName}</label>
        <label className="flex gap-2 items-start"><input type="checkbox" checked={c3} onChange={e => setC3(e.target.checked)} />It uses the {snap.intervention_label ?? "selected"} Playbook I chose in Scope.</label>
      </div>
      <div className="flex gap-3 mt-4"><Button disabled={!check?.ok || !c1 || !c2 || !c3 || connectMut.isPending} onClick={() => connectMut.mutate()}><Link2 />Connect Playbook</Button>{editing && <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>}</div>
      {editing && <p className="text-xs text-muted-foreground mt-2">The previous connection stays in your history.</p>}
    </section>}

    {!!data?.connections.length && <details className="border-t border-border py-4 text-sm"><summary className="cursor-pointer font-medium">Connection history · {data.connections.length}</summary>
      {data.connections.map(c => <div key={c.id} className="py-3 border-b border-border"><p>Connection {c.version} · {c.status === "connected" ? "current" : "replaced"} · {new Date(c.connected_at).toLocaleString()}</p><p className="text-xs text-muted-foreground break-all">{c.supplied_url}</p></div>)}
    </details>}

    {current && <LiveClientTeam runId={run.id} runActive={run.status === "active"} header={{ assessmentReference: run.assessment_reference, projectName: current.confirmed_project_name ?? projectName, playbook: current.confirmed_playbook_title || snap.intervention_label || run.intervention_slug, onOpen: open }} />}

    <section className="border-t border-border pt-6"><h3 className="text-lg mb-3">Activity record</h3>
      <ol className="divide-y divide-border">{events.filter(e => !(e.metadata && typeof e.metadata === "object" && "team_kind" in e.metadata)).map(e => <li key={e.id} className="py-3 text-sm"><div className="text-xs text-muted-foreground">Event {e.sequence} · {e.actor_type === "coach" ? "candidate" : e.actor_type} · {new Date(e.occurred_at).toLocaleString()}</div><p className="break-words">{e.content}</p></li>)}</ol>
    </section>
  </div>;
}
