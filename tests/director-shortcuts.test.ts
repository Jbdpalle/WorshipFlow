import { describe, it, expect } from "vitest";
import {
  shouldIgnoreShortcutEvent,
  resolveShortcutAction,
  DEFAULT_SHORTCUT_MAP,
} from "@/hooks/use-director-shortcuts";

describe("shouldIgnoreShortcutEvent", () => {
  it("ignores key-repeat from a held key, regardless of target", () => {
    expect(shouldIgnoreShortcutEvent({ repeat: true, target: null })).toBe(true);
  });

  // This project's vitest environment is plain Node (no jsdom — see
  // vitest.config.ts), and the function only reads tagName/isContentEditable
  // off its target, so a minimal object literal exercises the real logic
  // without needing a DOM.
  function el(tagName: string, isContentEditable = false) {
    return { tagName, isContentEditable } as unknown as EventTarget;
  }

  it("ignores events targeting a text input, textarea, or select", () => {
    expect(shouldIgnoreShortcutEvent({ repeat: false, target: el("INPUT") })).toBe(true);
    expect(shouldIgnoreShortcutEvent({ repeat: false, target: el("TEXTAREA") })).toBe(true);
    expect(shouldIgnoreShortcutEvent({ repeat: false, target: el("SELECT") })).toBe(true);
  });

  it("ignores events targeting a contentEditable element", () => {
    expect(shouldIgnoreShortcutEvent({ repeat: false, target: el("DIV", true) })).toBe(true);
  });

  it("does not ignore a fresh keydown on a plain, non-editable element", () => {
    expect(shouldIgnoreShortcutEvent({ repeat: false, target: el("DIV") })).toBe(false);
  });

  it("does not ignore when target is null", () => {
    expect(shouldIgnoreShortcutEvent({ repeat: false, target: null })).toBe(false);
  });
});

describe("resolveShortcutAction", () => {
  it("resolves every default mapping back to its action", () => {
    for (const [action, key] of Object.entries(DEFAULT_SHORTCUT_MAP)) {
      expect(resolveShortcutAction(key, DEFAULT_SHORTCUT_MAP)).toBe(action);
    }
  });

  it("is case-insensitive for single-letter keys (Shift/CapsLock on a pedal shouldn't matter)", () => {
    expect(resolveShortcutAction("H", DEFAULT_SHORTCUT_MAP)).toBe("hold");
    expect(resolveShortcutAction("h", DEFAULT_SHORTCUT_MAP)).toBe("hold");
    expect(resolveShortcutAction("B", DEFAULT_SHORTCUT_MAP)).toBe("build");
  });

  it("matches named keys exactly, not case-insensitively", () => {
    expect(resolveShortcutAction("ArrowRight", DEFAULT_SHORTCUT_MAP)).toBe("goNext");
    expect(resolveShortcutAction("arrowright", DEFAULT_SHORTCUT_MAP)).toBeNull();
  });

  it("returns null for an unmapped key", () => {
    expect(resolveShortcutAction("q", DEFAULT_SHORTCUT_MAP)).toBeNull();
    expect(resolveShortcutAction("F5", DEFAULT_SHORTCUT_MAP)).toBeNull();
  });

  it("follows a custom remapping, not the default, once one is set", () => {
    const custom = { ...DEFAULT_SHORTCUT_MAP, goNext: "n" };
    expect(resolveShortcutAction("n", custom)).toBe("goNext");
    // The old default key no longer maps to goNext once reassigned elsewhere...
    expect(resolveShortcutAction("ArrowRight", custom)).toBeNull();
  });
});
