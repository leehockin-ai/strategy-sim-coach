import { expect, it, vi } from "vitest";
import { createPlaybackGate, DictationController, DICTATION_AUDIO_CONSTRAINTS, type Recognition } from "./dictation";
const tick = async () => { await Promise.resolve(); await Promise.resolve(); };
const result = (text: string, final = true) => ({ resultIndex: 0, results: [Object.assign([{ transcript: text }], { isFinal: final })] });
function fixture() {
  const records: Recognition[] = []; const transcript = vi.fn();
  const controller = new DictationController(() => { const rec: Recognition = { continuous: false, interimResults: true, lang: "", start: vi.fn(), stop: vi.fn(), abort: vi.fn(), onresult: null, onerror: null, onend: null }; records.push(rec); return rec; }, async () => {}, transcript, vi.fn(), vi.fn());
  return { records, transcript, controller };
}
it("pauses during stakeholder playback, rejects late speaker results and resumes only when all audio ends", async () => {
  const f = fixture(); const gate = createPlaybackGate(); gate.subscribe(v => f.controller.pause(v));
  f.controller.toggle(); await tick(); const stale = f.records[0].onresult;
  const endA = gate.begin(); const endB = gate.begin();
  stale?.(result("stakeholder reply")); expect(f.transcript).not.toHaveBeenCalled();
  endA(); await tick(); expect(f.records).toHaveLength(1);
  endB(); await tick(); expect(f.records).toHaveLength(2);
  f.records[1].onresult?.(result("coach question")); expect(f.transcript).toHaveBeenCalledWith("coach question");
});
it("audio never enables dictation that was off and manual stop while paused prevents resume", async () => {
  const f = fixture(); f.controller.pause(true); f.controller.pause(false); await tick(); expect(f.records).toHaveLength(0);
  f.controller.toggle(); await tick(); f.controller.pause(true); f.controller.toggle(); f.controller.pause(false); await tick(); expect(f.records).toHaveLength(1);
});
it("send reset discards old final/interim buffers and accepts index zero only from the new recognition", async () => {
  const f = fixture(); f.controller.toggle(); await tick(); const old = f.records[0].onresult;
  old?.(result("previous words")); f.transcript.mockClear(); f.controller.reset();
  old?.(result("stale words")); old?.(result("stale interim", false)); await tick();
  expect(f.transcript).not.toHaveBeenCalled(); expect(f.records).toHaveLength(2);
  f.records[1].onresult?.(result("new question")); expect(f.transcript).toHaveBeenCalledExactlyOnceWith("new question");
});
it("a pending microphone permission cannot restart recognition after pause or disposal", async () => {
  let resolve = () => {}; const create = vi.fn();
  const c = new DictationController(create, () => new Promise<void>(r => { resolve = r; }), vi.fn(), vi.fn(), vi.fn());
  c.toggle(); c.pause(true); resolve(); await tick(); expect(create).not.toHaveBeenCalled();
});
it("requests all three microphone echo/noise controls", () => {
  expect(DICTATION_AUDIO_CONSTRAINTS).toEqual({ echoCancellation: true, noiseSuppression: true, autoGainControl: true });
});