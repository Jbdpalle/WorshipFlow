// Best-effort classifier used only for display styling (bolding chord lines
// in a read-only chart view) — never affects what's actually stored. A line
// counts as a chord line when every token on it looks like a chord symbol.
const CHORD_TOKEN_RE = /^[A-G][#b]?[a-zA-Z0-9#/+]*$/;

export function isChordLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  const tokens = trimmed.split(/\s+/);
  return tokens.every((t) => CHORD_TOKEN_RE.test(t));
}
