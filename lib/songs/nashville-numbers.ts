import { isChordLine } from "@/lib/songs/chord-line";

// Best-effort chord -> Nashville number transposition, relative to a
// song's key. Root and bass are mapped to a scale degree (1-7, with
// b/# for out-of-key chords); everything else in the chord symbol
// (m, 7, sus4, add9, ...) is kept as-is.
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

const DEGREE_BY_INTERVAL = ["1", "b2", "2", "b3", "3", "4", "#4", "5", "b6", "6", "b7", "7"];

const CHORD_TOKEN_RE = /^([A-G])([#b]?)([^/]*)(?:\/([A-G])([#b]?))?$/;

function noteToSemitone(letter: string, accidental: string): number | null {
  const key = accidental ? `${letter}${accidental}` : letter;
  return key in NOTE_SEMITONES ? NOTE_SEMITONES[key] : null;
}

function keyToSemitone(keyRoot: string): number | null {
  const m = /^([A-G])([#b]?)/.exec(keyRoot.trim());
  if (!m) return null;
  return noteToSemitone(m[1], m[2] ?? "");
}

// A bare numeric suffix (power chords like "5", added/extension chords
// like "6", "9", "11", "13") would run into the degree digit with nothing
// to separate them — "Ab6" in key Eb would render as "46", easily misread
// as a different degree. A hyphen keeps it unambiguous: "4-6".
function joinDegreeAndSuffix(degree: string, suffix: string): string {
  if (!suffix) return degree;
  return /^\d/.test(suffix) ? `${degree}-${suffix}` : `${degree}${suffix}`;
}

export function transposeChordToNashville(token: string, keySemitone: number): string {
  const m = CHORD_TOKEN_RE.exec(token);
  if (!m) return token;
  const [, rootLetter, rootAcc, suffix, bassLetter, bassAcc] = m;
  const rootSemitone = noteToSemitone(rootLetter, rootAcc ?? "");
  if (rootSemitone === null) return token;

  let result = joinDegreeAndSuffix(
    DEGREE_BY_INTERVAL[(rootSemitone - keySemitone + 12) % 12],
    suffix ?? "",
  );

  if (bassLetter) {
    const bassSemitone = noteToSemitone(bassLetter, bassAcc ?? "");
    if (bassSemitone !== null) {
      result += "/" + DEGREE_BY_INTERVAL[(bassSemitone - keySemitone + 12) % 12];
    }
  }
  return result;
}

// Transposes only chord lines; lyric lines pass through untouched.
// Returns the original line if the key isn't a recognizable note.
export function transposeLineToNashville(line: string, key: string): string {
  const keySemitone = keyToSemitone(key);
  if (keySemitone === null || !isChordLine(line)) return line;
  return line.replace(/\S+/g, (tok) => transposeChordToNashville(tok, keySemitone));
}
