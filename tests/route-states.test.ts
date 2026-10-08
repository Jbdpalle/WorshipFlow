import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import path from "path";

// Every screen must have a defined loading, error and not-found state, so a
// slow or failing request never leaves a blank page. This keeps the
// "states" part of the design system from silently regressing when a new
// route is added.

const ROOT = path.resolve(__dirname, "..");
const APP = path.join(ROOT, "app");
const SIGNED_IN = path.join(APP, "(app)");

function pageDirs(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (!statSync(full).isDirectory()) return name === "page.tsx" ? [dir] : [];
    return pageDirs(full);
  });
}

const rel = (p: string) => path.relative(ROOT, p);

describe("route states", () => {
  it("has app-wide loading, error and not-found for signed-in pages", () => {
    for (const f of ["loading.tsx", "error.tsx", "not-found.tsx"]) {
      expect(existsSync(path.join(SIGNED_IN, f)), `app/(app)/${f}`).toBe(true);
    }
  });

  it("has public error, global error and 404 pages", () => {
    for (const f of ["error.tsx", "global-error.tsx", "not-found.tsx"]) {
      expect(existsSync(path.join(APP, f)), `app/${f}`).toBe(true);
    }
  });

  it("gives every data-heavy signed-in screen its own loading skeleton", () => {
    const needsOwn = ["dashboard", "sets", "sets/[id]", "songs", "songs/[id]", "my-part", "rehearsal/[setId]", "roster", "team", "settings"];
    const missing = needsOwn.filter((r) => !existsSync(path.join(SIGNED_IN, r, "loading.tsx")));
    expect(missing).toEqual([]);
  });

  it("only declares signed-in pages that the shell-level fallbacks cover", () => {
    // Every page under (app) inherits (app)/loading.tsx, error.tsx and
    // not-found.tsx, so listing them here documents the covered surface.
    const pages = pageDirs(SIGNED_IN).map((d) => path.relative(SIGNED_IN, d) || "(root)");
    expect(pages.length).toBeGreaterThanOrEqual(14);
  });

  it("marks every error boundary as a client component", () => {
    for (const f of [path.join(SIGNED_IN, "error.tsx"), path.join(APP, "error.tsx"), path.join(APP, "global-error.tsx")]) {
      expect(readFileSync(f, "utf8").trimStart().startsWith('"use client"'), rel(f)).toBe(true);
    }
  });

  it("uses the shared skeleton system in every loading screen", () => {
    const loadingFiles = pageDirs(SIGNED_IN)
      .map((d) => path.join(d, "loading.tsx"))
      .concat(path.join(SIGNED_IN, "loading.tsx"))
      .filter((f) => existsSync(f));
    for (const f of loadingFiles) {
      expect(readFileSync(f, "utf8"), rel(f)).toContain("PageSkeleton");
    }
  });
});
