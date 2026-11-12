import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TeamWorkingWall } from "./TeamWorkingWall";
import type { WorkspaceView, NoteOrigin } from "@/lib/workspace-view";
import type { TeamWork } from "@/lib/team-work";

const views: Array<[WorkspaceView, string]> = [["team", "Team work"], ["bmc", "Business Model Canvas"], ["vpc", "Value Proposition Canvas"], ["assumptions", "Assumptions Map"]];
export function TeamWorkspace(props: {
  work: TeamWork | null; revision: number; history: { revision: number }[]; selectedRevision: number | null;
  onRevision: (r: number | null) => void; onSource: (id: string) => void; origins: Map<string, NoteOrigin>;
}) {
  const [view, setView] = useState("team");
  return <aside className="min-w-0 self-start lg:sticky lg:top-4" aria-label="Workspace">
    <h3 className="text-lg mb-2">Workspace</h3>
    <Tabs value={view} onValueChange={setView}>
      <TabsList aria-label="Workspace view" className="grid grid-cols-2 h-auto w-full gap-1 bg-muted p-1">
        {views.map(([key, label]) => <TabsTrigger key={key} value={key} className="min-w-0 whitespace-normal text-xs min-h-10 px-2">{label}</TabsTrigger>)}
      </TabsList>
      {views.map(([key]) => <TabsContent key={key} value={key}><TeamWorkingWall {...props} compact view={key} /></TabsContent>)}
    </Tabs>
  </aside>;
}