import { describe, expect, it, vi } from "vitest";
import { launchPrivatePractice, privatePracticeAvailable } from "./private-practice.server";
import { assertCertificationSession, assertPrivateSessionReader, certificationEligible, hydratePracticeSession } from "./practice-access";
import { assertEntitlement } from "./entitlements.server";
const draft = { title: "Fictional commuter meals", brief: "A meal planning team has wireframes but no segment interviews.", team: [{ name: "Alex Park", role: "Founder", description: "Provisional" }, { name: "Sam Lee", role: "Researcher", description: "Provisional" }], tensions: "Speed versus learning", scope: "One segment", outcome: "Choose a test", constraints: "Two weeks", challenge: "Surface uncertainty" };
const requestId = "11111111-1111-4111-8111-111111111112";
describe("private practice launch", () => {
 it("freezes one approved roster and reuses the same Start identity", async () => {
  const saved = new Map<string, any>(); let inserts = 0;
  const rpc = vi.fn(async (name: string, data?: any) => {
   if(name === "private_practice_capability") return { data: 1 };
   const old = saved.get(data._request);
   if(old && JSON.stringify(old.custom_practice_snapshot) !== JSON.stringify(data._draft)) return { error: { message: "conflict" } };
   const row = old ?? { id: "session", owner_id: "owner", scenario_id: null, custom_practice_snapshot: structuredClone(data._draft) };
   if(!old) { inserts++; saved.set(data._request, row); }
   return { data: row };
  });
  const a = await launchPrivatePractice({ rpc }, "owner", { requestId, draft });
  const b = await launchPrivatePractice({ rpc }, "owner", { requestId, draft });
  expect(a.session.id).toBe(b.session.id); expect(inserts).toBe(1);
  expect(a.session.scenarios.stakeholders).toEqual(draft.team);
  await expect(launchPrivatePractice({rpc}, "owner", {requestId, draft:{...draft,title:"Changed"}})).rejects.toThrow("could not start");
 });
 it("missing or wrong schema version fails closed before a write", async () => {
  for (const result of [{error:{code:"PGRST202"}}, {data:0}, {data:2}]) {
   const rpc = vi.fn(async (_name: string) => result);
   expect(await privatePracticeAvailable({rpc})).toBe(false);
   await expect(launchPrivatePractice({rpc}, "owner", {requestId,draft})).rejects.toThrow("owner-private storage");
   expect(rpc.mock.calls.map(c => c[0])).toEqual(["private_practice_capability", "private_practice_capability"]);
  }
 });
 it("rejects another owner, including privileged reviewer, before private content is projected", async () => {
  const row = {id:"s", owner_id:"owner",custom_practice_snapshot:draft};
  expect(()=>assertPrivateSessionReader(row,"reviewer")).toThrow("not found");
  await expect(launchPrivatePractice({rpc:async (name:string)=>name==="private_practice_capability"?{data:1}:{data:row}},"other",{requestId,draft})).rejects.toThrow("not found");
 });
 it("excludes custom practice but preserves standardized certification eligibility", () => {
  expect(certificationEligible({custom_practice_snapshot:draft})).toBe(false);
  expect(()=>assertCertificationSession({custom_practice_snapshot:draft})).toThrow("cannot enter");
  expect(certificationEligible({scenario_id:"standard"})).toBe(true);
 });
 it("malformed private snapshot never falls back to a public scenario", () => {
  expect(()=>hydratePracticeSession({custom_practice_snapshot:{title:"bad"},scenarios:{title:"fallback"}})).toThrow();
  expect(()=>hydratePracticeSession({custom_practice_snapshot:{...draft,team:[draft.team[0],draft.team[0]]}})).toThrow();
 });
 it("keeps three separate future access hooks with current authenticated policy", async () => {
  for(const boundary of ["custom_practice_launch","full_ai_assessment","formal_certification_assessment"] as const) {
   expect(await assertEntitlement("owner",boundary)).toEqual({allowed:true,boundary,policy:"current_authenticated_access"});
   await expect(assertEntitlement("",boundary)).rejects.toThrow("Sign in");
  }
 });
});
