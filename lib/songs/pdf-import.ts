// Parses the plain text extracted from a chord-chart PDF (e.g. exported from
// SongBook Pro) into a title/artist/key guess and an ordered list of
// sections. Tuned against real-world exports: a short header block (title,
// artist, "Key: X", then a chord-glossary block) followed by repeating
// "Section Name" / chord line / lyric line groups, and interrupted by
// pdf-parse's own page-break markers.

const SECTION_WORDS = [
  "intro",
  "outro",
  "ending",
  "coda",
  "verse",
  "pre-chorus",
  "prechorus",
  "pre chorus",
  "chorus",
  "bridge",
  "interlude",
  "tag",
  "vamp",
  "instrumental",
  "refrain",
  "turnaround",
  "breakdown",
  "build",
  "hook",
];

const PAGE_BREAK_RE = /^--\s*\d+\s*of\s*\d+\s*--$/i;
const PAGE_NUMBER_RE = /^\d{1,3}$/;
const KEY_LINE_RE = /^key\s*:\s*(.+)$/i;
// Some exports skip the artist line and put the key directly after the
// title on the same physical line (e.g. "Head & Shoulders Key: C") instead
// of its own "Key: X" line — left alone, that whole line becomes the title.
const TITLE_WITH_KEY_RE = /^(.*\S)\s+key\s*:\s*(.+)$/i;

function isSectionHeader(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 30) return false;
  const withoutTrailingNumber = trimmed.replace(/\s*\d+\s*$/, "").trim().toLowerCase();
  return SECTION_WORDS.includes(withoutTrailingNumber);
}

export type ParsedSection = { label: string; content: string };
export type ParsedChordChart = {
  title: string;
  artist: string | null;
  key: string | null;
  sections: ParsedSection[];
};

export function parseChordChartText(rawText: string): ParsedChordChart {
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter((line) => !PAGE_BREAK_RE.test(line) && !PAGE_NUMBER_RE.test(line));

  // Drop leading/trailing blank lines but keep internal ones (they don't
  // carry meaning here since we regroup by section header anyway).
  const nonEmpty = lines.filter((l) => l.length > 0);

  let cursor = 0;
  let title = nonEmpty[cursor] ?? "Untitled Song";
  cursor++;

  let artist: string | null = null;
  let key: string | null = null;

  const titleKeyMatch = title.match(TITLE_WITH_KEY_RE);
  if (titleKeyMatch) {
    title = titleKeyMatch[1].trim();
    key = titleKeyMatch[2].trim();
  }

  // Artist line: the line right after the title, if it isn't the key line
  // or already a section header (some exports skip the artist entirely).
  if (nonEmpty[cursor] && !KEY_LINE_RE.test(nonEmpty[cursor]) && !isSectionHeader(nonEmpty[cursor])) {
    artist = nonEmpty[cursor];
    cursor++;
  }

  if (nonEmpty[cursor] && KEY_LINE_RE.test(nonEmpty[cursor])) {
    key = nonEmpty[cursor].match(KEY_LINE_RE)![1].trim();
    cursor++;
  }

  // Skip everything up to the first recognized section header (chord
  // glossary / diagram legend block) — but remember where the body
  // actually started, so a chart that never uses one of our recognized
  // header words (a single continuous block, or unusual section names)
  // can still fall back to its real content below instead of this scan
  // silently consuming it as if it were glossary filler.
  const bodyStart = cursor;
  while (cursor < nonEmpty.length && !isSectionHeader(nonEmpty[cursor])) {
    cursor++;
  }

  const sections: ParsedSection[] = [];
  let currentLabel: string | null = null;
  let currentLines: string[] = [];

  function flush() {
    if (currentLabel) {
      sections.push({ label: currentLabel, content: currentLines.join("\n").trim() });
    }
  }

  for (; cursor < nonEmpty.length; cursor++) {
    const line = nonEmpty[cursor];
    if (isSectionHeader(line)) {
      flush();
      currentLabel = line;
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  flush();

  if (sections.length === 0) {
    const bodyLines = nonEmpty.slice(bodyStart);
    if (bodyLines.length > 0) {
      sections.push({ label: "Full Song", content: bodyLines.join("\n").trim() });
    }
  }

  return { title, artist, key, sections };
}
