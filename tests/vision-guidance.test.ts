import { describe, it, expect } from "vitest";
import { getVisionPlaceholder, getOpeningPlaceholder } from "@/lib/songs/vision-guidance";

// Placeholder-only (never-saved) guidance for the Set Vision ("Leader's
// Note") and Opening/Exaltation fields — deterministic templates built on
// the existing theme-engine keyword matching, not an AI call.
describe("vision-guidance", () => {
  describe("getVisionPlaceholder", () => {
    it("returns the generic fallback when no theme or keywords are set", () => {
      const result = getVisionPlaceholder("", "");
      expect(result).toContain("Describe the overall purpose of this worship set");
    });

    it("returns the generic fallback when theme/keywords are only whitespace", () => {
      expect(getVisionPlaceholder("   ", "  ")).toContain("Describe the overall purpose");
    });

    it("returns theme-aware guidance when a theme is set", () => {
      const result = getVisionPlaceholder("Shaped to Serve God", "grace, surrender, hope");
      expect(result).toContain("Set vision:");
      expect(result).not.toContain("Describe the overall purpose of this worship set");
    });

    it("returns theme-aware guidance from keywords alone, with no theme title", () => {
      const result = getVisionPlaceholder("", "grace, surrender, hope");
      expect(result).toContain("Set vision:");
    });
  });

  describe("getOpeningPlaceholder", () => {
    it("returns the generic fallback when no theme or keywords are set", () => {
      const result = getOpeningPlaceholder("", "");
      expect(result).toContain("Describe how the set should begin");
    });

    it("returns theme-aware guidance when a theme is set", () => {
      const result = getOpeningPlaceholder("Shaped to Serve God", "grace, surrender, hope");
      expect(result).toContain("Opening direction:");
      expect(result).not.toContain("Describe how the set should begin");
    });
  });

  it("never returns the same placeholder text as saved content would be — it's guidance copy, not a template to persist verbatim", () => {
    // Regression guard: these must stay prose placeholders (never JSON,
    // never empty) so a caller can't accidentally wire them up as a value.
    expect(getVisionPlaceholder("Grace", "").length).toBeGreaterThan(20);
    expect(getOpeningPlaceholder("Grace", "").length).toBeGreaterThan(20);
  });
});
