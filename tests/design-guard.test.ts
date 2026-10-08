import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import path from "path";

// A guard for the design system (see DESIGN_SYSTEM.md). It scans the UI
// source and fails if something drifts back to the old, one-off ways of
// styling: legacy colour names, Tailwind's raw palette, hard-coded hex
// colours, or text too small to read. Fix the source, don't loosen a rule
// without a design reason.

const ROOT = path.resolve(__dirname, "..");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return name === "node_modules" || name === "api" ? [] : files(full);
    return full.endsWith(".tsx") ? [full] : [];
  });
}

const sources = [...files(path.join(ROOT, "app")), ...files(path.join(ROOT, "components"))].map((f) => ({
  file: path.relative(ROOT, f),
  text: readFileSync(f, "utf8"),
}));

function offenders(pattern: RegExp, skip: (file: string, text: string) => boolean = () => false) {
  return sources
    .filter((s) => !skip(s.file, s.text))
    .flatMap((s) => (s.text.match(pattern) ? [s.file] : []));
}

describe("design guard", () => {
  it("scans a meaningful number of UI files", () => {
    expect(sources.length).toBeGreaterThan(80);
  });

  it("uses no legacy accent colour (use primary for actions, musical for keys/dynamics)", () => {
    expect(offenders(/\b(?:bg|text|border|ring|fill|stroke|from|to|via)-accent\b|var\(--accent\)/)).toEqual([]);
  });

  it("uses no raw Tailwind palette colours (use semantic tokens)", () => {
    expect(
      offenders(/\b(?:bg|text|border|ring|fill|stroke)-(?:red|green|amber|yellow|blue|gray|slate|zinc|stone|neutral|emerald|orange|rose|indigo|purple|violet|sky|teal|lime|cyan|pink|fuchsia)-\d{2,3}\b/),
    ).toEqual([]);
  });

  it("uses no hard-coded hex colours in screens or components", () => {
    // Generated icons and document metadata are the only places a literal
    // hex is allowed (they cannot read CSS variables).
    const allowed = (file: string, text: string) =>
      /^app\/(layout|manifest)\.tsx?$/.test(file) || /icon/.test(file) || text.includes("ImageResponse");
    expect(offenders(/#[0-9a-fA-F]{6}\b/, allowed)).toEqual([]);
  });

  it("uses no pure white or black fills/text (tokens carry the contrast)", () => {
    expect(offenders(/\b(?:bg|text|border)-(?:white|black)(?![/\w-])/)).toEqual([]);
  });

  it("sets no text below 12px", () => {
    expect(offenders(/text-\[(?:[0-9]|1[01])px\]/)).toEqual([]);
  });
});
