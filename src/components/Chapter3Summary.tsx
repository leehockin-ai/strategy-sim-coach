import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getChapter3Summary } from "@/lib/chapter3.functions";
import type { Chapter3Summary as Summary, Disposition } from "@/lib/chapter3-summary";

const time = (iso: string | null) => (iso ? new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "");

function dispositionText(d: Disposition): { title: string; body: string } {
  switch (d.kind) {
    case "after_synthesis": return { title: "Concluded after bringing the team together", body: `You ran a synthesis step and then concluded the working session (${time(d.at)}).` };
    case "early_stop": return { title: "You stopped the working session early", body: `Stopping intentionally is a valid coaching choice. No synthesis step took place. Your reason: “${d.rationale}”` };
    case "unspecified": return { title: "Working session concluded", body: "This session was concluded before the type of ending was recorded, so we don't show whether a synthesis step happened." };
    case "skipped": return { title: d.roomUnavailable ? "Moved on — working session not available" : "Moved on without concluding the working session", body: `Your recorded reason: “${d.reason}”` };
    case "unavailable": return { title: "No client working session in this session", body: "A live client team wasn't available for this client and approach, so there is no team work to summarise." };
    case "not_concluded": return { title: "Working session not concluded", body: "The working session was started but not concluded. What the team said so far is shown below." };
    case "no_room": return { title: "No client working session recorded", body: "There is no live client team record for this session. Older sessions and other approaches keep their earlier work." };
  }
}

export function Chapter3Summary({ sessionId }: { sessionId: string }) {
  const fetchSummary = useServerFn(getChapter3Summary);
  const { data, isLoading, isError } = useQuery({ queryKey: ["chapter3-summary", sessionId], queryFn: () => fetchSummary({ data: { sessionId } }) });
  if (isLoading) return <div className="text-sm text-muted-foreground" role="status">Loading what happened in your engagement…</div>;
  if (isError || !data) return <div className="text-sm text-muted-foreground">Your Chapter 1 and 2 summary couldn't be loaded. Your saved work is unaffected.</div>;
  return <SummaryView s={data} />;
}

export function SummaryView({ s }: { s: Summary }) {
  const d = dispositionText(s.disposition);
  return (
    <section aria-labelledby="ch3-summary" className="border border-ink bg-paper mb-8">
      <div className="p-5 border-b border-ink bg-secondary">
        <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">What happened so far · read-only</div>
        <h3 id="ch3-summary" className="text-xl mt-1">Where the engagement stands</h3>
        <p className="text-xs text-muted-foreground mt-1">Built only from your saved Engagement Brief and what the client team actually said and wrote. Nothing here is filled in for you.</p>
      </div>
      <div className="grid lg:grid-cols-2">
        <div className="p-5 border-b lg:border-b-0 lg:border-r border-ink space-y-5">
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1">Intended client outcome · Chapter 1</div>
            {s.outcome.status === "bound" && <>
              {s.outcome.success && <p className="text-sm"><span className="font-medium">Success: </span>{s.outcome.success}</p>}
              {s.outcome.decision && <p className="text-sm mt-1"><span className="font-medium">Decision to enable: </span>{s.outcome.decision}{s.outcome.decisionMaker ? ` — ${s.outcome.decisionMaker}` : ""}</p>}
              <p className="text-[11px] text-muted-foreground mt-1">From Engagement Brief version {s.outcome.revision}, the one the working session used.{s.outcome.laterRevisions > 0 ? ` You saved ${s.outcome.laterRevisions} later version${s.outcome.laterRevisions > 1 ? "s" : ""}; they are not shown here because the team didn't work toward them.` : ""}</p>
            </>}
            {s.outcome.status === "bound_empty" && <p className="text-sm text-muted-foreground">Engagement Brief version {s.outcome.revision} was in place when the working session started, but its success and decision fields were empty. No outcome is assumed.{s.outcome.laterRevisions > 0 ? ` (${s.outcome.laterRevisions} later version${s.outcome.laterRevisions > 1 ? "s" : ""} not shown.)` : ""}</p>}
            {s.outcome.status === "unbound" && <p className="text-sm text-muted-foreground">This working session isn't linked to a saved Engagement Brief version, so no intended outcome is shown. Your brief in Chapter 1 is unchanged.</p>}
            {s.outcome.status === "none" && <p className="text-sm text-muted-foreground">No working session was linked to your Engagement Brief. Your brief is still available in Chapter 1.</p>}
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1">How the working session ended · Chapter 2</div>
            <p className="text-sm font-medium">{d.title}</p>
            <p className="text-sm text-muted-foreground mt-1">{d.body}</p>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1">Still open</div>
            <ul className="text-sm list-disc pl-4 space-y-1">
              {s.outcome.status === "bound" && s.outcome.assumptions.trim() && <li>Assumptions and unknowns from your brief: {s.outcome.assumptions}</li>}
              {s.wall && s.wall.emptySections.length > 0 && <li>Nothing captured yet for: {s.wall.emptySections.join(", ")}. An empty area isn't a failure — it may simply not have mattered yet.</li>}
              {s.truncated && <li>Only part of a long session is shown here; nothing is missing from your record.</li>}
              <li className="text-muted-foreground">Decide below what remains uncertain and what evidence would resolve it.</li>
            </ul>
          </div>
        </div>
        <div className="p-5 space-y-5">
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1">Team-owned work on the wall</div>
            {s.wall ? <>
              <p className="text-[11px] text-muted-foreground mb-2">Version {s.wall.revision} · {time(s.wall.timestamp)} · written by the client team from their own words. A full wall doesn't by itself mean progress.</p>
              {s.wall.sections.length === 0 && <p className="text-sm text-muted-foreground">The wall has no items.</p>}
              {s.wall.sections.map(sec => <div key={sec.label} className="mb-2">
                <div className="text-xs font-medium">{sec.label}</div>
                <ul className="text-sm list-disc pl-4">{sec.items.map(i => <li key={i.sourceId + i.text}>“{i.text}” <span className="text-muted-foreground text-xs">— {i.speaker}</span></li>)}</ul>
              </div>)}
            </> : <p className="text-sm text-muted-foreground">The team didn't put anything on the wall. That's not, on its own, a sign of weak coaching.</p>}
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1">What the team said</div>
            {s.teamStatements.length === 0 ? <p className="text-sm text-muted-foreground">No team statements recorded.</p> :
              <ul className="space-y-2 max-h-72 overflow-auto pr-1">{s.teamStatements.slice(-12).map(t => <li key={t.id} className="text-sm border-l-2 border-ink pl-3"><span className="font-medium">{t.speaker}</span> <span className="text-[11px] text-muted-foreground">{time(t.timestamp)}</span><div>{t.text}</div></li>)}</ul>}
            {s.teamStatements.length > 12 && <p className="text-[11px] text-muted-foreground mt-1">Showing the latest 12 of {s.teamStatements.length}.</p>}
            {s.coachStatementCount > 0 && <p className="text-[11px] text-muted-foreground mt-2">Your own {s.coachStatementCount} contribution{s.coachStatementCount > 1 ? "s" : ""} in the room are not listed as team findings.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
