import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

// Design tokens live in app/globals.css. These tests keep the two themes in
// sync and hold every text/background pairing to WCAG AA (4.5:1 for text,
// 3:1 for large text and UI fills), so a token edit cannot silently ship
// unreadable colours.

const css = readFileSync(path.resolve(__dirname, "../app/globals.css"), "utf8");

function block(startMarker: string): Record<string, string> {
  const start = css.indexOf(startMarker);
  if (start < 0) throw new Error(`block not found: ${startMarker}`);
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  const out: Record<string, string> = {};
  for (const m of css.slice(open + 1, close).matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    out[m[1]] = m[2].toLowerCase();
  }
  return out;
}

const light = block(":root {");
const dark = block(':root[data-theme="dark"]');
const darkMedia = block(':root:not([data-theme="light"])');

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

it("parses every colour token from the stylesheet", () => {
  expect(Object.keys(light).length).toBeGreaterThanOrEqual(19);
  expect(Object.keys(dark).length).toBe(Object.keys(light).length);
});

const themes = { light, dark } as const;

describe("theme parity", () => {
  it("the OS-preference dark block matches the explicit dark block", () => {
    expect(darkMedia).toEqual(dark);
  });

  it("light and dark define the same tokens", () => {
    const colorKeys = (t: Record<string, string>) => Object.keys(t).sort();
    expect(colorKeys(dark)).toEqual(colorKeys(light));
  });
});

describe.each(Object.entries(themes))("%s theme contrast", (_name, t) => {
  const grounds = ["background", "surface", "surface-elevated", "surface-muted"] as const;

  it.each(grounds)("foreground text is AA on %s", (g) => {
    expect(contrast(t.foreground, t[g])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(grounds)("muted text is AA on %s", (g) => {
    expect(contrast(t["muted-foreground"], t[g])).toBeGreaterThanOrEqual(4.5);
  });

  // Coloured text (links, status words, musical data) on the two main grounds.
  const textColours = ["primary", "musical", "success", "warning", "danger", "info"] as const;
  for (const c of textColours) {
    for (const g of ["background", "surface"] as const) {
      it(`${c} text is AA on ${g}`, () => {
        expect(contrast(t[c], t[g])).toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  it.each([
    ["primary-foreground", "primary"],
    ["secondary-foreground", "secondary"],
    ["danger-foreground", "danger"],
    ["musical-foreground", "musical"],
  ] as const)("%s is AA on %s fill", (fg, bg) => {
    expect(contrast(t[fg], t[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it("musical text is AA on the soft musical tint", () => {
    expect(contrast(t.musical, t["musical-soft"])).toBeGreaterThanOrEqual(4.5);
  });

  it("primary fill and focus ring are visible (3:1) against the page", () => {
    expect(contrast(t.primary, t.background)).toBeGreaterThanOrEqual(3);
    expect(contrast(t.ring, t.background)).toBeGreaterThanOrEqual(3);
  });
});
