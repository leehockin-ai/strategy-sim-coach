import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Shell } from "@/components/Shell";
import { listReviewSessions, setReviewerDecision } from "@/lib/evaluation.functions";
import { getSession } from "@/lib/simulator.functions";
import { VoiceInput, appendTranscript } from "@/components/VoiceInput";

export const Route = createFileRoute("/reviewer")({
  head: () => ({ meta: [{ title: "Reviewer · Strategyzer Coach Certification" }] }),
  component: ReviewerPage,
});

function ReviewerPage() {
  const fetchSessions = useServerFn(listReviewSessions);
  const { data, refetch } = useQuery({ queryKey: ["review-sessions"], queryFn: () => fetchSessions() });
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <Shell>
      <section className="hairline-b">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-14">
          <span className="chip mb-4 inline-flex">Reviewer dashboard</span>
          <h1 className="text-4xl md:text-5xl tracking-tight">Candidate submissions</h1>
          <p className="mt-4 text-muted-foreground max-w-2xl">
            Human reviewers validate AI-generated rubric scoring and make the final certification call.
            AI does not certify autonomously.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 md:px-10 py-10">
        <div className="border border-ink">
          <div className="grid grid-cols-12 hairline-b text-[11px] uppercase tracking-[0.12em] p-3 bg-secondary">
            <div className="col-span-3">Candidate</div>
            <div className="col-span-3">Scenario</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">AI</div>
            <div className="col-span-2">Reviewer</div>
          </div>
          {(data?.sessions ?? []).map((s: any) => (
            <button
              key={s.id}
              onClick={() => setOpenId(s.id)}
              className="grid grid-cols-12 w-full hairline-b text-left p-3 hover:bg-secondary text-sm items-center"
            >
              <div className="col-span-3">
                <div className="font-medium">{s.candidate_name}</div>
                <div className="text-xs text-muted-foreground">{s.candidate_email}</div>
              </div>
              <div className="col-span-3 text-sm">{s.scenarios?.title}</div>
              <div className="col-span-2"><StatusPill status={s.status} /></div>
              <div className="col-span-2">{s.evaluations?.[0]?.recommendation ? <RecPill rec={s.evaluations[0].recommendation} /> : <span className="text-xs text-muted-foreground">—</span>}</div>
              <div className="col-span-2">{s.evaluations?.[0]?.reviewer_decision ? <RecPill rec={s.evaluations[0].reviewer_decision} /> : <span className="text-xs text-muted-foreground">pending</span>}</div>
            </button>
          ))}
          {(data?.sessions ?? []).length === 0 && (
            <div className="p-10 text-sm text-muted-foreground text-center">
              No submissions yet. Start a scenario to see it here.
            </div>
          )}
        </div>
      </section>

      {openId && <ReviewerDrawer sessionId={openId} onClose={() => { setOpenId(null); refetch(); }} />}
    </Shell>
  );
}

function StatusPill({ status }: { status: string }) {
  return <span className="text-[10px] uppercase tracking-[0.12em] px-2 py-0.5 border border-ink">{status}</span>;
}

function RecPill({ rec }: { rec: string }) {
  const c: Record<string, string> = {
    certify: "var(--brand-lime)",
    conditional: "var(--brand-cyan)",
    not_yet: "var(--brand-red)",
    pending: "var(--paper)",
  };
  return (
    <span className="text-[10px] uppercase tracking-[0.12em] px-2 py-0.5 border border-ink" style={{ backgroundColor: c[rec] ?? "transparent" }}>
      {rec.replace("_", " ")}
    </span>
  );
}

function ReviewerDrawer({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const fetchSession = useServerFn(getSession);
  const decide = useServerFn(setReviewerDecision);
  const { data, refetch } = useQuery({ queryKey: ["session-review", sessionId], queryFn: () => fetchSession({ data: { sessionId } }) });
  const [notes, setNotes] = useState("");

  const mut = useMutation({
    mutationFn: (d: "certify" | "conditional" | "not_yet") =>
      decide({ data: { sessionId, reviewerNotes: notes, reviewerDecision: d } }),
    onSuccess: () => { toast.success("Reviewer decision saved"); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!data) return null;
  const session: any = data.session;
  const evaluation: any = data.evaluation;

  return (
    <div className="fixed inset-0 bg-ink/40 z-50 flex justify-end" onClick={onClose}>
      <div className="bg-paper w-full max-w-2xl h-full overflow-y-auto border-l border-ink" onClick={(e) => e.stopPropagation()}>
        <div className="hairline-b p-6 sticky top-0 bg-paper z-10 flex justify-between items-start">
          <div>
            <span className="chip mb-2 inline-flex">{session.scenarios?.title}</span>
            <h2 className="text-2xl">{session.candidate_name}</h2>
            <p className="text-sm text-muted-foreground">{session.candidate_email}</p>
          </div>
          <button onClick={onClose} className="text-2xl leading-none">×</button>
        </div>

        <div className="p-6 space-y-8">
          {evaluation ? (
            <>
              <div>
                <h3 className="text-xs uppercase tracking-[0.12em] mb-2">AI summary</h3>
                <p className="text-sm leading-relaxed">{evaluation.overall_summary}</p>
              </div>
              <Link to="/sessions/$sessionId/report" params={{ sessionId }} className="inline-flex border border-ink px-3 py-1.5 text-sm">
                Open full report ↗
              </Link>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No evaluation yet.</p>
          )}

          <div>
            <h3 className="text-xs uppercase tracking-[0.12em] mb-2">Reviewer notes</h3>
            <div className="relative">
              <textarea
                rows={5}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Override reasoning, calibration notes, developmental feedback…"
                className="w-full border border-ink bg-paper p-3 pr-12 text-sm focus:outline-none focus:bg-secondary"
              />
              <div className="absolute top-2 right-2">
                <VoiceInput onTranscript={(c) => setNotes((p) => appendTranscript(p, c))} />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs uppercase tracking-[0.12em] mb-2">Decision</h3>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => mut.mutate("certify")} disabled={mut.isPending} className="p-3 border border-ink text-sm" style={{ backgroundColor: "var(--brand-lime)" }}>Certify</button>
              <button onClick={() => mut.mutate("conditional")} disabled={mut.isPending} className="p-3 border border-ink text-sm" style={{ backgroundColor: "var(--brand-cyan)" }}>Conditional</button>
              <button onClick={() => mut.mutate("not_yet")} disabled={mut.isPending} className="p-3 border border-ink text-sm text-paper" style={{ backgroundColor: "var(--brand-red)" }}>Not yet</button>
            </div>
            {evaluation?.reviewer_decision && (
              <p className="mt-3 text-xs text-muted-foreground">Current decision: <strong>{evaluation.reviewer_decision}</strong></p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
