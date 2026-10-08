import { describe, it, expect } from "vitest";
import {
  NAV_GROUPS,
  MOBILE_TAB_LINKS,
  MOBILE_MORE_LINKS,
  isActive,
} from "@/components/layout/nav-links";

describe("navigation model", () => {
  const desktop = NAV_GROUPS.flat().map((l) => l.href);

  it("has no duplicate destinations", () => {
    expect(new Set(desktop).size).toBe(desktop.length);
  });

  it("phone bar plus More reaches every desktop destination", () => {
    const phone = new Set([...MOBILE_TAB_LINKS, ...MOBILE_MORE_LINKS].map((l) => l.href));
    for (const href of desktop) expect(phone.has(href)).toBe(true);
  });

  it("keeps the phone bar to four destinations (a fifth slot is More)", () => {
    expect(MOBILE_TAB_LINKS).toHaveLength(4);
  });

  it("keeps My Part in the phone bar", () => {
    expect(MOBILE_TAB_LINKS.map((l) => l.href)).toContain("/my-part");
  });

  it("keeps Roster out of the phone bar so it never outranks Rehearsal / My Part", () => {
    expect(MOBILE_TAB_LINKS.map((l) => l.href)).not.toContain("/roster");
  });
});

describe("isActive", () => {
  it("matches the page and its children only", () => {
    expect(isActive("/sets", "/sets")).toBe(true);
    expect(isActive("/sets/abc", "/sets")).toBe(true);
    expect(isActive("/settings", "/sets")).toBe(false);
    expect(isActive(null, "/sets")).toBe(false);
  });
});
