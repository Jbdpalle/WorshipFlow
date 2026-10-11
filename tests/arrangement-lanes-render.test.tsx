import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ArrangementLanes } from "@/components/songs/arrangement-lanes";

const sections = [
  { id: "1", label: "Intro", repeatCount: null, dynamics: "Intimate", roleNotes: [{ role: "Keys", content: "Pad" }] },
  { id: "2", label: "Verse", repeatCount: null, dynamics: "Light", roleNotes: [{ role: "Lead Vocal", content: "Soft" }, { role: "Keys", content: "Pad" }] },
  { id: "3", label: "Bridge", repeatCount: 2, dynamics: "Intimate", roleNotes: [{ role: "Lead Vocal", content: "Soft" }, { role: "Keys", content: "Rest" }] },
];

describe("ArrangementLanes (rendered)", () => {
  const html = renderToStaticMarkup(<ArrangementLanes sections={sections} myRoles={["Keys"]} />);

  it("still shows vocal and instrument entrances, drop-outs, builds and the ending", () => {
    expect(html).toContain("Lead Vocal: Enters");
    expect(html).toContain("Keys: Enters");
    expect(html).toContain("Keys: Drops out");
    expect(html).toContain("Build");
    expect(html).toContain("Drop");
    expect(html).toContain("End");
    expect(html).toContain("×2");
  });

  it("renders a phone layout (rows per section, no horizontal scroll container) and a tablet/desktop layout", () => {
    const [phone, wide] = [html.indexOf("sm:hidden"), html.indexOf("hidden overflow-x-auto")];
    expect(phone).toBeGreaterThanOrEqual(0);
    expect(wide).toBeGreaterThan(phone);
    // The phone block must not itself scroll sideways.
    const phoneBlock = html.slice(phone, wide);
    expect(phoneBlock).not.toContain("overflow-x-auto");
    expect(phoneBlock).not.toContain("min-w-max");
  });

  it("highlights the viewer's own part without hiding anyone else's", () => {
    expect(html).toContain("ring-musical");
    expect(html).toContain("Lead Vocal");
  });

  it("states are spelled out in text (not colour alone)", () => {
    expect(html).toContain("▲ Keys");
    expect(html).toContain("▼ Keys");
  });

  it("makes sections tappable for in-place editing when a handler is given", () => {
    const interactive = renderToStaticMarkup(<ArrangementLanes sections={sections} onSelectSection={() => {}} selectedId="2" />);
    expect(interactive).toContain('aria-current="true"');
    expect(interactive).toContain("<button");
  });
});
