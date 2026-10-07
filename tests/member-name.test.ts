import { describe, it, expect } from "vitest";
import { normalizeMemberName, groupMembersByName } from "@/lib/songs/member-name";

describe("normalizeMemberName", () => {
  it("is case-insensitive and collapses whitespace", () => {
    expect(normalizeMemberName("  Karthik  ")).toBe("karthik");
    expect(normalizeMemberName("Karthik")).toBe(normalizeMemberName("karthik"));
    expect(normalizeMemberName("Kezia  Kezia")).toBe(normalizeMemberName("kezia kezia"));
  });

  it("does not treat a nickname as equal to a full name", () => {
    // Deliberate: "kk" and "Karthik" are a real product gap the app leaves
    // to a human to fix on the Team page, not something code should guess.
    expect(normalizeMemberName("kk")).not.toBe(normalizeMemberName("Karthik"));
  });
});

describe("groupMembersByName", () => {
  it("groups exact-after-normalization duplicates into one entry", () => {
    const members = [
      { id: "1", name: "Selin Selin" },
      { id: "2", name: "selin selin" },
      { id: "3", name: "Sam" },
    ];
    const groups = groupMembersByName(members);
    expect(groups).toHaveLength(2);
    const selin = groups.find((g) => g.name === "Selin Selin");
    expect(selin?.ids.sort()).toEqual(["1", "2"]);
    const sam = groups.find((g) => g.name === "Sam");
    expect(sam?.ids).toEqual(["3"]);
  });

  it("keeps spelling/nickname variants as separate groups", () => {
    const members = [
      { id: "1", name: "Karthik" },
      { id: "2", name: "kk" },
    ];
    const groups = groupMembersByName(members);
    expect(groups).toHaveLength(2);
  });

  it("preserves first-seen order and uses the first member's casing for display", () => {
    const members = [
      { id: "1", name: "Kezia" },
      { id: "2", name: "KEZIA" },
    ];
    const groups = groupMembersByName(members);
    expect(groups[0].name).toBe("Kezia");
  });
});
