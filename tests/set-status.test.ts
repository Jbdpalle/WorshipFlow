import { describe, it, expect } from "vitest";
import {
  daysUntil,
  relativeDayLabel,
  getLeaderName,
  getSetStatuses,
  isPast,
} from "@/lib/sets/set-status";

const now = new Date(2026, 9, 8, 15, 30); // Thu 8 Oct 2026, mid-afternoon
const day = (offset: number, hour = 9) => new Date(2026, 9, 8 + offset, hour);

describe("daysUntil", () => {
  it("counts calendar days regardless of time of day", () => {
    expect(daysUntil(day(0, 6), now)).toBe(0);
    expect(daysUntil(day(0, 23), now)).toBe(0);
    expect(daysUntil(day(3), now)).toBe(3);
    expect(daysUntil(day(-1, 23), now)).toBe(-1);
  });
});

describe("relativeDayLabel", () => {
  it("reads naturally", () => {
    expect(relativeDayLabel(0)).toBe("Today");
    expect(relativeDayLabel(1)).toBe("Tomorrow");
    expect(relativeDayLabel(3)).toBe("In 3 days");
    expect(relativeDayLabel(-1)).toBe("Yesterday");
    expect(relativeDayLabel(-4)).toBe("4 days ago");
  });
});

describe("getLeaderName", () => {
  it("reads the Worship Leader assignment only", () => {
    expect(
      getLeaderName([
        { role: "Bass", name: "Joel" },
        { role: "Worship Leader", name: "Daniel" },
      ]),
    ).toBe("Daniel");
    expect(getLeaderName([{ role: "Bass", name: "Joel" }])).toBeNull();
  });
});

describe("getSetStatuses", () => {
  const roster = [{ role: "Bass", name: "Joel" }];

  it("marks a past set as a single muted chip, even if it has gaps", () => {
    const s = getSetStatuses({ serviceDate: day(-7), songCount: 0, roster: [] }, now);
    expect(s).toEqual([{ tone: "muted", label: "Past" }]);
    expect(isPast({ serviceDate: day(-7) }, now)).toBe(true);
  });

  it("flags each visible gap on an upcoming set", () => {
    const s = getSetStatuses({ serviceDate: day(3), songCount: 0, roster: [] }, now);
    expect(s.map((c) => c.label)).toEqual(["In 3 days", "No songs yet", "No team yet"]);
    expect(s.slice(1).every((c) => c.tone === "warning")).toBe(true);
  });

  it("confirms when songs and team are both present", () => {
    const s = getSetStatuses({ serviceDate: day(3), songCount: 3, roster }, now);
    expect(s.map((c) => c.label)).toEqual(["In 3 days", "Songs and team set"]);
  });

  it("highlights sets happening today or tomorrow", () => {
    expect(getSetStatuses({ serviceDate: day(0), songCount: 1, roster }, now)[0].tone).toBe("info");
    expect(getSetStatuses({ serviceDate: day(5), songCount: 1, roster }, now)[0].tone).toBe("muted");
  });

  it("asks for a date when none is set", () => {
    const s = getSetStatuses({ serviceDate: null, songCount: 1, roster }, now);
    expect(s[0]).toEqual({ tone: "warning", label: "No date yet" });
  });
});
