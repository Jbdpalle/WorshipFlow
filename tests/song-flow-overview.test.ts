import { describe, it, expect } from "vitest";
import { summarizeSectionCoverage } from "@/lib/songs/role-notes";
import { isFollowingLivePosition } from "@/lib/songs/live-follow";

describe("summarizeSectionCoverage", () => {
  it("lists each distinct role that has a non-empty direction, once each", () => {
    const result = summarizeSectionCoverage([
      { role: "Bass", content: "Root notes only." },
      { role: "Drums", content: "Kick only." },
      { role: "Bass", content: "Add fills in bar 3." },
    ]);
    expect(result.hasAny).toBe(true);
    expect(result.roles.sort()).toEqual(["Bass", "Drums"]);
  });

  it("ignores rows with blank or whitespace-only content", () => {
    const result = summarizeSectionCoverage([
      { role: "Bass", content: "   " },
      { role: "Drums", content: "" },
    ]);
    expect(result.hasAny).toBe(false);
    expect(result.roles).toEqual([]);
  });

  it("reports no coverage for a section with zero role notes", () => {
    expect(summarizeSectionCoverage([])).toEqual({ roles: [], hasAny: false });
  });
});

describe("isFollowingLivePosition", () => {
  it("the leader/MD is always considered following — they ARE the position", () => {
    expect(isFollowingLivePosition(true, "section-a", "section-b")).toBe(true);
  });

  it("a non-leader with no live position established yet is following (nothing to diverge from)", () => {
    expect(isFollowingLivePosition(false, "section-a", null)).toBe(true);
  });

  it("a non-leader whose current section matches the last known live section is following", () => {
    expect(isFollowingLivePosition(false, "section-a", "section-a")).toBe(true);
  });

  it("a non-leader who browsed to a different section is NOT following", () => {
    expect(isFollowingLivePosition(false, "section-a", "section-b")).toBe(false);
  });
});
