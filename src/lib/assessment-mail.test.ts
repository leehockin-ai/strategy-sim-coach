import { describe, expect, it, vi } from "vitest";
import { render } from "@react-email/render";
import React from "react";
import { TEMPLATES } from "./email-templates/registry";
import { assessmentNotice } from "./assessment-notice";
import { enqueueAssessmentMail, processPersistedAssessmentMail, REPORT_ORIGINS } from "./assessment-mail.server";
import { persistedAssessmentCompletion } from "./assessment-completion.server";
const owner = "11111111-1111-4111-8111-111111111111", assessmentId = "22222222-2222-4222-8222-222222222222", sessionId = "33333333-3333-4333-8333-333333333333";
const notice = assessmentNotice({ assessmentId, sessionId, ownerId:owner, recipientOwnerId:owner, recipientEmail:"synthetic@example.invalid", origin:REPORT_ORIGINS[0], pendingHumanReview:false },REPORT_ORIGINS);
const config = { enabled:true, origin:REPORT_ORIGINS[0], serviceCredential:"synthetic-test-only", transport:vi.fn<typeof fetch>(async()=>Response.json({queued:true})) };
describe("isolated supported assessment mail",()=>{
 it("registers a renderable app email without report contents",async()=>{
  const entry=TEMPLATES["assessment-ready"];
  expect(entry.subject).toBe(notice.subject);
  const html=await render(React.createElement(entry.component,notice.templateData));
  expect(html.length).toBeGreaterThan(100);
 });
 it("only posts the minimal registered payload to the supported authenticated queue route",async()=>{
  config.transport.mockClear(); await enqueueAssessmentMail(notice,config);
  const [url,options]=config.transport.mock.calls[0];
  expect(url).toBe(`${REPORT_ORIGINS[0]}/lovable/email/transactional/send`);
  expect(JSON.parse(String(options?.body))).toEqual({templateName:"assessment-ready",recipientEmail:notice.recipientEmail,idempotencyKey:`assessment-ready:${assessmentId}`,templateData:notice.templateData});
  expect(options?.redirect).toBe("error");
 });
 it.each(["https://evil.invalid","https://strategy-sim-coach.lovable.app/path"])("never sends credentials to %s",async(origin)=>{
  const transport=vi.fn(); await expect(enqueueAssessmentMail(notice,{...config,origin,transport})).rejects.toThrow("incomplete"); expect(transport).not.toHaveBeenCalled();
 });
 it("completion is disabled even with an injected runtime; no real transport or database access",async()=>{
  const rpc=vi.fn(),transport=vi.fn(); expect((await persistedAssessmentCompletion(assessmentId,{admin:{rpc},config:{...config,transport}})).state).toBe("unconfigured"); expect(rpc).not.toHaveBeenCalled();expect(transport).not.toHaveBeenCalled();
 });
 it("rejects successful HTTP without queue acknowledgement",async()=>{
  await expect(enqueueAssessmentMail(notice,{...config,transport:async()=>Response.json({})})).rejects.toThrow("not confirmed");
 });
 it("preserves provider Retry-After before another outbox attempt",async()=>{
  await expect(enqueueAssessmentMail(notice,{...config,transport:async()=>new Response(null,{status:429,headers:{"Retry-After":"180"}})})).rejects.toMatchObject({status:429,retrySeconds:180});
 });
 it("transient failures settle retry without changing event identity",async()=>{
  const rpc=vi.fn(async(name:string)=>name==="claim_assessment_ready"?{data:{session_id:sessionId,owner_id:owner,recipient_email:notice.recipientEmail,pending_human_review:false},error:null}:{data:true,error:null});
  const transport=vi.fn(async()=>new Response(null,{status:503}));
  expect(await processPersistedAssessmentMail({rpc},assessmentId,{...config,transport})).toBe("retry");
  expect(rpc.mock.calls[1]).toEqual(["settle_assessment_ready",expect.objectContaining({_assessment:assessmentId,_state:"retry"})]);
 });
});