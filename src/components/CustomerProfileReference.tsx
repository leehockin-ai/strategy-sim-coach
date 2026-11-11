import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { sendPlaybookTeamTurn, updateSession } from "@/lib/simulator.functions";
import { CUSTOMER_PROFILE_REFERENCE, referenceChoice, type ReferenceChoice } from "@/lib/customer-profile-reference";

export function CustomerProfileReference({ session, messages, onSaved }: {
  session: any;
  messages: Array<{ id: string; phase: string | null; role: string; stakeholder_name: string | null; content: string }>;
  onSaved: () => void;
}) {
  const save = useServerFn(updateSession), send = useServerFn(sendPlaybookTeamTurn);
  const [busy, setBusy] = useState(false), [draft, setDraft] = useState("");
  const choice = referenceChoice(session.playbook_facilitation_plan);
  const turns = messages.filter(m => m.phase === CUSTOMER_PROFILE_REFERENCE.phase);
  async function choose(next: ReferenceChoice) {
    setBusy(true);
    try {
      await save({ data: { sessionId: session.id, playbookFacilitationPlanPatch: { customer_profile_reference: { id: CUSTOMER_PROFILE_REFERENCE.id, choice: next, url: CUSTOMER_PROFILE_REFERENCE.url } } } });
      onSaved();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not save reference choice"); }
    finally { setBusy(false); }
  }
  async function say() {
    if (!draft.trim() || busy) return;
    setBusy(true);
    try {
      await send({ data: { sessionId: session.id, activityKey: "customer_profile", coachMessage: draft.trim(), reference: true } });
      setDraft(""); onSaved();
    } catch (e) { toast.error(e instanceof Error ? e.message : "The team could not reply"); onSaved(); }
    finally { setBusy(false); }
  }
  return <section className="border-y border-border py-6 mb-6 space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-xl">Working session design · optional reference</h2><p className="text-sm text-muted-foreground mt-2">{CUSTOMER_PROFILE_REFERENCE.title}</p></div>
      <Button asChild variant="outline"><a href={CUSTOMER_PROFILE_REFERENCE.url} target="_blank" rel="noopener noreferrer">Open playbook preview<ExternalLink /></a></Button>
    </div>
    <p className="text-sm text-muted-foreground">Customer Profile introduction → worked example → AI-assisted mapping → refinement. Jobs, pains and gains only; no Value Map required. Reference only—not connected to your Strategyzer account.</p>
    <label className="block text-sm">Reference for this working session
      <select aria-label="Customer Profile reference" className="block mt-2 border border-input bg-background p-2 w-full sm:w-auto" disabled={busy} value={choice} onChange={e => choose(e.target.value as ReferenceChoice)}>
        <option value="other">Keep my current approach / another playbook</option><option value="use">Use this reference with the client team</option><option value="defer">Defer this reference</option>
      </select>
    </label>
    {choice === "use" && <>
      <p className="text-sm text-muted-foreground">{session.scenarios?.title} · fictional client team. Their ideas and reported evidence remain simulated, not validated findings.</p>
      <ol className="divide-y divide-border">{turns.map(m => <li key={m.id} className="py-3 text-sm"><p className="font-medium">{m.role === "candidate" ? "Coach" : m.stakeholder_name ?? "Team"}</p><p className="whitespace-pre-wrap mt-1">{m.content.replace(`[${CUSTOMER_PROFILE_REFERENCE.id}] `, "")}</p></li>)}</ol>
      <label className="block text-sm">Your coaching turn<textarea aria-label="Coach the client team" className="block mt-2 min-h-24 w-full border border-input bg-background p-3" value={draft} disabled={busy} onChange={e => setDraft(e.target.value)} /></label>
      <Button disabled={busy || !draft.trim()} onClick={say}><Send />{busy ? "Team responding…" : "Send to team"}</Button>
    </>}
    {choice !== "use" && turns.length > 0 && <details><summary className="text-sm cursor-pointer">Earlier reference conversation</summary>{turns.map(m => <p key={m.id} className="text-sm py-2">{m.stakeholder_name ?? "Coach"}: {m.content.replace(`[${CUSTOMER_PROFILE_REFERENCE.id}] `, "")}</p>)}</details>}
  </section>;
}