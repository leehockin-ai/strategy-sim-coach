import { useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { continueScenarioOnce } from "@/lib/scenario-launch";

/** New-launch acknowledgement only; never verifies access or gates resume. */
export function ScenarioPreflight({ open, onBack, onContinue }: {
  open: boolean; onBack: () => void; onContinue: () => Promise<boolean>;
}) {
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  async function proceed() {
    if (inFlight.current) return;
    setPending(true); setFailed(false);
    try { const result = await continueScenarioOnce(inFlight, onContinue); if (result !== undefined) setFailed(!result); }
    catch { setFailed(true); }
    finally { setPending(false); }
  }
  return <Dialog open={open} onOpenChange={next => { if (!next && !inFlight.current) { setFailed(false); onBack(); } }}>
    <DialogContent className="w-[calc(100%-2rem)] max-h-[90svh] overflow-y-auto rounded-sm" onEscapeKeyDown={e => { if (pending) e.preventDefault(); }} onPointerDownOutside={e => { if (pending) e.preventDefault(); }}>
      <DialogHeader><DialogTitle>Before you start</DialogTitle>
        <DialogDescription>Have access to the Strategyzer Playbook Library, and check that you can start a playbook run in a project and copy its link to associate during practice.</DialogDescription>
      </DialogHeader>
      <p className="text-sm text-muted-foreground">Take a quick look around. After understanding your client’s context, use the Playbook Recommender and other Library resources to support scoping and choosing the next best path. You can also choose none or defer—no advance selection is needed.</p>
      <Button asChild variant="link" className="justify-start px-0 w-fit"><a href="https://platform.strategyzer.com/playbook_libraries/strategyzer_library" target="_blank" rel="noopener noreferrer">Open Playbook Library <ExternalLink aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a></Button>
      <p className="text-sm text-muted-foreground">Keep the Library open alongside Coach Compass. Screenshots can support live team discussion if useful.</p>
      {failed && <p role="alert" className="text-sm text-destructive">The scenario could not start. Your details are retained; try again or go back.</p>}
      <DialogFooter className="gap-2"><Button variant="outline" disabled={pending} onClick={() => { setFailed(false); onBack(); }}>Back</Button><Button disabled={pending} onClick={() => void proceed()}>{pending ? "Starting…" : "Continue to scenario"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}