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

// Level 0 "Linked": the candidate supplies and confirms a link. Coach Compass
// never fetches it and never claims it was verified by Strategyzer.
export function StrategyzerWorkspace({ run, events, briefOutcome }: { run: Run; events: Event[]; briefOutcome?: RuntimeData["briefOutcomes"][string] }) {
  const qc = useQueryClient();
  const fetchConn = useServerFn(getStrategyzerConnections);
  const connect = useServerFn(connectStrategyzerPlaybook);
  const launch = useServerFn(recordStrategyzerLaunch);
  const key = ["strategyzer-connections", run.id];
  const { data, isPending, error, refetch } = useQuery({ queryKey: key, queryFn: () => fetchConn({ data: { runId: run.id } }) });
  const current = data?.connections.find(c => c.status === "connected");
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const pending = useRef<string | null>(null);
  const snap = run.definition_snapshot as { intervention_label?: string };
  const playbook = snap.intervention_label ?? run.intervention_slug ?? "selected";
  const projectName = run.required_project_name ?? "";
  const check = url ? normalizeStrategyzerUrl(url, data?.allowedHosts ?? []) : null;

  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: key }), qc.invalidateQueries({ queryKey: ["activity-runtime", run.session_id] })]);
  const connectMut = useMutation({
    // One candidate confirmation covers project, name and Playbook.
    mutationFn: () => { pending.current ??= crypto.randomUUID(); return connect({ data: { runId: run.id, requestKey: pending.current, url, confirmProject: true, confirmName: true, confirmPlaybook: true, projectName, playbookTitle: "" } }); },
    onSuccess: async () => { pending.current = null; setEditing(false); setUrl(""); setConfirmed(false); await refresh(); toast.success("Playbook link saved"); },
    onError: e => toast.error(e.message),
  });
  async function open() {
    if (!current) return;
    window.open(current.launch_url, "_blank", "noopener,noreferrer");
    try { await launch({ data: { runId: run.id, requestKey: crypto.randomUUID() } }); await refresh(); } catch (e) { toast.error((e as Error).message); }
  }
  async function copy() { await navigator.clipboard.writeText(projectName); toast.success("Project name copied"); }

  const showForm = (!current || editing) && run.status === "active";
  const outcome = briefOutcome && (briefOutcome.success || briefOutcome.decision_to_enable) ? briefOutcome : null;
  if (isPending) return <p className="text-sm text-muted-foreground" role="status">Loading your Playbook link…</p>;
  if (error) return <div role="alert" className="space-y-3"><p>Your Playbook link could not be loaded.</p><Button variant="outline" onClick={() => refetch()}>Try again</Button></div>;
  return <div className="space-y-6">
    <div>
      <h2 className="text-2xl">Working session with the client team</h2>
      <p className="text-sm text-muted-foreground mt-2">{playbook} Playbook</p>
    </div>

    {outcome && <section className="border-l-2 border-primary pl-4">
      <p className="text-xs uppercase text-muted-foreground mb-2">The outcome you're working toward · from your Engagement Brief</p>
      {outcome.success && <p className="text-sm"><span className="font-medium">Success: </span>{outcome.success}</p>}
      {outcome.decision_to_enable && <p className="text-sm mt-1"><span className="font-medium">Decision to enable: </span>{outcome.decision_to_enable}{outcome.decision_maker ? ` — ${outcome.decision_maker}` : ""}</p>}
    </section>}
    {!outcome && <p className="text-sm text-muted-foreground">The outcome from your Engagement Brief isn't available for this working session.</p>}

    {current && <div className="sticky top-0 z-10 border-y border-border py-3 flex flex-wrap items-center justify-between gap-3 bg-background">
      <div className="text-sm min-w-0">
        <p className="font-medium break-words">{current.confirmed_project_name ?? projectName}</p>
        <p className="text-xs text-muted-foreground">{playbook} · Linked by you · Coach Compass can't see inside Strategyzer</p>
      </div>
      <Button onClick={open}><ExternalLink />Open Strategyzer Playbook</Button>
    </div>}

    {showForm && <section className="border border-border p-5 space-y-4" aria-labelledby="connect-playbook">
      <h3 id="connect-playbook" className="text-xl">{editing ? "Change your Playbook link" : "Link your Strategyzer Playbook"}</h3>
      <ol className="text-sm list-decimal pl-5 space-y-2">
        <li>In your own Strategyzer account, create a project with this name:
          <div className="flex flex-wrap items-center gap-2 mt-2"><code className="border border-border bg-muted px-3 py-1.5 text-sm break-all">{projectName}</code><Button size="sm" variant="outline" onClick={copy}><Copy />Copy</Button></div>
        </li>
        <li>Open the <strong>{playbook}</strong> Playbook in that project and copy its link from your browser.</li>
        <li>Paste the link below. Coach Compass never asks for your Strategyzer password.</li>
      </ol>
      <label className="text-sm block">Playbook link<Input className="mt-1" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…strategyzer.com/…" /></label>
      {check && !check.ok && <p className="text-xs text-destructive">{check.error}</p>}
      <label className="flex gap-2 items-start text-sm"><input type="checkbox" className="mt-1" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /><span>I confirm this is the project I created for this assessment, named as shown, using the {playbook} Playbook. <span className="text-muted-foreground">This is your confirmation — Coach Compass cannot check it.</span></span></label>
      <div className="flex gap-3"><Button disabled={!check?.ok || !confirmed || connectMut.isPending} onClick={() => connectMut.mutate()}><Link2 />Save Playbook link</Button>{editing && <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>}</div>
      {editing && <p className="text-xs text-muted-foreground">Your previous link stays in your history.</p>}
    </section>}

    {current && <LiveClientTeam runId={run.id} sessionId={run.session_id} runActive={run.status === "active"} />}

    {current && !editing && <details className="border-t border-border py-4 text-sm">
      <summary className="cursor-pointer font-medium">Playbook link details</summary>
      <div className="pt-4 space-y-2">
        <p>Project: {current.confirmed_project_name ?? projectName}</p>
        <p>Playbook: {current.confirmed_playbook_title || playbook}</p>
        <p className="text-xs text-muted-foreground break-all">{current.launch_url}</p>
        <Button variant="outline" onClick={() => setEditing(true)} disabled={run.status !== "active"}>Change link</Button>
        {data!.connections.length > 1 && <ul className="pt-3">{data!.connections.map(c => <li key={c.id} className="py-2 border-b border-border"><p>Link {c.version} · {c.status === "connected" ? "current" : "replaced"} · {new Date(c.connected_at).toLocaleString()}</p><p className="text-xs text-muted-foreground break-all">{c.supplied_url}</p></li>)}</ul>}
        <details className="pt-3"><summary className="cursor-pointer">Link activity</summary>
          <ol className="divide-y divide-border">{events.filter(e => !(e.metadata && typeof e.metadata === "object" && "team_kind" in e.metadata)).map(e => <li key={e.id} className="py-2"><div className="text-xs text-muted-foreground">{e.actor_type === "coach" ? "You" : "System"} · {new Date(e.occurred_at).toLocaleString()}</div><p className="break-words">{e.content}</p></li>)}</ol>
        </details>
      </div>
    </details>}
  </div>;
}
