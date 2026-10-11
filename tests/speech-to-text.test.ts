import { describe, it, expect } from "vitest";
import { combineDictationText } from "@/hooks/use-speech-to-text";

// The Web Speech API itself (useSpeechToText's SpeechRecognition wiring)
// is a browser-only construct with no DOM in this test environment
// (vitest.config.ts runs environment: "node", no jsdom) — only this pure
// helper, which decides how a new spoken chunk joins whatever text was
// already in the box before dictation started, is testable here. Live
// behavior was verified manually in a real browser.
describe("combineDictationText", () => {
  it("returns the spoken text as-is when the box was empty", () => {
    expect(combineDictationText("", "drop the drums on the bridge")).toBe("drop the drums on the bridge");
  });

  it("appends spoken text after existing typed text with one space", () => {
    expect(combineDictationText("bass too loud", "in verse two")).toBe("bass too loud in verse two");
  });

  it("trims the existing base before joining, so trailing whitespace doesn't double up", () => {
    expect(combineDictationText("bass too loud   ", "in verse two")).toBe("bass too loud in verse two");
  });

  it("treats a whitespace-only base as empty", () => {
    expect(combineDictationText("   ", "keys sustained through the bridge")).toBe("keys sustained through the bridge");
  });
});
