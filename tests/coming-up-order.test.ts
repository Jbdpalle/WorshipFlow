import { describe, it, expect } from "vitest";
import { sortComingUpRows } from "@/lib/dashboard/coming-up";

describe("sortComingUpRows", () => {
  it("sorts a farther 'following' service after a nearer thisWeek item (the reported bug)", () => {
    const following = { id: "following", rawDate: new Date("2026-10-25"), label: "Sunday, October 25" };
    const nearerRehearsal = { id: "near", rawDate: new Date("2026-10-10"), label: "Kezia Set" };
    const result = sortComingUpRows([following, nearerRehearsal]);
    expect(result.map((r) => r.id)).toEqual(["near", "following"]);
  });

  it("keeps several thisWeek items and following all sorted together by date", () => {
    const rows = [
      { id: "following", rawDate: new Date("2026-10-25") },
      { id: "a", rawDate: new Date("2026-10-10") },
      { id: "b", rawDate: new Date("2026-10-10") },
      { id: "c", rawDate: new Date("2026-10-12") },
    ];
    const result = sortComingUpRows(rows);
    expect(result.map((r) => r.id)).toEqual(["a", "b", "c", "following"]);
  });

  it("puts rows with no date last, after every dated row", () => {
    const rows = [
      { id: "no-date", rawDate: null },
      { id: "dated", rawDate: new Date("2026-10-10") },
    ];
    const result = sortComingUpRows(rows);
    expect(result.map((r) => r.id)).toEqual(["dated", "no-date"]);
  });

  it("does not mutate the input array", () => {
    const rows = [
      { id: "b", rawDate: new Date("2026-10-25") },
      { id: "a", rawDate: new Date("2026-10-10") },
    ];
    const original = [...rows];
    sortComingUpRows(rows);
    expect(rows).toEqual(original);
  });
});
