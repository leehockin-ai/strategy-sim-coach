import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  onTranscript: (chunk: string) => void;
  className?: string;
  title?: string;
  disabled?: boolean;
  onListeningChange?: (listening: boolean) => void;
  singleTurn?: boolean;
  showFallback?: boolean;
};

// Minimal typing for the Web Speech API
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
};

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function VoiceInput({ onTranscript, className, title, disabled, onListeningChange, singleTurn = false, showFallback = false }: Props) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState("");
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const finalsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    setSupported(!!getRecognitionCtor());
    return () => { const rec = recRef.current; if (rec) { rec.onresult = null; rec.onend = null; rec.onerror = null; rec.stop(); } };
  }, []);
  useEffect(() => { onListeningChange?.(listening); }, [listening, onListeningChange]);
  useEffect(() => { if (disabled) recRef.current?.stop(); }, [disabled]);

  const toggle = () => {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    setError("");
    const rec = new Ctor();
    rec.continuous = !singleTurn;
    rec.interimResults = false;
    rec.lang = navigator.language || "en-US";
    finalsRef.current = new Set();
    rec.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal && !finalsRef.current.has(i)) {
          finalsRef.current.add(i);
          const text = res[0].transcript.trim();
          if (text) onTranscript(text);
        }
      }
    };
    rec.onerror = () => { setListening(false); setError("Dictation unavailable. You can type your question."); };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
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
