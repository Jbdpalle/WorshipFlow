// Pure helpers behind inline chord editing (components/songs/lyrics-chords-view.tsx,
// chord-edit-sheet.tsx) — kept separate from those components so the actual
// text-surgery logic is unit-testable without rendering anything.

// Splits a line into alternating [token, whitespace, token, whitespace, ...]
// parts, preserving every character — rejoining the unchanged array always
// reproduces the original line exactly. Used both to render each token as
// its own tap target and to replace exactly one of them.
export function splitPreservingWhitespace(line: string): string[] {
  return line.split(/(\s+)/);
}

// Rebuilds one line's chord token by its exact position in the split above
// and rejoins — never touches any other line or any lyric text. Callers are
// responsible for only invoking this with the canonical, untransposed
// content (see isChordTapEditable below) so what gets written back is never
// a transposed value mistaken for the real one.
export function replaceToken(fullContent: string, lineIndex: number, partIndex: number, newToken: string): string {
  const lines = fullContent.split("\n");
  const parts = splitPreservingWhitespace(lines[lineIndex] ?? "");
  parts[partIndex] = newToken;
  lines[lineIndex] = parts.join("");
  return lines.join("\n");
}

// Whether chord tokens should render as tap targets at all. Editing always
// writes the canonical text, so it's only offered when the view isn't
// transposed (shift) and isn't showing a derived mode (Nashville numbers,
// or lyrics-only where no chord line is even shown) — matching the same
// "respect the existing source-of-truth rules" requirement the transpose
// and Nashville-numbers features already follow for display.
export function isChordTapEditable(input: {
  editable: boolean;
  hasSectionId: boolean;
  mode: "all" | "lyrics" | "chords" | "numbers";
  shift: number | null;
}): boolean {
  return input.editable && input.hasSectionId && input.mode !== "lyrics" && input.mode !== "numbers" && !input.shift;
}
