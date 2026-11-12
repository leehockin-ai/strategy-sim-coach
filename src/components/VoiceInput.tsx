import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DictationController, DICTATION_AUDIO_CONSTRAINTS, stakeholderPlayback, type Recognition } from "@/lib/dictation";

type Props = {
  onTranscript: (chunk: string) => void;
  className?: string;
  title?: string;
  disabled?: boolean;
  onListeningChange?: (listening: boolean) => void;
  singleTurn?: boolean;
  showFallback?: boolean;
  controlRef?: { current: DictationController | null };
};

// Minimal typing for the Web Speech API
type SpeechRecognitionLike = Recognition;

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function VoiceInput({ onTranscript, className, title, disabled, onListeningChange, singleTurn = false, showFallback = false, controlRef }: Props) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<DictationController | null>(null);
  const callback = useRef(onTranscript); callback.current = onTranscript;
  const disabledRef = useRef(disabled); disabledRef.current = disabled;

  useEffect(() => {
    const Ctor = getRecognitionCtor(); setSupported(!!Ctor);
    if (!Ctor) return;
    const c = new DictationController(() => new Ctor(), async () => {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: DICTATION_AUDIO_CONSTRAINTS });
        // Web Speech owns its input; do not leave a second recording stream open.
        stream.getTracks().forEach(track => track.stop());
      }
    }, text => { if (!disabledRef.current && !stakeholderPlayback.playing) callback.current(text); }, setListening, () => setError("Dictation unavailable. You can type your question."), singleTurn);
    controller.current = c; if (controlRef) controlRef.current = c;
    const unsubscribe = stakeholderPlayback.subscribe(playing => c.pause(playing || !!disabledRef.current));
    return () => { unsubscribe(); c.dispose(); controller.current = null; if (controlRef) controlRef.current = null; };
  }, [singleTurn, controlRef]);
  useEffect(() => { onListeningChange?.(listening); }, [listening, onListeningChange]);
  useEffect(() => { controller.current?.pause(!!disabled || stakeholderPlayback.playing); }, [disabled]);

  const toggle = () => {
    setError("");
    controller.current?.toggle();
  };

  if (!supported) return showFallback ? <span className="text-xs text-muted-foreground">Dictation unavailable — type instead.</span> : null;

  return (
    <span className="inline-flex items-center gap-2"><Button
      type="button"
      variant="outline"
      disabled={disabled}
      onClick={toggle}
      title={title ?? (listening ? "Stop dictation" : "Dictate")}
      aria-label={listening ? "Stop dictation" : "Start dictation"}
      className={
        "inline-flex items-center justify-center w-7 h-7 border border-ink bg-paper hover:bg-secondary transition-colors " +
        (listening ? "!bg-ink !text-paper animate-pulse " : "") +
        (className ?? "")
      }
    >
      {listening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
    </Button>{error && <span role="status" className="text-xs text-muted-foreground">{error}</span>}</span>
  );
}

export function appendTranscript(prev: string, chunk: string): string {
  if (!prev) return chunk;
  const sep = /\s$/.test(prev) ? "" : " ";
  return prev + sep + chunk;
}
