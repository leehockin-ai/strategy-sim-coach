import { expect, it } from "vitest";
import { parseTeamReply, rosterAliases } from "./team-speakers";

const founder = ["Maya Chen", "Jordan Patel", "Sofia Ramirez"];
const exec = ["Dr. Eleanor Voss", "Nurse Manager Tariq Hassan", "Maya Bernstein"];

it("accepts first-name tags seen in the real Student Founder run and maps them to the roster name", () => {
  const r = parseTeamReply("[Sofia] Honestly I think upperclassmen who cook are the real users.", founder);
  expect(r).toEqual({ ok: true, segments: [{ speaker: "Sofia Ramirez", content: "Honestly I think upperclassmen who cook are the real users." }] });
});

it("accepts canonical full names and honorific-stripped first names", () => {
  expect(parseTeamReply("[Jordan Patel] Sure.", founder)).toMatchObject({ ok: true, segments: [{ speaker: "Jordan Patel" }] });
  expect(parseTeamReply("[Eleanor] The data is clear.", exec)).toMatchObject({ ok: true, segments: [{ speaker: "Dr. Eleanor Voss" }] });
  expect(parseTeamReply("[Tariq] Not on night shift.", exec)).toMatchObject({ ok: true, segments: [{ speaker: "Nurse Manager Tariq Hassan" }] });
});

it("splits a multi-speaker reply so each line keeps its own speaker", () => {
  const raw = "[Maya] I'll mark saving money as a guess.\n[Jordan] Actually nobody said that.\n[Sofia] I can ask them Friday.";
  const r = parseTeamReply(raw, founder);
  expect(r.ok && r.segments).toEqual([
    { speaker: "Maya Chen", content: "I'll mark saving money as a guess." },
    { speaker: "Jordan Patel", content: "Actually nobody said that." },
    { speaker: "Sofia Ramirez", content: "I can ask them Friday." },
  ]);
});

it("rejects unknown speakers instead of crediting the first tag", () => {
  expect(parseTeamReply("[Maya] Yes.\n[Coach] Good.", founder)).toEqual({ ok: false, reason: 'unknown speaker "Coach"' });
  expect(parseTeamReply("[Priya] Hi.", founder).ok).toBe(false);
});

it("rejects ambiguous first names shared by two roster members", () => {
  const roster = ["Maya Chen", "Maya Bernstein"];
  expect(rosterAliases(roster).get("maya")).toBeNull();
  expect(parseTeamReply("[Maya] Hi.", roster)).toEqual({ ok: false, reason: 'ambiguous speaker "Maya"' });
  expect(parseTeamReply("[Maya Chen] Hi.", roster).ok).toBe(true);
});

it("rejects untagged replies, leading untagged text and empty lines", () => {
  expect(parseTeamReply("We think students want to save money.", founder).ok).toBe(false);
  expect(parseTeamReply("Sure! [Maya] Hi.", founder).ok).toBe(false);
  expect(parseTeamReply("[Maya]\n[Jordan] Hi.", founder).ok).toBe(false);
});
