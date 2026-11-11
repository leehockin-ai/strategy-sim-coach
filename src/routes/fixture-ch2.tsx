// TEMPORARY verification fixture — deleted after the check.
import { createFileRoute } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { __FixtureChapter2, __FixtureChapter2Exit } from "./_authenticated.sessions.$sessionId";
import { buildSelection } from "@/lib/playbook-selection";
export const Route = createFileRoute("/fixture-ch2")({ component: Fx, ssr: false });
const URL_RUN = "https://platform.strategyzer.com/projects/p/ae279d0f-student-team/dashboard/playbook_runs/ezcuzq8szlmxjk";
function Fx() {
  const mode = new URLSearchParams(location.search).get("mode") ?? "selected";
  const sel = mode === "selected" ? buildSelection({ choice: "selected", url: URL_RUN, title: "Competing on Business Models" }) : mode === "external" ? undefined : buildSelection({ choice: mode as any, reason: "Team needs to clarify the decision first" });
  const session = { id: "fx-1", status: "application", chosen_intervention_slug: "competing_on_business_models", scope_revision: 24, working_session_skip: null, application_canvas: null, scenarios: { title: "The Student Founder" },
    engagement_brief: { success: "Decide which business model to test with first 20 campus customers", ...(sel ? { playbook_selection: sel } : {}) }, playbook_facilitation_plan: null };
  const run = { id: "run-x", session_id: "fx-1", runtime_type: "strategyzer_external", status: "active", definition_snapshot: { intervention_label: "Competing on Business Models" }, intervention_slug: "competing_on_business_models", required_project_name: "CC-Student-Founder-fx1" };
  const qc = useMemo(() => { const q = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
    q.setQueryData(["interventions"], { interventions: [{ slug: "competing_on_business_models", label: "Competing on Business Models", pathway_type: "playbook", is_deep_vertical: true }] });
    q.setQueryData(["activity-runtime", "fx-1"], { session, intervention: { label: "Competing on Business Models", pathway_type: "playbook" }, testAllowed: true, roomUnavailableReason: null, definitions: [], runs: [run], events: [{ id: "e1", run_id: "run-x", actor_type: "system", content: "Project creation requested", metadata: {}, occurred_at: new Date().toISOString() }], artifacts: [], briefOutcomes: {} });
    q.setQueryData(["strategyzer-connections", "run-x"], { connections: [], allowedHosts: ["platform.strategyzer.com"] });
    return q; }, []);
  const load = () => JSON.parse(localStorage.getItem("fx-msgs") ?? "[]");
  const [messages, setMessages] = useState(load);
  (window as any).__fxSend = (text: string) => { const m = [...load(), { id: crypto.randomUUID(), phase: "playbook:selection:v1", role: "candidate", stakeholder_name: null, content: text }, { id: crypto.randomUUID(), phase: "playbook:selection:v1", role: "stakeholder", stakeholder_name: "Maya Chen", content: "We'll start with the business model portfolio and bring back two options." }]; localStorage.setItem("fx-msgs", JSON.stringify(m)); };
  return <QueryClientProvider client={qc}><div className="p-4 max-w-4xl mx-auto"><__FixtureChapter2 session={session} messages={messages} onSaved={() => setMessages(load())} onChangeIntervention={() => {}} onAdvanceToChapter3={() => {}} /><__FixtureChapter2Exit session={session} label="Continue to Chapter 3 →" onContinue={() => {}} /></div></QueryClientProvider>;
}
