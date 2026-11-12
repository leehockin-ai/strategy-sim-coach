import { describe, expect, it, vi } from "vitest";
import { render } from "@react-email/render";
import React from "react";
import { TEMPLATES } from "./email-templates/registry";
import { assessmentNotice } from "./assessment-notice";
import { enqueueAssessmentMail, processPersistedAssessmentMail, REPORT_ORIGINS } from "./assessment-mail.server";
import { persistedAssessmentCompletion } from "./assessment-completion.server";
const owner = "11111111-1111-4111-8111-111111111111", assessmentId = "22222222-2222-4222-8222-222222222222", sessionId = "33333333-3333-4333-8333-333333333333";
const notice = assessmentNotice({ assessmentId, sessionId, ownerId:owner, recipientOwnerId:owner, recipientEmail:"synthetic@example.invalid", origin:REPORT_ORIGINS[0], pendingHumanReview:false },REPORT_ORIGINS);
const config = { enabled:true, origin:REPORT_ORIGINS[0], send:vi.fn(async()=>({sent:true as const})) };
describe("isolated supported assessment mail",()=>{
 it("registers a renderable app email without report contents",async()=>{
  const entry=TEMPLATES["assessment-ready"];
  expect(entry.subject).toBe(notice.subject);
  const html=await render(React.createElement(entry.component,notice.templateData));
  expect(html.length).toBeGreaterThan(100);
 });
 it("sends only the minimal registered payload through the managed helper",async()=>{
  config.send.mockClear(); await enqueueAssessmentMail(notice,config);
  expect(config.send.mock.calls).toEqual([["assessment-ready",notice.recipientEmail,{idempotencyKey:`assessment-ready:${assessmentId}`,templateData:notice.templateData}]]);
 });
 it.each(["https://evil.invalid","https://strategy-sim-coach.lovable.app/path"])("never sends credentials to %s",async(origin)=>{
  const send=vi.fn(); await expect(enqueueAssessmentMail(notice,{...config,origin,send})).rejects.toThrow("incomplete"); expect(send).not.toHaveBeenCalled();
 });
 it("completion is disabled even with an injected runtime; no real transport or database access",async()=>{
  const rpc=vi.fn(),send=vi.fn(); expect((await persistedAssessmentCompletion(assessmentId,{admin:{rpc},config:{...config,send}})).state).toBe("unconfigured"); expect(rpc).not.toHaveBeenCalled();expect(send).not.toHaveBeenCalled();
 });
 it("never retries around recipient suppression",async()=>{
  await expect(enqueueAssessmentMail(notice,{...config,send:async()=>({sent:false,reason:"recipient_suppressed"})})).rejects.toMatchObject({status:403});
 });
 it("preserves provider Retry-After before another outbox attempt",async()=>{
  await expect(enqueueAssessmentMail(notice,{...config,send:async()=>{throw Object.assign(new Error("Rate limited"),{status:429,retrySeconds:180})}})).rejects.toMatchObject({status:429,retrySeconds:180});
 });
 it("transient failures settle retry without changing event identity",async()=>{
  const rpc=vi.fn(async(name:string)=>name==="claim_assessment_ready"?{data:{session_id:sessionId,owner_id:owner,recipient_email:notice.recipientEmail,pending_human_review:false},error:null}:{data:true,error:null});
  const send=vi.fn(async()=>{throw Object.assign(new Error("Unavailable"),{status:503})});
  expect(await processPersistedAssessmentMail({rpc},assessmentId,{...config,send})).toBe("retry");
  expect(rpc.mock.calls[1]).toEqual(["settle_assessment_ready",expect.objectContaining({_assessment:assessmentId,_state:"retry"})]);
 });
});