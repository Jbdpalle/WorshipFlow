import { describe, it, expect } from "vitest";
import { nextDetourAnchor } from "@/lib/songs/live-follow";

// Pure-function coverage for "Return to Planned Flow" (build spec Phase 4.2):
// when the leader detours into a Free Worship section, nextDetourAnchor
// decides whether to stash the position being left, leave an existing
// stash untouched, or clear it once the leader arrives back.
describe("nextDetourAnchor", () => {
  it("stashes the current position when entering a freeform section from a planned one", () => {
    const result = nextDetourAnchor(
      { sectionIndex: 2, isFreeform: false },
      { sectionIndex: 3, isFreeform: true },
      null,
    );
    expect(result).toBe(2);
  });

  it("does not stash when moving between two non-freeform sections", () => {
    const result = nextDetourAnchor(
      { sectionIndex: 2, isFreeform: false },
      { sectionIndex: 3, isFreeform: false },
      null,
    );
    expect(result).toBeNull();
  });

  it("does not overwrite an already-stashed anchor with a second freeform-to-freeform move", () => {
    const result = nextDetourAnchor(
      { sectionIndex: 3, isFreeform: true },
      { sectionIndex: 4, isFreeform: true },
      2,
    );
    expect(result).toBe(2);
  });

  it("clears the anchor once the leader arrives back at the stashed position", () => {
    const result = nextDetourAnchor(
      { sectionIndex: 4, isFreeform: true },
      { sectionIndex: 2, isFreeform: false },
      2,
    );
    expect(result).toBeNull();
  });

  it("leaves an existing anchor untouched when moving somewhere other than the stashed position", () => {
    const result = nextDetourAnchor(
      { sectionIndex: 4, isFreeform: true },
      { sectionIndex: 5, isFreeform: false },
      2,
    );
    expect(result).toBe(2);
  });

  it("does not stash when a freeform section is entered a second time after the anchor was already cleared", () => {
    // Leader returned to plan (anchor cleared), then later re-enters a
    // freeform section — this starts a fresh detour, same as the first.
    const result = nextDetourAnchor(
      { sectionIndex: 2, isFreeform: false },
      { sectionIndex: 3, isFreeform: true },
      null,
    );
    expect(result).toBe(2);
  });
});
