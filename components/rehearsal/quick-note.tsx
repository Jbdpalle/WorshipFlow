"use client";

import { useRef, useState } from "react";
import { NotebookPen, Check, Mic, Square } from "lucide-react";
import { callOffline } from "@/lib/offline/outbox";
import { REHEARSAL_NOTE_CATEGORIES, REHEARSAL_NOTE_MAX_LENGTH } from "@/lib/songs/rehearsal-notes";
import { useSpeechToText, combineDictationText } from "@/hooks/use-speech-to-text";
import { cn } from "@/lib/utils/cn";

// Capture an observation without leaving the music: one tap opens a single
// line (the current song and section are attached automatically, the type is
// an optional chip), Enter saves it, and the row closes again. The text is
// kept if saving fails, and the page never scrolls or navigates.
export function QuickNote({
  rehearsalId,
  sectionId,
  sectionLabel,
}: {
  rehearsalId: string | null;
  sectionId: string | null;
  sectionLabel: string | null;
}) {
  const [open, setOpen] = useState(false);
  // The section is fixed when the box opens: if the leader moves on while
  // someone is still typing, the draft stays and still belongs to the
  // section they were actually observing.
  const [locked, setLocked] = useState<{ id: string | null; label: string | null }>({ id: null, label: null });
  const [text, setText] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dictationBaseRef = useRef("");
  const speech = useSpeechToText();

  function toggleDictation() {
    if (speech.listening) {
      speech.stop();
      return;
    }
    dictationBaseRef.current = text;
    speech.start((spoken) => {
      setText(combineDictationText(dictationBaseRef.current, spoken));
    });
  }

  async function save() {
    const content = text.trim();
    if (!rehearsalId || !content || busy) return;
    setBusy(true);
    setError(null);
    const result = await callOffline(
      "captureRehearsalNote",
      [{ rehearsalId, content, category, sectionId: locked.id }],
      `Rehearsal note — ${locked.label ?? "song"}`,
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setText("");
    setCategory(null);
    setOpen(false);
    setConfirmation(
      result.queued
        ? "Saved on this device — will sync when you're back online."
        : `Noted${locked.label ? ` on ${locked.label}` : ""}.`,
    );
    setTimeout(() => setConfirmation(null), 3000);
  }

  if (!open) {
    return (
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={!rehearsalId}
          onClick={() => {
            setLocked({ id: sectionId, label: sectionLabel });
            setOpen(true);
            setConfirmation(null);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          className="tap-target inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-semibold text-foreground hover:bg-surface-muted disabled:opacity-50"
        >
          <NotebookPen className="h-4 w-4" aria-hidden /> Quick note
        </button>
        {confirmation && (
          <p role="status" className="flex items-center gap-1 text-sm font-semibold text-success">
            <Check className="h-4 w-4" aria-hidden /> {confirmation}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-border bg-surface p-3" role="group" aria-label="Quick rehearsal note">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Note type (optional)">
        {REHEARSAL_NOTE_CATEGORIES.map((c) => (
          <button
            key={c.value}
            type="button"
            aria-pressed={category === c.value}
            title={c.hint}
            onClick={() => setCategory((cur) => (cur === c.value ? null : c.value))}
            className={cn(
              "min-h-11 rounded-full border px-3.5 text-sm font-semibold transition-colors",
              category === c.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-foreground hover:bg-surface-muted",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <input
          ref={inputRef}
          value={text}
          maxLength={REHEARSAL_NOTE_MAX_LENGTH}
          onChange={(e) => setText(e.target.value)}
          enterKeyHint="send"
          aria-label={`Note${locked.label ? ` for ${locked.label}` : ""}`}
          placeholder={locked.label ? `On ${locked.label}: e.g. bass enters too early` : "e.g. bass enters too early"}
          className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {speech.supported && (
          <button
            type="button"
            onClick={toggleDictation}
            aria-pressed={speech.listening}
            aria-label={speech.listening ? "Stop dictation" : "Dictate note"}
            title={speech.listening ? "Stop dictation" : "Dictate note"}
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border",
              speech.listening
                ? "animate-pulse border-danger bg-danger/15 text-danger"
                : "border-border bg-surface text-muted-foreground hover:bg-surface-muted",
            )}
          >
            {speech.listening ? <Square className="h-4 w-4" aria-hidden /> : <Mic className="h-4 w-4" aria-hidden />}
          </button>
        )}
        <button
          type="submit"
          disabled={busy || !text.trim() || !rehearsalId}
          className="h-11 shrink-0 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy ? "…" : "Add"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="h-11 shrink-0 rounded-lg px-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          Close
        </button>
      </form>
      {(error || speech.error) && (
        <p role="alert" className="text-sm text-danger">
          {error ?? speech.error}
        </p>
      )}
    </div>
  );
}
