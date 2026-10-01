// Shifts chord symbols by a number of semitones — e.g. turning a chart
// written in G into the same chart in D, for a set that needs a different
// key than the song's own stored key. Kept separate from
// nashville-numbers.ts (which converts chords to scale-degree numbers,
// a different kind of transformation) rather than sharing its internals,
// so this stays independent of that already-shipped feature.
import { isChordLine } from "@/lib/songs/chord-line";

const NOTE_SEMITONES: Record<string, number> = {
  C: 0,
  "B#": 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  Fb: 4,
  F: 5,
  "E#": 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
  Cb: 11,
};

const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
// Keys conventionally written with flats; everything else defaults to sharps.
const FLAT_KEY_ROOTS = new Set(["F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb"]);

const CHORD_TOKEN_RE = /^([A-G])([#b]?)([^/]*)(?:\/([A-G])([#b]?))?$/;

function noteToSemitone(letter: string, accidental: string): number | null {
  const key = accidental ? `${letter}${accidental}` : letter;
  return key in NOTE_SEMITONES ? NOTE_SEMITONES[key] : null;
}

function keyRoot(key: string): string {
  return /^([A-G][#b]?)/.exec(key.trim())?.[1] ?? "C";
}

function keyToSemitone(key: string): number | null {
  const m = /^([A-G])([#b]?)/.exec(key.trim());
  if (!m) return null;
  return noteToSemitone(m[1], m[2] ?? "");
}

// null means one of the two keys isn't a recognizable note name.
export function getSemitoneShift(fromKey: string, toKey: string): number | null {
  const from = keyToSemitone(fromKey);
  const to = keyToSemitone(toKey);
  if (from === null || to === null) return null;
  return ((to - from) % 12 + 12) % 12;
}

function semitoneToName(semitone: number, preferFlats: boolean): string {
  const names = preferFlats ? FLAT_NAMES : SHARP_NAMES;
  return names[((semitone % 12) + 12) % 12];
}

export function transposeChordToken(token: string, shift: number, preferFlats: boolean): string {
  if (shift === 0) return token;
  const m = CHORD_TOKEN_RE.exec(token);
  if (!m) return token;
  const [, rootLetter, rootAcc, suffix, bassLetter, bassAcc] = m;
  const rootSemitone = noteToSemitone(rootLetter, rootAcc ?? "");
  if (rootSemitone === null) return token;

  let result = semitoneToName(rootSemitone + shift, preferFlats) + (suffix ?? "");
  if (bassLetter) {
    const bassSemitone = noteToSemitone(bassLetter, bassAcc ?? "");
    if (bassSemitone !== null) {
      result += "/" + semitoneToName(bassSemitone + shift, preferFlats);
    }
  }
  return result;
}

// Transposes only chord lines (per the same isChordLine heuristic the chart
// view already uses for bolding); lyric lines pass through untouched.
export function transposeLine(line: string, shift: number, targetKey: string): string {
  if (shift === 0 || !isChordLine(line)) return line;
  const preferFlats = FLAT_KEY_ROOTS.has(keyRoot(targetKey));
  return line.replace(/\S+/g, (tok) => transposeChordToken(tok, shift, preferFlats));
}
