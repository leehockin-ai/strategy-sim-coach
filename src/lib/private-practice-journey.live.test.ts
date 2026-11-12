import { createServer } from "node:http";
import { writeFileSync } from "node:fs";
import { expect, it, vi } from "vitest";
import { hydratePracticeSession } from "./practice-access";
import { SECTION_KEYS, ALL_STEPS, planBatch, type AssessmentJob } from "./assessment-job";
const memory=vi.hoisted(()=>({session:{} as any,rows:[] as any[],job:null as any,evaluation:null as any}));
vi.mock("@tanstack/react-start",()=>({createServerFn:()=>{const c:any={middleware:()=>c,inputValidator:()=>c,handler:(f:any)=>f};return c;}}));
vi.mock("@/integrations/supabase/auth-middleware",()=>({requireSupabaseAuth:{}}));
vi.mock("@/lib/notifications.functions",()=>({notify:vi.fn()}));
vi.mock("@/integrations/supabase/client.server",()=>({supabaseAdmin:{from:(table:string)=>{
 const q:any={select:()=>q,eq:()=>q,limit:()=>q,order:()=>q,
 then:(resolve:any)=>resolve({data:table==='messages'?memory.rows:[],error:null}),
 single:async()=>({data:memory.session,error:null}),maybeSingle:async()=>({data:memory.session,error:null}),
 insert:(rows:any)=>{const saved=(Array.isArray(rows)?rows:[rows]).map((r:any)=>({...r,id:crypto.randomUUID(),created_at:new Date().toISOString()}));memory.rows.push(...saved);return {select:()=>({single:async()=>({data:saved[0]}),then:(resolve:any)=>resolve({data:saved})})};}};return q;}}}));
import {sendScopingTurn,sendPlaybookTeamTurn} from './simulator.functions';
import {prepareEvaluationInput,executeEvaluationStep,composeEvaluationRow} from './evaluation.functions';
it.skipIf(!process.env.RUN_PRIVATE_JOURNEY)("actual normal scoping and Chapter 2 plus nine-dimension practice AI through disposable storage",async()=>{
 let finish:()=>void=()=>{};const done=new Promise<void>(r=>finish=r);let scoping=0,working=0;
 const server=createServer(async(req,res)=>{
 res.setHeader('Access-Control-Allow-Origin','http://localhost:8080');res.setHeader('Access-Control-Allow-Headers','Content-Type');
 if(req.method==='OPTIONS'){res.end();return;}
 if(req.url==='/done'){res.end('done');finish();return;}
 try{let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw);memory.session=body.session;memory.rows=body.messages;
 if(req.url==='/assessment'){
  if(!memory.job)memory.job={id:'isolated-job',session_id:memory.session.id,owner_id:'isolated-owner',status:'running',steps:{},live_evidence:{version:'public_live_v1',runs:[],omittedRuns:0,assessment_semantics:'three_chapter_v1'},error:null,evaluation_id:null,lease_until:null,run_count:1} satisfies AssessmentJob;
  const client={from:(table:string)=>{const q:any={select:()=>q,eq:()=>q,order:()=>q,single:async()=>({data:memory.session}),maybeSingle:async()=>({data:null}),then:(r:any)=>r({data:table==='messages'?memory.rows:[],error:null})};return q;}};
  const prepared=await prepareEvaluationInput(client as any,memory.session.id,'isolated-owner',memory.job.live_evidence);
  const key=process.env.LOVABLE_API_KEY;if(!key)throw new Error('Authorized AI unavailable');
  const batch=planBatch(memory.job);
  if(batch[0]==='synthesis'){memory.evaluation={id:'isolated-assessment',...await composeEvaluationRow(key,memory.session.id,memory.job.steps,prepared,memory.job.live_evidence)};memory.job.status='completed';memory.job.evaluation_id=memory.evaluation.id;}
  else await Promise.all(batch.map(async step=>{memory.job.steps[step]={status:'done',attempts:1,result:await executeEvaluationStep(key,step,prepared,memory.job.live_evidence)};}));
  const status={state:memory.job.status,done:ALL_STEPS.filter(s=>memory.job.steps[s]).length+(memory.evaluation?1:0),total:12,evaluationId:memory.job.evaluation_id};
  res.end(JSON.stringify({status,evaluation:memory.evaluation}));
 }else{
  const fn=req.url==='/sendScopingTurn'?sendScopingTurn:sendPlaybookTeamTurn;
  const result=await (fn as any)({data:body.data,context:{userId:'isolated-owner'}});
  if(req.url==='/sendScopingTurn')scoping++;else working++;
  res.end(JSON.stringify({result,rows:memory.rows}));
 }
 }catch(e){res.statusCode=400;res.end(JSON.stringify({error:e instanceof Error?e.message:'failed'}));}
 });await new Promise<void>(r=>server.listen(8092,'127.0.0.1',r));console.log('private journey bridge ready');
 try{await done;expect(scoping).toBeGreaterThanOrEqual(1);expect(working).toBeGreaterThanOrEqual(1);expect(memory.evaluation).toBeTruthy();expect(Object.keys(memory.evaluation.raw_response.sections).sort()).toEqual([...SECTION_KEYS].sort());expect(memory.session.scenario_id).toBeNull();writeFileSync('/tmp/browser/private-launch/ai-result.json',JSON.stringify({session:hydratePracticeSession(memory.session),messages:memory.rows,evaluation:memory.evaluation},null,2));}finally{server.close();}
},550000);
