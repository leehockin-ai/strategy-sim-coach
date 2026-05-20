import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";

type Props = {
  onTranscript: (chunk: string) => void;
  className?: string;
  title?: string;
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

export function VoiceInput({ onTranscript, className, title }: Props) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const finalsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    setSupported(!!getRecognitionCtor());
  }, []);

  const toggle = () => {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.continuous = true;
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
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  if (!supported) return null;

  return (
    <button
      type="button"
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
    </button>
  );
}

export function appendTranscript(prev: string, chunk: string): string {
  if (!prev) return chunk;
  const sep = /\s$/.test(prev) ? "" : " ";
  return prev + sep + chunk;
}
