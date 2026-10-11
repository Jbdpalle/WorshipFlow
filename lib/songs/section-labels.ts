// One-tap section vocabulary for building a song's structure without typing.
// These are just labels for the existing SongSection.label field.
export const QUICK_SECTION_LABELS = [
  "Intro",
  "Verse",
  "Pre-Chorus",
  "Chorus",
  "Bridge",
  "Tag",
  "Instrumental",
  "Outro",
] as const;

// Verses are the only section people number ("Verse 1", "Verse 2"); a chorus
// that comes round again is still just "Chorus".
export function nextSectionLabel(base: string, existingLabels: string[]): string {
  if (base !== "Verse") return base;
  const used = existingLabels.filter((l) => /^verse\b/i.test(l.trim())).length;
  return `Verse ${used + 1}`;
}

// A pasted/typed structure such as "Intro, V1, C, V2, C, Bridge, C, Outro".
const ABBREVIATIONS: Record<string, string> = {
  i: "Intro",
  v: "Verse",
  pc: "Pre-Chorus",
  c: "Chorus",
  ch: "Chorus",
  b: "Bridge",
  t: "Tag",
  o: "Outro",
  inst: "Instrumental",
};

export function parseStructureText(text: string): string[] {
  const labels: string[] = [];
  for (const raw of text.split(/[,→>\n]+/)) {
    const token = raw.trim();
    if (!token) continue;
    // A bare "Verse" is numbered like "V" is; "Verse 2" is kept as typed.
    if (/^verse$/i.test(token)) {
      labels.push(nextSectionLabel("Verse", labels));
      continue;
    }
    const m = token.match(/^([a-z]+)\s*(\d+)?$/i);
    const expanded = m && ABBREVIATIONS[m[1].toLowerCase()];
    if (expanded) {
      labels.push(m![2] && expanded === "Verse" ? `Verse ${m![2]}` : expanded === "Verse" ? nextSectionLabel("Verse", labels) : expanded);
    } else {
      labels.push(token.slice(0, 60));
    }
  }
  return labels.slice(0, 40);
}
