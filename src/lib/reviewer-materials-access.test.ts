import { it,expect,vi } from "vitest";
vi.mock("@tanstack/react-start",()=>({createServerFn:()=>{const c:any={middleware:()=>c,inputValidator:()=>c,handler:(fn:any)=>fn};return c;}}));
vi.mock("@/integrations/supabase/auth-middleware",()=>({requireSupabaseAuth:{}}));
const mocks=vi.hoisted(()=>({downloads:0}));
vi.mock("@/integrations/supabase/client.server",()=>({supabaseAdmin:{storage:{from:()=>({download:async()=>{mocks.downloads++;return {data:new Blob(['synthetic'])};}})}}}));
import {downloadReviewerMaterial} from "./reviewer-materials.functions";
const sessionId="11111111-1111-4111-8111-111111111111";
const path=`reviewer-supplements/owner/${sessionId}/req/0-hash`;
function context(userId:string,role=false,submitted=true,privateCase=false){return {userId,supabase:{rpc:async()=>({data:role}),from:(table:string)=>{const q:any={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:table==='sessions'?{owner_id:'owner',scenario_id:'seed',submission_requested_at:submitted?'now':null,custom_practice_snapshot:privateCase?{}:null}:{owner_id:'owner',files:[{name:'synthetic.pdf',type:'application/pdf',size:9,path}]}})};return q;}}};}
const read=downloadReviewerMaterial as unknown as (i:any)=>Promise<any>;
it("downloads validate the current owner or authorized reviewer and submitted session before privileged file reads",async()=>{
 const data={sessionId,materialId:sessionId,fileIndex:0};
 const before=mocks.downloads;
 await expect(read({data,context:context('stranger')})).rejects.toThrow('Forbidden');
 await expect(read({data,context:context('reviewer',true,false)})).rejects.toThrow('Not submitted');
 await expect(read({data,context:context('owner',false,true,true)})).rejects.toThrow('Custom practice');
 expect(mocks.downloads).toBe(before);
 expect(await read({data,context:context('owner')})).toMatchObject({name:'synthetic.pdf',base64:btoa('synthetic')});
 expect(await read({data,context:context('reviewer',true)})).toMatchObject({name:'synthetic.pdf'});
});