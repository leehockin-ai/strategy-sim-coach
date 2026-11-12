import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { renderAssessmentEmailMock } from "@/lib/assessment-email-mock";

export function AssessmentEmailMock() {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof renderAssessmentEmailMock>> | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setFailed(false);
    renderAssessmentEmailMock().then(result => {
      if (active) setPreview(result);
    }).catch(() => {
      if (active) setFailed(true);
    });
    return () => { active = false; };
  }, [open, attempt]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Mail aria-hidden="true" />Preview mock email</Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl w-[calc(100%-2rem)] max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>MOCK — not sent</DialogTitle>
          <DialogDescription>Fictional assessment email. No email is sent. The report link stays inside this mock.</DialogDescription>
        </DialogHeader>
        {failed ? (
          <div role="alert" className="space-y-3 text-sm">
            <p>The mock could not be displayed. No email has been sent.</p>
            <Button variant="outline" size="sm" onClick={() => setAttempt(value => value + 1)}>Retry preview</Button>
          </div>
        ) : preview ? (
          <>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
              <dt className="text-muted-foreground">From</dt><dd className="break-words">{preview.from}</dd>
              <dt className="text-muted-foreground">To</dt><dd className="break-words">{preview.to}</dd>
              <dt className="text-muted-foreground">Subject</dt><dd className="break-words">{preview.subject}</dd>
            </dl>
            <iframe title="Mock assessment-ready email body" sandbox="" referrerPolicy="no-referrer" srcDoc={preview.html} className="h-[24rem] w-full rounded-sm border border-border bg-card" />
          </>
        ) : <p role="status" className="text-sm text-muted-foreground">Loading mock email…</p>}
      </DialogContent>
    </Dialog>
  );
}