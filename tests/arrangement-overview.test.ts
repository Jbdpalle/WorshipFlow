import { describe, it, expect } from "vitest";
import { deriveArrangementOverview, isRestDirection, partTagsForRole, partTagsForRoles } from "@/lib/songs/arrangement-lanes";
import { parseStructureText, nextSectionLabel } from "@/lib/songs/section-labels";

const sec = (id: string, dynamics: string | null, notes: Record<string, string>, repeat: number | null = null) => ({
  id,
  label: id,
  repeatCount: repeat,
  dynamics,
  roleNotes: Object.entries(notes).map(([role, content]) => ({ role, content })),
});

describe("deriveArrangementOverview", () => {
  const sections = [
    sec("Intro", "Intimate", { Keys: "Pad swell" }),
    sec("Verse", "Light", { "Lead Vocal": "Soft", Keys: "Pad", Bass: "Enter halfway" }),
    sec("Chorus", "Strong", { "Lead Vocal": "Full", "Backing Vocal": "Harmony", Keys: "Piano", Bass: "Root notes", Drums: "Full groove" }),
    sec("Bridge", "Building", { "Lead Vocal": "Build", Keys: "Rest", Bass: "Rest", Drums: "Build" }),
    sec("Final Chorus", "Full", { "Lead Vocal": "Full", "Backing Vocal": "Harmony", Keys: "Piano", Bass: "Root notes", Drums: "Full groove" }),
  ];
  const { rows, columns } = deriveArrangementOverview(sections);
  const state = (section: string, role: string) => columns.find((c) => c.id === section)!.states[role];

  it("marks the first appearance of each part as an entrance (vocal and instrument)", () => {
    expect(state("Intro", "Keys")).toBe("enter");
    expect(state("Verse", "Lead Vocal")).toBe("enter");
    expect(state("Verse", "Bass")).toBe("enter");
    expect(state("Chorus", "Backing Vocal")).toBe("enter");
    expect(state("Chorus", "Drums")).toBe("enter");
  });

  it("keeps a continuing part as 'play' and shows an explicit Rest as a drop-out", () => {
    expect(state("Chorus", "Keys")).toBe("play");
    expect(state("Bridge", "Keys")).toBe("out");
    expect(state("Bridge", "Bass")).toBe("out");
    expect(state("Bridge", "Drums")).toBe("play");
  });

  it("a part that is simply absent after playing drops out, then 'returns' when it plays again", () => {
    expect(state("Bridge", "Backing Vocal")).toBe("out");
    expect(state("Final Chorus", "Backing Vocal")).toBe("return");
    expect(state("Final Chorus", "Keys")).toBe("return");
    expect(state("Intro", "Bass")).toBe("off");
  });

  it("separates vocal and instrument lanes, vocals first", () => {
    expect(rows.filter((r) => r.lane === "vocal").map((r) => r.role)).toEqual(["Lead Vocal", "Backing Vocal"]);
    expect(rows.findIndex((r) => r.lane === "instrument")).toBeGreaterThan(rows.findIndex((r) => r.lane === "vocal"));
  });

  it("reports builds, drops and the ending from the section dynamics", () => {
    expect(columns.find((c) => c.id === "Verse")!.trend).toBe("build");
    expect(columns.find((c) => c.id === "Chorus")!.trend).toBe("build");
    expect(columns.find((c) => c.id === "Bridge")!.trend).toBe("drop");
    expect(columns.find((c) => c.id === "Final Chorus")!.trend).toBe("build");
    expect(columns.filter((c) => c.isEnding).map((c) => c.id)).toEqual(["Final Chorus"]);
  });

  it("does not guess a trend for custom/unset dynamics", () => {
    const out = deriveArrangementOverview([sec("A", null, { Keys: "x" }), sec("B", "Hushed", { Keys: "x" })]);
    expect(out.columns.map((c) => c.trend)).toEqual(["unknown", "unknown"]);
  });

  it("only treats an explicit leading rest word as 'not playing'", () => {
    for (const text of ["Rest", "rest · hold the chord", "Stop", "Tacet", "No vocals", "Sit out"]) expect(isRestDirection(text)).toBe(true);
    for (const text of ["Soft pad", "Restrained 8ths", "Outro swell", "Stopping on the 4 with the band"]) expect(isRestDirection(text)).toBe(false);
  });

  it("gives a musician IN/OUT tags for their own part only", () => {
    const tags = partTagsForRole(sections, "Bass")!;
    expect(tags).toMatchObject({ Intro: null, Verse: "IN", Chorus: null, Bridge: "OUT", "Final Chorus": "IN" });
    expect(partTagsForRole(sections, "Violin")).toBeUndefined();
  });

  it("gives a musician holding several roles a merged IN/OUT tag — IN if any role enters there, else OUT if any drops", () => {
    // Single role is a passthrough.
    expect(partTagsForRoles(sections, ["Bass"])).toEqual(partTagsForRole(sections, "Bass"));
    // A role with no directions anywhere contributes nothing.
    expect(partTagsForRoles(sections, ["Violin"])).toBeUndefined();
    expect(partTagsForRoles(sections, ["Bass", "Violin"])).toEqual(partTagsForRole(sections, "Bass"));
    // Chorus: Bass is just "play" (null tag) but Drums enters there — the
    // combined guitarist+drummer should still see IN, not miss their cue.
    expect(partTagsForRoles(sections, ["Bass", "Drums"])!.Chorus).toBe("IN");
    // Bridge: both Keys and Bass drop out, neither enters — merged OUT.
    expect(partTagsForRoles(sections, ["Keys", "Bass"])!.Bridge).toBe("OUT");
  });

  it("a song with no directions yields no rows and still lists every section", () => {
    const out = deriveArrangementOverview([sec("Verse", null, {}), sec("Chorus", null, {})]);
    expect(out.rows).toEqual([]);
    expect(out.columns).toHaveLength(2);
  });
});

describe("structure building helpers", () => {
  it("expands a typed structure in one go", () => {
    expect(parseStructureText("Intro, V1, C, V2, C, Bridge, C, Outro")).toEqual([
      "Intro", "Verse 1", "Chorus", "Verse 2", "Chorus", "Bridge", "Chorus", "Outro",
    ]);
    expect(parseStructureText("Intro → Verse → Chorus")).toEqual(["Intro", "Verse 1", "Chorus"]);
  });

  it("keeps unknown labels as typed, drops blanks, and caps the length", () => {
    expect(parseStructureText("Free Worship,, Spontaneous")).toEqual(["Free Worship", "Spontaneous"]);
    expect(parseStructureText(Array(100).fill("C").join(","))).toHaveLength(40);
  });

  it("numbers verses but not choruses", () => {
    expect(nextSectionLabel("Verse", ["Intro", "Verse 1", "Chorus"])).toBe("Verse 2");
    expect(nextSectionLabel("Chorus", ["Chorus"])).toBe("Chorus");
  });
});
