export const DICTATION_AUDIO_CONSTRAINTS = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };

/** Shared playback lock: overlapping replies cannot resume a microphone early. */
export function createPlaybackGate() {
  const active = new Set<symbol>();
  const listeners = new Set<(playing: boolean) => void>();
  const notify = () => listeners.forEach(fn => fn(active.size > 0));
  return {
    get playing() { return active.size > 0; },
    subscribe(fn: (playing: boolean) => void) { listeners.add(fn); fn(active.size > 0); return () => { listeners.delete(fn); }; },
    begin() { const token = Symbol(); active.add(token); notify(); return () => { if (active.delete(token)) notify(); }; },
  };
}
export const stakeholderPlayback = createPlaybackGate();

export type Recognition = {
  continuous: boolean; interimResults: boolean; lang: string;
  start(): void; stop(): void; abort?: () => void;
  onresult: ((event: any) => void) | null; onerror: ((event: any) => void) | null; onend: (() => void) | null;
};

/** Every pause/send invalidates callbacks and creates a fresh recognition buffer. */
export class DictationController {
  enabled = false;
  private paused = false;
  private generation = 0;
  private recognition: Recognition | null = null;
  constructor(private create: () => Recognition, private prepareMic: () => Promise<void>, private transcript: (text: string) => void, private listening: (value: boolean) => void, private error: () => void, private singleTurn = false) {}
  private invalidate() {
    this.generation++;
    const old = this.recognition; this.recognition = null;
    if (old) { old.onresult = null; old.onend = null; old.onerror = null; try { if (old.abort) old.abort(); else old.stop(); } catch {} }
    this.listening(false);
  }
  toggle() { this.enabled = !this.enabled; this.invalidate(); if (this.enabled) void this.start(); }
  pause(value: boolean) { if (this.paused === value) return; this.paused = value; this.invalidate(); if (!value && this.enabled) void this.start(); }
  reset() { this.invalidate(); if (this.enabled && !this.paused) void this.start(); }
  dispose() { this.enabled = false; this.invalidate(); }
  private async start() {
    if (!this.enabled || this.paused) return;
    const token = this.generation;
    try {
      await this.prepareMic();
      if (token !== this.generation || !this.enabled || this.paused) return;
      const rec = this.create(); this.recognition = rec;
      rec.continuous = !this.singleTurn; rec.interimResults = false; rec.lang = typeof navigator === "undefined" ? "en-US" : navigator.language || "en-US";
      const finals = new Set<number>();
      const current = () => token === this.generation && this.enabled && !this.paused && this.recognition === rec;
      rec.onresult = event => {
        if (!current()) return;
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal && !finals.has(i)) { finals.add(i); const text = result[0].transcript.trim(); if (text) this.transcript(text); }
        }
      };
      rec.onerror = () => { if (current()) { this.dispose(); this.error(); } };
      rec.onend = () => { if (current()) this.dispose(); };
      rec.start(); this.listening(true);
    } catch { if (token === this.generation) { this.dispose(); this.error(); } }
  }
}