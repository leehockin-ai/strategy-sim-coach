import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Shell } from "@/components/Shell";
import { listMySessions } from "@/lib/simulator.functions";

export const Route = createFileRoute("/_authenticated/sessions/")({
  head: () => ({
    meta: [{ title: "My sessions · Strategyzer Coach Certification" }],
  }),
  component: MySessionsPage,
});

const STATUS_LABEL: Record<string, string> = {
  intake: "Intake",
  framing: "Framing",
  method: "Method",
  dialogue: "Dialogue",
  intervention: "Intervention",
  completed: "Completed",
};

function MySessionsPage() {
  const fetchMine = useServerFn(listMySessions);
  const { data, isLoading } = useQuery({
    queryKey: ["my-sessions"],
    queryFn: () => fetchMine(),
  });

  return (
    <Shell>
      <section className="hairline-b">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-16 flex items-end justify-between flex-wrap gap-4">
          <div>
            <span className="chip mb-3 inline-flex">Your work</span>
            <h1 className="text-4xl md:text-5xl tracking-tight">My sessions</h1>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Resume any session in progress or revisit completed evaluations.
            </p>
          </div>
          <Link to="/scenarios" className="bg-ink text-paper px-4 py-2.5 text-sm rounded-sm">
            Start a new scenario →
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 md:px-10 py-10">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : !data?.sessions?.length ? (
          <div className="border border-ink p-10 text-center">
            <p className="text-sm text-muted-foreground mb-4">No sessions yet.</p>
            <Link to="/scenarios" className="bg-ink text-paper px-4 py-2 text-sm rounded-sm">
              Browse scenarios
            </Link>
          </div>
        ) : (
          <div className="border border-ink divide-y divide-ink">
            {data.sessions.map((s: any) => (
              <Link
                key={s.id}
                to="/sessions/$sessionId"
                params={{ sessionId: s.id }}
                className="grid grid-cols-12 gap-4 px-6 py-5 hover:bg-secondary transition-colors items-center"
              >
                <span className="marker-num text-xs text-muted-foreground col-span-1">
                  {new Date(s.created_at).toLocaleDateString(undefined, { month: "short", day: "2-digit" })}
                </span>
                <div className="col-span-6">
                  <div className="text-sm font-medium">{s.scenarios?.title ?? "Scenario"}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.scenarios?.industry}</div>
                </div>
                <span className="col-span-2 text-xs uppercase tracking-[0.12em]">
                  {STATUS_LABEL[s.status] ?? s.status}
                </span>
                <span className="col-span-2 text-xs text-muted-foreground">
                  {s.completed_at ? "Completed" : "In progress"}
                </span>
                <span className="col-span-1 text-right text-sm" aria-hidden>→</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </Shell>
  );
}
