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

// Blend a colour over a ground at the given opacity (how bg-success/15 etc.
// actually render), so tinted status chips are checked as users see them.
function blend(fg: string, bg: string, alpha: number): string {
  const ch = (i: number) =>
    Math.round(parseInt(fg.slice(i, i + 2), 16) * alpha + parseInt(bg.slice(i, i + 2), 16) * (1 - alpha));
  return "#" + [1, 3, 5].map((i) => ch(i).toString(16).padStart(2, "0")).join("");
}

const themes = { light, dark } as const;

describe("theme parity", () => {
  it("dark is manual-only: no prefers-color-scheme override in the stylesheet", () => {
    expect(css).not.toContain("prefers-color-scheme");
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

  // Badge / Status / banners use `bg-{tone}/15 text-{tone}`.
  for (const c of ["success", "warning", "danger", "info"] as const) {
    for (const g of ["background", "surface"] as const) {
      it(`${c} text is AA on its 15% tint over ${g}`, () => {
        expect(contrast(t[c], blend(t[c], t[g], 0.15))).toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  it("musical text is AA on the soft musical tint", () => {
    expect(contrast(t.musical, t["musical-soft"])).toBeGreaterThanOrEqual(4.5);
  });

  it("primary fill and focus ring are visible (3:1) against the page", () => {
    expect(contrast(t.primary, t.background)).toBeGreaterThanOrEqual(3);
    expect(contrast(t.ring, t.background)).toBeGreaterThanOrEqual(3);
  });
});

// Workflow-stage icon colours. Each stage has a glyph colour and a soft tint.
// Icons are decorative (labels carry the meaning) but must stay clearly visible
// on every ground they appear on: the tint, the surface and the page.
describe("stage icon colours", () => {
  const stages = ["plan", "arrange", "assign", "rehearse", "mypart", "lead", "support"];

  for (const [name, t] of Object.entries(themes)) {
    for (const stage of stages) {
      const fg = t[`stage-${stage}`];
      const soft = t[`stage-${stage}-soft`];
      it(`${name}: ${stage} defines glyph and tint`, () => {
        expect(fg).toMatch(/^#[0-9a-f]{6}$/);
        expect(soft).toMatch(/^#[0-9a-f]{6}$/);
      });
      it(`${name}: ${stage} glyph is AA on its tint, surface and page`, () => {
        expect(contrast(fg, soft)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(fg, t.surface)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(fg, t.background)).toBeGreaterThanOrEqual(4.5);
      });
      it(`${name}: ${stage} solid tile keeps its glyph readable`, () => {
        expect(contrast(t.background, fg)).toBeGreaterThanOrEqual(4.5);
      });
      it(`${name}: ${stage} tint sits quietly beside the label text`, () => {
        expect(contrast(t.foreground, soft)).toBeGreaterThanOrEqual(7);
      });
    }
  }

  it("stage colours stay separate from status colours", () => {
    for (const t of [light, dark]) {
      const status = [t.success, t.warning, t.danger, t.info];
      for (const stage of stages) expect(status).not.toContain(t[`stage-${stage}`]);
    }
  });
});
