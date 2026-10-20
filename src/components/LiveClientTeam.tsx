import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Play, Send, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { beginWorkingSession, concludeWorkingSession, facilitateTeam, getLiveTeam, startSynthesis } from "@/lib/live-team.functions";
import { ParticipantIdentity } from "@/components/ParticipantIdentity";
import { WorkingSessionInstructions } from "@/components/WorkingSessionInstructions";
import { TeamWorkingWall } from "@/components/TeamWorkingWall";
import { unavailableRoomCopy } from "@/lib/working-session";

type Header = { assessmentReference: string | null; projectName: string; playbook: string; onOpen: () => void };

export function LiveClientTeam({ runId, runActive, header }: { runId: string; runActive: boolean; header: Header }) {
  const qc = useQueryClient();
  const key = ["live-team", runId];
  const fetchTeam = useServerFn(getLiveTeam);
  const begin = useServerFn(beginWorkingSession), say = useServerFn(facilitateTeam), synth = useServerFn(startSynthesis), conclude = useServerFn(concludeWorkingSession);
  const { data, isPending, error, refetch } = useQuery({ queryKey: key, queryFn: () => fetchTeam({ data: { runId } }) });
  const [msg, setMsg] = useState("");
  const [concluding, setConcluding] = useState(false);
  const [rationale, setRationale] = useState("");
  const [selectedRevision, setSelectedRevision] = useState<number | null>(null);
  const pending = useRef<{ text: string; key: string } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const [source, setSource] = useState<string | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: key });
  const keyed = (fn: (k: string) => Promise<unknown>) => { const k = crypto.randomUUID(); return () => fn(k); };

  const sayMut = useMutation({
    mutationFn: (text: string) => {
      if (!pending.current || pending.current.text !== text) pending.current = { text, key: crypto.randomUUID() };
      return say({ data: { runId, requestKey: pending.current.key, message: text } });
    },
    onSuccess: async () => { pending.current = null; setMsg(""); await refresh(); },
    onError: e => toast.error(e.message),
  });
  const simple = useMutation({ mutationFn: (f: () => Promise<unknown>) => f(), onSuccess: refresh, onError: e => toast.error(e.message) });
  useEffect(() => { const node = transcriptRef.current; if (node) node.scrollTop = node.scrollHeight; }, [data?.available ? data.events.length : 0, sayMut.isPending]);
  function showSource(id: string) {
    setSource(id);
    const node = document.getElementById(`team-event-${id}`);
    node?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  if (isPending) return <p className="text-sm text-muted-foreground py-6" role="status">Loading client team…</p>;
  if (error) return <section className="py-6 space-y-3" role="alert"><p>The client working session could not be loaded.</p><Button variant="outline" onClick={() => refetch()}>Try again</Button></section>;
  if (!data?.available) return <section className="py-6 space-y-2"><h3 className="text-xl">Client working session unavailable</h3><p className="text-sm text-muted-foreground">{unavailableRoomCopy[data?.reason ?? "configuration_missing"]}</p></section>;
  const { config, phase, events } = data;
  const lines = events.filter(e => (e.metadata as { team_kind?: string }).team_kind !== "private_marker");
  const roles = Object.fromEntries(config.participants.map(p => [p.name, p.role]));
  const open = runActive && (phase === "working" || phase === "synthesis");
  const shownWork = selectedRevision === null ? data.work : data.workHistory.find(h => h.revision === selectedRevision)?.work;

  return <section className="border-t border-border pt-6 space-y-6">
    {config.poc && <p className="text-xs font-semibold text-destructive">POC simulation configuration · Not approved certification content</p>}
    <div className="sticky top-0 z-10 border-y border-border py-3 flex flex-wrap items-center justify-between gap-3 bg-background">
      <div className="text-sm min-w-0">
        <p className="text-xs uppercase text-muted-foreground">Assessment {header.assessmentReference}</p>
        <p className="font-medium break-words">{header.projectName}</p>
        <p className="text-xs text-muted-foreground">{header.playbook} · Connected by candidate (not verified by Strategyzer)</p>
      </div>
      <Button onClick={header.onOpen}><ExternalLink />Open Strategyzer Playbook</Button>
    </div>

    {phase === "not_started" ? <WorkingSessionInstructions /> : <details className="text-sm"><summary className="cursor-pointer font-medium">Working session instructions</summary><div className="pt-4"><WorkingSessionInstructions /></div></details>}
    <div>
      <p className="text-xs uppercase text-muted-foreground mb-1">Your working session</p>
      <h3 className="text-xl">{config.title}</h3>
      <p className="text-sm text-muted-foreground">{config.exerciseLabel}</p>
      <p className="text-xs text-muted-foreground mt-2">Coach Compass cannot see which Strategyzer activity you have open or what your team writes there.</p>
    </div>

    <div>
      <h3 className="text-lg flex items-center gap-2 mb-3"><Users className="size-4" />Live Client Team</h3>
      <ul className="flex flex-wrap gap-x-8 gap-y-3 text-sm mb-4">{config.participants.map(p => <li key={p.name}><ParticipantIdentity participant={{ name: p.name, role: p.role }} size="sm" /></li>)}</ul>
      {phase === "not_started" && <Button disabled={!runActive || !data.connected || simple.isPending} onClick={() => simple.mutate(keyed(k => begin({ data: { runId, requestKey: k } })))}><Play />Begin working session</Button>}
      {phase !== "not_started" && <div className="grid xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-5 items-start">
       <div className="min-w-0 border border-border">
        <div ref={transcriptRef} className="h-[420px] overflow-y-auto p-4 space-y-4" aria-label="Working session conversation">
          {lines.map(e => {
            const kind = (e.metadata as { team_kind?: string }).team_kind;
            if (kind === "session_started" || kind === "synthesis_started") return <p key={e.id} className="text-xs text-center text-muted-foreground">{kind === "session_started" ? "Working session started" : "Team brought back together for synthesis"}</p>;
            if (kind === "concluded") return <p key={e.id} className="text-xs text-center text-muted-foreground">Working session concluded</p>;
             if (kind === "work_product") return <p key={e.id} className="text-xs text-center text-muted-foreground">{e.content}</p>;
            const coach = e.actor_type === "coach";
            return <div id={`team-event-${e.id}`} key={e.id} className={`${coach ? "pl-5" : "pr-5"} ${source === e.id ? "bg-accent border-l-2 border-primary p-2" : ""}`}>
              {coach
                ? <p className="text-xs text-muted-foreground">You</p>
                : <ParticipantIdentity participant={{ name: e.actor_id ?? "", role: roles[e.actor_id ?? ""] }} size="sm" />}
              <p className={`text-sm mt-1 whitespace-pre-wrap break-words ${coach ? "border-l-2 border-primary pl-3" : ""}`}>{e.content}</p>
              <time className="text-xs text-muted-foreground" dateTime={e.occurred_at}>{new Date(e.occurred_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
            </div>;
          })}
          {sayMut.isPending && <p className="text-xs text-muted-foreground">The team is responding…</p>}
          <div ref={endRef} />
        </div>
        {open && <div className="border-t border-border p-3 space-y-3">
           {data.work && <p className="text-xs uppercase text-muted-foreground">Continue coaching</p>}
          <Textarea aria-label="Speak to the client team" value={msg} onChange={e => setMsg(e.target.value)} placeholder="Speak to the team…" rows={3} maxLength={4000} disabled={sayMut.isPending || simple.isPending}
            onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && msg.trim()) sayMut.mutate(msg.trim()); }} />
          <div className="flex flex-wrap gap-3 justify-between">
            <Button disabled={!msg.trim() || sayMut.isPending} onClick={() => sayMut.mutate(msg.trim())}><Send />Speak to the room</Button>
            {phase === "working" && <Button variant="outline" disabled={simple.isPending} onClick={() => simple.mutate(keyed(k => synth({ data: { runId, requestKey: k } })))}>Bring the team back together</Button>}
            {phase === "synthesis" && !concluding && <Button variant="outline" onClick={() => setConcluding(true)}>Conclude working session</Button>}
          </div>
          {concluding && <div className="border border-border p-3 space-y-2">
            <p className="text-sm font-medium">Are you ready to conclude this working session?</p>
            <label className="text-sm block">Why are you ready to move on?<Textarea className="mt-1" rows={3} value={rationale} onChange={e => setRationale(e.target.value)} maxLength={4000} /></label>
            <p className="text-xs text-muted-foreground">A finished artifact is not required.</p>
            <div className="flex gap-3"><Button disabled={rationale.trim().length < 10 || simple.isPending} onClick={() => simple.mutate(keyed(k => conclude({ data: { runId, requestKey: k, rationale: rationale.trim() } })))}>Conclude</Button><Button variant="ghost" onClick={() => setConcluding(false)}>Cancel</Button></div>
          </div>}
        </div>}
       </div>
       <TeamWorkingWall work={shownWork} revision={data.revision} history={data.workHistory} selectedRevision={selectedRevision} onRevision={setSelectedRevision} onSource={showSource} />
      </div>}
    </div>
  </section>;
}
