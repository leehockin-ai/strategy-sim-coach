import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Play, Send, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { beginWorkingSession, concludeWorkingSession, facilitateTeam, getLiveTeam, startSynthesis } from "@/lib/live-team.functions";

type Header = { assessmentReference: string | null; projectName: string; playbook: string; onOpen: () => void };

export function LiveClientTeam({ runId, runActive, header }: { runId: string; runActive: boolean; header: Header }) {
  const qc = useQueryClient();
  const key = ["live-team", runId];
  const fetchTeam = useServerFn(getLiveTeam);
  const begin = useServerFn(beginWorkingSession), say = useServerFn(facilitateTeam), synth = useServerFn(startSynthesis), conclude = useServerFn(concludeWorkingSession);
  const { data } = useQuery({ queryKey: key, queryFn: () => fetchTeam({ data: { runId } }) });
  const [msg, setMsg] = useState("");
  const [concluding, setConcluding] = useState(false);
  const [rationale, setRationale] = useState("");
  const pending = useRef<{ text: string; key: string } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
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
  useEffect(() => { endRef.current?.scrollIntoView({ block: "nearest" }); }, [data?.events.length, sayMut.isPending]);

  if (!data?.available) return null;
  const { config, phase, events } = data;
  const lines = events.filter(e => (e.metadata as { team_kind?: string }).team_kind !== "private_marker");
  const roles = Object.fromEntries(config.participants.map(p => [p.name, p.role]));
  const open = runActive && (phase === "working" || phase === "synthesis");

  return <section className="border-t border-border pt-6 space-y-6">
    {config.poc && <p className="text-xs font-semibold text-destructive">POC simulation configuration · Not approved certification content</p>}
    <div className="border border-border p-4 flex flex-wrap items-center justify-between gap-4 bg-muted/40">
      <div className="text-sm min-w-0">
        <p className="text-xs uppercase text-muted-foreground">Assessment {header.assessmentReference}</p>
        <p className="font-medium break-words">{header.projectName}</p>
        <p className="text-xs text-muted-foreground">{header.playbook} · Connected by candidate (not verified by Strategyzer)</p>
      </div>
      <Button onClick={header.onOpen}><ExternalLink />Open Strategyzer Playbook</Button>
    </div>

    <div>
      <p className="text-xs uppercase text-muted-foreground mb-1">Your assessed activity</p>
      <h3 className="text-xl">{config.title}</h3>
      <p className="text-sm text-muted-foreground">{config.exerciseLabel} · {config.expectedDurationMinutes} min</p>
      <p className="text-sm mt-3 max-w-2xl">{config.instructions}</p>
      <p className="text-xs text-muted-foreground mt-2">Coach Compass cannot see which Strategyzer activity you have open or what your team writes there.</p>
    </div>

    <div>
      <h3 className="text-lg flex items-center gap-2 mb-3"><Users className="size-4" />Live Client Team</h3>
      <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm mb-4">{config.participants.map(p => <li key={p.name}><span className="font-medium">{p.name}</span> <span className="text-muted-foreground">· {p.role}</span></li>)}</ul>
      {phase === "not_started" && <Button disabled={!runActive || !data.connected || simple.isPending} onClick={() => simple.mutate(keyed(k => begin({ data: { runId, requestKey: k } })))}><Play />Begin working session</Button>}
      {phase !== "not_started" && <div className="border border-border">
        <div className="max-h-[480px] overflow-y-auto p-4 space-y-4">
          {lines.map(e => {
            const kind = (e.metadata as { team_kind?: string }).team_kind;
            if (kind === "session_started" || kind === "synthesis_started") return <p key={e.id} className="text-xs text-center text-muted-foreground">{kind === "session_started" ? "Working session started" : "Team brought back together for synthesis"}</p>;
            if (kind === "concluded") return <p key={e.id} className="text-xs text-center text-muted-foreground">Working session concluded</p>;
            const coach = e.actor_type === "coach";
            return <div key={e.id} className={coach ? "pl-8" : "pr-8"}>
              <p className="text-xs text-muted-foreground">{coach ? "You" : `${e.actor_id} · ${roles[e.actor_id ?? ""] ?? ""}`}</p>
              <p className={`text-sm mt-1 whitespace-pre-wrap break-words ${coach ? "border-l-2 border-primary pl-3" : ""}`}>{e.content}</p>
            </div>;
          })}
          {sayMut.isPending && <p className="text-xs text-muted-foreground">The team is responding…</p>}
          <div ref={endRef} />
        </div>
        {open && <div className="border-t border-border p-3 space-y-3">
          {phase === "synthesis" && <p className="text-sm">Bring the team back together before moving on. Facilitate a short synthesis of what the team has established, what remains uncertain, and what matters next.</p>}
          <Textarea value={msg} onChange={e => setMsg(e.target.value)} placeholder="Facilitate the team…" rows={3} maxLength={4000}
            onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && msg.trim()) sayMut.mutate(msg.trim()); }} />
          <div className="flex flex-wrap gap-3 justify-between">
            <Button disabled={!msg.trim() || sayMut.isPending} onClick={() => sayMut.mutate(msg.trim())}><Send />Speak to the room</Button>
            {phase === "working" && <Button variant="outline" disabled={simple.isPending} onClick={() => simple.mutate(keyed(k => synth({ data: { runId, requestKey: k } })))}>Bring the team back together</Button>}
            {phase === "synthesis" && !concluding && <Button variant="outline" onClick={() => setConcluding(true)}>Conclude working session</Button>}
          </div>
          {concluding && <div className="border border-border p-3 space-y-2">
            <p className="text-sm font-medium">Are you ready to conclude this assessed working session?</p>
            <label className="text-sm block">Why are you ready to move on?<Textarea className="mt-1" rows={3} value={rationale} onChange={e => setRationale(e.target.value)} maxLength={4000} /></label>
            <p className="text-xs text-muted-foreground">A finished artifact is not required.</p>
            <div className="flex gap-3"><Button disabled={rationale.trim().length < 10 || simple.isPending} onClick={() => simple.mutate(keyed(k => conclude({ data: { runId, requestKey: k, rationale: rationale.trim() } })))}>Conclude</Button><Button variant="ghost" onClick={() => setConcluding(false)}>Cancel</Button></div>
          </div>}
        </div>}
      </div>}
    </div>
  </section>;
}
