"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Thin wrapper over the browser's native Web Speech API (SpeechRecognition)
// for optional dictation — no server call, no AI integration, no API key,
// nothing new to deploy. This is deliberately the "simplest useful
// fallback" per the build spec: raw speech-to-text only. It never
// interprets or structures the transcript (no "take the guitar out" ->
// {role: Guitar, action: out} parsing) — the existing AI features in this
// app are intentionally gated behind a "coming soon" message, so adding
// speech-to-cue interpretation here would contradict that product choice.
// The transcript lands in an editable text field exactly like typing would,
// and the caller decides what happens to it (QuickNote's existing save
// flow, unchanged).
//
// Not supported in every browser (notably Firefox) — `supported` is false
// there and callers must hide the mic affordance entirely rather than show
// a button that does nothing.

type SpeechRecognitionResultLike = { 0: { transcript: string }; isFinal: boolean };
type SpeechRecognitionEventLike = { resultIndex: number; results: ArrayLike<SpeechRecognitionResultLike> };
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

// Pure and exported so it's testable without a DOM — the rest of this file
// is a thin, untestable wrapper around a browser-only constructor.
export function combineDictationText(base: string, spoken: string): string {
  const trimmedBase = base.trim();
  return trimmedBase ? `${trimmedBase} ${spoken}` : spoken;
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useSpeechToText() {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onTranscriptRef = useRef<((text: string, isFinal: boolean) => void) | null>(null);

  useEffect(() => {
    // Deferred a tick rather than set synchronously: this is a one-time
    // environment check (browser support never changes mid-session), not
    // state React needs to synchronize on every render.
    queueMicrotask(() => setSupported(getSpeechRecognitionCtor() !== null));
  }, []);

  const start = useCallback((onTranscript: (text: string, isFinal: boolean) => void) => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    setError(null);
    onTranscriptRef.current = onTranscript;
    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = typeof navigator !== "undefined" ? navigator.language : "en-US";
    recognition.onresult = (event) => {
      let text = "";
      let isFinal = false;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        text += result[0].transcript;
        if (result.isFinal) isFinal = true;
      }
      onTranscriptRef.current?.(text, isFinal);
    };
    recognition.onerror = (event) => {
      setError(event.error === "not-allowed" ? "Microphone access denied." : "Couldn't hear that — try again.");
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  return { supported, listening, error, start, stop };
}
