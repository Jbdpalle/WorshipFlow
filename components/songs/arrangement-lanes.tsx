import { laneForRole } from "@/lib/songs/role-notes";
import { cn } from "@/lib/utils/cn";

type RoleNote = { role: string; content: string };
type Section = { id: string; label: string; repeatCount: number | null; roleNotes: RoleNote[] };

// The whole arrangement's vocal and instrumental build, at a glance: one
// column per section (same order as the section outline), two lanes
// (Vocal / Instrument), each cell a handful of role pills. A pill is
// highlighted the first time that role appears (an entrance) and dims on
// every section after, so a leader can see exactly where each part comes
// in — and, by absence, where it drops out — without opening every section.
// Deliberately NOT bar/beat-accurate or audio-driven — section-level
// granularity is the right precision for "who's playing when," per the
// product brief (no DAW-style grid).
export function ArrangementLanes({ sections }: { sections: Section[] }) {
  if (sections.length === 0) return null;

  const seenVocal = new Set<string>();
  const seenInstrument = new Set<string>();
  const columns = sections.map((section) => {
    const rolesHere = Array.from(new Set(section.roleNotes.filter((n) => n.content.trim()).map((n) => n.role)));
    const vocal = rolesHere.filter((r) => laneForRole(r) === "vocal");
    const instrument = rolesHere.filter((r) => laneForRole(r) === "instrument");
    const vocalEntrances = vocal.map((r) => ({ role: r, isNew: !seenVocal.has(r) }));
    const instrumentEntrances = instrument.map((r) => ({ role: r, isNew: !seenInstrument.has(r) }));
    vocal.forEach((r) => seenVocal.add(r));
    instrument.forEach((r) => seenInstrument.add(r));
    return { section, vocal: vocalEntrances, instrument: instrumentEntrances };
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <div
        className="grid min-w-max"
        style={{ gridTemplateColumns: `6rem repeat(${sections.length}, 8rem)` }}
      >
        <LaneLabel label="Vocal" />
        {columns.map(({ section, vocal }) => (
          <LaneCell key={`vocal-${section.id}`} pills={vocal} empty="—" />
        ))}
        <LaneLabel label="Instrument" />
        {columns.map(({ section, instrument }) => (
          <LaneCell key={`instrument-${section.id}`} pills={instrument} empty="—" />
        ))}
        <div className="border-t border-r border-border bg-surface-muted" />
        {sections.map((s, i) => (
          <div
            key={`label-${s.id}`}
            className="truncate border-t border-r border-border px-2 py-1.5 text-center text-xs font-semibold text-muted-foreground"
          >
            {i + 1}. {s.label}
            {s.repeatCount && s.repeatCount > 1 ? ` ×${s.repeatCount}` : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

function LaneLabel({ label }: { label: string }) {
  return (
    <div className="label-caps flex items-center border-r border-t border-border bg-surface-muted px-2 py-2 first:border-t-0">
      {label}
    </div>
  );
}

function LaneCell({ pills, empty }: { pills: { role: string; isNew: boolean }[]; empty: string }) {
  return (
    <div className="flex min-h-[2.75rem] flex-wrap items-center gap-1 border-r border-t border-border px-1.5 py-1.5">
      {pills.length === 0 ? (
        <span className="px-1 text-xs text-muted-foreground">{empty}</span>
      ) : (
        pills.map((p) => (
          <span
            key={p.role}
            className={cn(
              "truncate rounded-full px-2 py-0.5 text-[0.65rem] font-semibold leading-tight",
              p.isNew ? "bg-primary text-primary-foreground" : "bg-surface-muted text-muted-foreground",
            )}
            title={p.isNew ? `${p.role} enters here` : p.role}
          >
            {p.role}
          </span>
        ))
      )}
    </div>
  );
}
