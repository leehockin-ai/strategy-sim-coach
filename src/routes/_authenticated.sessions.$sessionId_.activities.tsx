import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Shell } from "@/components/Shell";
import { ActivityRuntime } from "@/components/ActivityRuntime";
import { getActivityRuntime } from "@/lib/activity-runtime.functions";

const runtimeQuery = (sessionId: string) => queryOptions({ queryKey: ["activity-runtime", sessionId], queryFn: () => getActivityRuntime({ data: { sessionId } }) });

export const Route = createFileRoute("/_authenticated/sessions/$sessionId/activities")({
  head: () => ({ meta: [
    { title: "Playbook activity workspace · Coach Compass" },
    { name: "description", content: "Resume a coaching activity and its saved artifact and event evidence in Coach Compass." },
    { property: "og:title", content: "Playbook activity workspace · Coach Compass" },
    { property: "og:description", content: "Resume a coaching activity and its saved artifact and event evidence in Coach Compass." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(runtimeQuery(params.sessionId)),
  component: ActivityPage,
});

function ActivityPage() {
  const { sessionId } = Route.useParams();
  const { data } = useSuspenseQuery(runtimeQuery(sessionId));
  return <Shell><ActivityRuntime data={data} /></Shell>;
}