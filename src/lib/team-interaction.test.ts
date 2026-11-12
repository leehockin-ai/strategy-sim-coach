import { expect, it } from "vitest";
import { explicitWorkRefusal, withoutRefusalOps } from "./team-interaction";
import { parseTeamReply } from "./team-speakers";
import { conversationWork } from "./conversation-work";

it("exact one-word responses keep canonical speaker attribution", () => {
  expect(parseTeamReply("[Maya Chen] No.", ["Maya Chen"])).toEqual({ ok: true, segments: [{ speaker: "Maya Chen", content: "No." }] });
});
it.each(["No.", "I'm not willing to do work while you blame me.", "I won’t discuss our assumptions with you now.", "Stop blaming me.", "I’m not putting anything on the board if that’s how we’re going to talk.", "I’m done. I’m not doing this."])("explicit refusal %s cannot add or revise notes", text => {
  expect(explicitWorkRefusal(text)).toBe(true);
  expect(withoutRefusalOps(`<<add unknowns>> ${text}`)).toBe(text);
  const result = conversationWork([{ id: "refusal", role: "stakeholder", phase: "playbook:selection:v1", stakeholder_name: "Maya Chen", content: `<<add unknowns>> ${text}` }], ["Maya Chen"]);
  expect(result.work).toBeNull();
});
it.each(["This damn deadline is difficult.", "He said ‘you are useless’ yesterday.", "Our assumption is untested; we should interview commuters.", "No, our draft segment is commuters, not all students.", "We won't assume the segment is validated."])("does not mechanically classify %s as refusal", text => {
  expect(explicitWorkRefusal(text)).toBe(false);
});
it("refusal preserves original note IDs/history while another participant can contribute", () => {
  const rows = [{ id: "a", role: "stakeholder", phase: "playbook:selection:v1", stakeholder_name: "Maya Chen", content: "<<add segments>> Our draft segment is commuters." }];
  const before = conversationWork(rows, ["Maya Chen", "Jordan Patel"]);
  const after = conversationWork([...rows, { ...rows[0], id: "b", content: "<<revise N1>> I won't discuss our customer segments with you now." }], ["Maya Chen", "Jordan Patel"]);
  expect(after).toEqual(before);
  const mixed = conversationWork([...rows, { ...rows[0], id: "b", content: "No." }, { ...rows[0], id: "c", stakeholder_name: "Jordan Patel", content: "<<add unknowns>> We are assuming commuters need this; no interviews yet." }], ["Maya Chen", "Jordan Patel"]);
  expect(mixed.revision).toBe(2);
  expect(mixed.work?.sections.find(s => s.key === "segments")?.items[0]).toMatchObject({ sourceId: "a", noteId: "N1" });
});