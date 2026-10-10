import { describe, it, expect } from "vitest";
import { splitPreservingWhitespace, replaceToken, isChordTapEditable } from "@/lib/songs/chord-edit";

describe("splitPreservingWhitespace", () => {
  it("rejoins to the exact original line", () => {
    const line = "G    D/F#  Em   C";
    expect(splitPreservingWhitespace(line).join("")).toBe(line);
  });

  it("alternates token/whitespace/token starting and ending with a token", () => {
    expect(splitPreservingWhitespace("G  D")).toEqual(["G", "  ", "D"]);
  });

  it("preserves leading and trailing whitespace as their own parts", () => {
    // split(/(\s+)/) puts an empty-string token before a leading delimiter
    // and after a trailing one — the whitespace itself lands in the next
    // (or previous) part. Rejoining still reproduces the line exactly.
    const line = "  G  D  ";
    const parts = splitPreservingWhitespace(line);
    expect(parts.join("")).toBe(line);
    expect(parts[0]).toBe("");
    expect(parts[1]).toBe("  ");
    expect(parts[parts.length - 1]).toBe("");
    expect(parts[parts.length - 2]).toBe("  ");
  });

  it("returns a single token for a line with no whitespace", () => {
    expect(splitPreservingWhitespace("Dsus4")).toEqual(["Dsus4"]);
  });

  it("handles an empty line", () => {
    expect(splitPreservingWhitespace("")).toEqual([""]);
  });
});

describe("replaceToken", () => {
  it("replaces exactly the targeted token on the targeted line", () => {
    const content = "G    D/F#  Em   C\nVerse lyrics here";
    const result = replaceToken(content, 0, 2, "Am");
    expect(result).toBe("G    Am  Em   C\nVerse lyrics here");
  });

  it("leaves every other line untouched", () => {
    const content = "G  D\nFirst lyric line\nC  G\nSecond lyric line";
    const result = replaceToken(content, 2, 0, "F");
    expect(result.split("\n")).toEqual(["G  D", "First lyric line", "F  G", "Second lyric line"]);
  });

  it("supports a chord token containing a slash", () => {
    const content = "G  D";
    expect(replaceToken(content, 0, 0, "D/F#")).toBe("D/F#  D");
  });

  it("is a no-op replacement when the new token equals the old one", () => {
    const content = "G  D";
    expect(replaceToken(content, 0, 2, "D")).toBe(content);
  });

  it("replaces the first token on the line", () => {
    const content = "G  D";
    const result = replaceToken(content, 0, 0, "Am");
    expect(result).toBe("Am  D");
  });
});

describe("isChordTapEditable", () => {
  const base = { editable: true, hasSectionId: true, mode: "all" as const, shift: null as number | null };

  it("is editable when the viewer is a leader, a section is known, mode shows chords, and there's no transposition", () => {
    expect(isChordTapEditable(base)).toBe(true);
  });

  it("is editable in chords-only mode too", () => {
    expect(isChordTapEditable({ ...base, mode: "chords" })).toBe(true);
  });

  it("is not editable when the caller hasn't confirmed leader permission", () => {
    expect(isChordTapEditable({ ...base, editable: false })).toBe(false);
  });

  it("is not editable without a section id to save against", () => {
    expect(isChordTapEditable({ ...base, hasSectionId: false })).toBe(false);
  });

  it("is not editable in lyrics-only mode (no chord line is even shown)", () => {
    expect(isChordTapEditable({ ...base, mode: "lyrics" })).toBe(false);
  });

  it("is not editable in Nashville numbers mode (derived, non-canonical display)", () => {
    expect(isChordTapEditable({ ...base, mode: "numbers" })).toBe(false);
  });

  it("is not editable when the display is transposed away from the song's own key", () => {
    expect(isChordTapEditable({ ...base, shift: 2 })).toBe(false);
  });

  it("is not editable when the display is transposed down (negative shift)", () => {
    expect(isChordTapEditable({ ...base, shift: -1 })).toBe(false);
  });
});
