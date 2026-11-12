import { expect, it, vi } from "vitest";
import { materialBytes, materialsSchema, hasReviewerMaterials, MATERIAL_BLOCKER } from "./reviewer-materials";
import { submitReviewerMaterials } from "./reviewer-materials.server";
const owner="11111111-1111-4111-8111-111111111111", requestId="22222222-2222-4222-8222-222222222222";
const pdf={name:"synthetic.pdf",type:"application/pdf" as const,base64:btoa("%PDF-1.4\nSynthetic reference\n%%EOF")};
it("supplements are optional, capped at 3 files and 4000 note characters",()=>{
  expect(hasReviewerMaterials({requestId,note:"",files:[]})).toBe(false);
  expect(materialsSchema.safeParse({requestId,note:"x".repeat(4001),files:[]}).success).toBe(false);
  expect(materialsSchema.safeParse({requestId,note:"",files:[pdf,pdf,pdf,pdf]}).success).toBe(false);
});
it("verifies PDF/image signatures and rejects wrong type, path names, scripts and oversized bytes",()=>{
  expect(materialBytes(pdf).length).toBeGreaterThan(20);
  expect(()=>materialBytes({...pdf,name:"../file.pdf"})).toThrow();
  expect(()=>materialBytes({...pdf,base64:btoa("not a PDF")})).toThrow("complete PDF");
  expect(()=>materialBytes({...pdf,base64:btoa("%PDF-1.4 /JavaScript %%EOF")})).toThrow("without scripts");
  expect(()=>materialBytes({...pdf,type:"image/png",name:"fake.png"})).toThrow("contents");
  expect(()=>materialBytes({...pdf,base64:btoa("x".repeat(4194305))})).toThrow();
});
it("owner/custom checks and missing capability fail closed before any upload",async()=>{
  const upload=vi.fn(); const admin={rpc:vi.fn(async()=>({error:{message:"missing"}})),storage:{from:()=>({upload})}};
  const input={requestId,note:"Reference",files:[pdf]};
  await expect(submitReviewerMaterials(admin,{id:"s",owner_id:"other"},owner,input)).rejects.toThrow("Forbidden");
  await expect(submitReviewerMaterials(admin,{id:"s",owner_id:owner,custom_practice_snapshot:{}},owner,input)).rejects.toThrow("Custom practice");
  await expect(submitReviewerMaterials(admin,{id:"s",owner_id:owner},owner,input)).rejects.toThrow(MATERIAL_BLOCKER);
  expect(upload).not.toHaveBeenCalled();
});
it("owner submission freezes content-addressed private paths, retries never overwrite pixels or report",async()=>{
  const paths:string[]=[];const rpc=vi.fn(async(name:string,args?:any)=>name==="reviewer_materials_capability"?{data:1}:{data:{alreadySubmitted:paths.length>1,submittedAt:"2026-11-12"}});
  const admin={rpc,from:()=>{const q:any={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:null})};return q;},storage:{from:(bucket:string)=>{
    expect(bucket).toBe("playbooks");
    return {upload:async(path:string,_bytes:any,opts:any)=>{
      expect(opts.upsert).toBe(false);paths.push(path);
      return paths.length>1?{error:{statusCode:"409"}}:{};
    }};
  }}};
  const session={id:"session",owner_id:owner};const input={requestId,note:"Reviewer context",files:[pdf]};
  await submitReviewerMaterials(admin,session,owner,input);await submitReviewerMaterials(admin,session,owner,input);
  expect(paths[0]).toBe(paths[1]);expect(paths[0]).toContain(`reviewer-supplements/${owner}/session/${requestId}/0-`);
  expect(rpc.mock.calls.at(-1)?.[1]).toMatchObject({_session:"session",_owner:owner,_note:"Reviewer context"});
  expect(rpc.mock.calls.at(-1)?.[1]).not.toHaveProperty("scores");
});