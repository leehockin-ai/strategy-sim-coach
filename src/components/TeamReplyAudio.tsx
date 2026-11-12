import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { synthesizeVoice } from "@/lib/voice.functions";
import { voiceForStakeholder } from "@/lib/voices";
import { stripOps } from "@/lib/conversation-work";

export function TeamReplyAudio({ messages, roster, busy }: { messages: Array<{ id: string; role: string; stakeholder_name: string | null; content: string }>; roster: string[]; busy: boolean }) {
  const tts = useServerFn(synthesizeVoice);
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState("");
  const seen = useRef(new Set(messages.map(m => m.id)));
  const generation = useRef(0);
  const audio = useRef<HTMLAudioElement | null>(null);
  function stop() { generation.current++; audio.current?.pause(); window.speechSynthesis?.cancel(); }
  useEffect(() => () => { generation.current++; audio.current?.pause(); window.speechSynthesis?.cancel(); }, []);
  useEffect(() => { if (busy) { generation.current++; audio.current?.pause(); window.speechSynthesis?.cancel(); } }, [busy]);
  useEffect(() => {
    const fresh = messages.filter(m => !seen.current.has(m.id));
    if (enabled && busy) return;
    for (const m of messages) seen.current.add(m.id);
    if (!enabled || busy) return;
    const token = generation.current;
    async function play() {
      for (const m of fresh.filter(m => m.role === "stakeholder" && roster.includes(m.stakeholder_name ?? ""))) {
        const text = stripOps(m.content).slice(0, 2000);
        let result;
        try { result = await tts({ data: { text, voiceId: voiceForStakeholder(roster.map(name => ({ name })), m.stakeholder_name ?? "") } }); }
        catch { result = { audio: null }; }
        if (generation.current !== token) return;
        if (result.audio) {
          const a = new Audio(`data:audio/mpeg;base64,${result.audio}`); audio.current = a;
          await new Promise<void>(resolve => { a.onended = () => resolve(); a.onerror = () => { setStatus("Audio unavailable — replies remain in the transcript."); resolve(); }; a.play().catch(() => { setStatus("Audio blocked — replies remain in the transcript."); resolve(); }); });
        } else if ("speechSynthesis" in window) {
          setStatus("Using browser voice.");
          await new Promise<void>(resolve => { const u = new SpeechSynthesisUtterance(text); u.onend = () => resolve(); u.onerror = () => { setStatus("Audio unavailable — replies remain in the transcript."); resolve(); }; window.speechSynthesis.speak(u); });
        } else setStatus("Audio unavailable — replies remain in the transcript.");
        if (generation.current !== token) return;
      }
    }
    void play();
  }, [messages, enabled, busy, roster, tts]);
  return <div className="inline-flex flex-wrap items-center gap-2"><Button type="button" variant="outline" aria-pressed={enabled} onClick={() => { stop(); setEnabled(!enabled); setStatus(""); }} title="Read new team replies aloud">{enabled ? <Volume2 /> : <VolumeX />}Read replies aloud</Button>{status && <span role="status" className="text-xs text-muted-foreground">{status}</span>}</div>;
}