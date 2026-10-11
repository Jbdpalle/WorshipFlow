import { deriveArrangementOverview, PART_STATE_LABEL, type PartState } from "@/lib/songs/arrangement-lanes";
import { cn } from "@/lib/utils/cn";
import { ArrowDownRight, ArrowUpRight, Flag } from "lucide-react";

type RoleNote = { role: string; content: string };
type Section = {
  id: string;
  label: string;
  repeatCount: number | null;
  dynamics?: string | null;
  roleNotes: RoleNote[];
};

// The whole arrangement at a glance: who enters where, who drops out, where
// it builds and where it ends. One column per section on tablet/desktop; on
// a phone the same data turns 90° (one row per section, Vocal and Band as
// two short lines) so the full arrangement fits 320px with no sideways
// scrolling and nothing hidden. Section-level only — never bar/beat
// accurate, per the product brief (no DAW grid).
//
// `myRoles` highlights the viewer's own part(s); `onSelectSection` makes a
// section tappable (the arrangement editor uses it to edit in place).
export function ArrangementLanes({
  sections,
  myRoles = [],
  selectedId = null,
  onSelectSection,
}: {
  sections: Section[];
  myRoles?: string[];
  selectedId?: string | null;
  onSelectSection?: (sectionId: string) => void;
}) {
  if (sections.length === 0) return null;
  const { rows, columns } = deriveArrangementOverview(sections);

  const vocalRows = rows.filter((r) => r.lane === "vocal");
  const instrumentRows = rows.filter((r) => r.lane === "instrument");

  return (
    <div data-testid="arrangement-lanes">
      {/* Phone: one row per section */}
      <ol className="space-y-1.5 sm:hidden" aria-label="Arrangement by section">
        {columns.map((col, i) => (
          <li
            key={col.id}
            className={cn(
              "rounded-lg border bg-surface p-2",
              col.id === selectedId ? "border-primary" : "border-border",
            )}
          >
            <SectionHeading col={col} index={i} onSelect={onSelectSection} selected={col.id === selectedId} />
            <PartLine label="Vocal" rows={vocalRows} states={col.states} myRoles={myRoles} />
            <PartLine label="Band" rows={instrumentRows} states={col.states} myRoles={myRoles} />
          </li>
        ))}
      </ol>

      {/* Tablet / desktop: one column per section */}
      <div className="hidden overflow-x-auto rounded-xl border border-border bg-surface sm:block">
        <div
          className="grid min-w-max"
          style={{ gridTemplateColumns: `6rem repeat(${columns.length}, minmax(7rem, 1fr))` }}
        >
          <div className="border-r border-border bg-surface-muted" />
          {columns.map((col, i) => (
            <div key={`h-${col.id}`} className={cn("border-r border-border p-1.5", col.id === selectedId && "bg-primary/10")}>
              <SectionHeading col={col} index={i} onSelect={onSelectSection} selected={col.id === selectedId} />
            </div>
          ))}
          <LaneLabel label="Vocal" />
          {columns.map((col) => (
            <LaneCell key={`v-${col.id}`} rows={vocalRows} states={col.states} myRoles={myRoles} />
          ))}
          <LaneLabel label="Instrument" />
          {columns.map((col) => (
            <LaneCell key={`i-${col.id}`} rows={instrumentRows} states={col.states} myRoles={myRoles} />
          ))}
        </div>
      </div>
      <Legend />
    </div>
  );
}

type Col = ReturnType<typeof deriveArrangementOverview>["columns"][number];

function SectionHeading({
  col,
  index,
  onSelect,
  selected,
}: {
  col: Col;
  index: number;
  onSelect?: (id: string) => void;
  selected: boolean;
}) {
  const text = (
    <>
      <span className="tnum">{index + 1}.</span> {col.label}
      {col.repeatCount && col.repeatCount > 1 ? ` ×${col.repeatCount}` : ""}
    </>
  );
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
      {onSelect ? (
        <button
          type="button"
          onClick={() => onSelect(col.id)}
          aria-current={selected ? "true" : undefined}
          className="tap-target -my-1 min-w-0 truncate text-left text-sm font-bold text-foreground hover:text-primary"
        >
          {text}
        </button>
      ) : (
        <span className="min-w-0 truncate text-sm font-bold text-foreground">{text}</span>
      )}
      {col.trend === "build" && (
        <span className="flex items-center gap-0.5 text-xs font-semibold text-musical" title="Builds from the previous section">
          <ArrowUpRight className="h-3 w-3" aria-hidden /> Build
        </span>
      )}
      {col.trend === "drop" && (
        <span className="flex items-center gap-0.5 text-xs font-semibold text-muted-foreground" title="Drops from the previous section">
          <ArrowDownRight className="h-3 w-3" aria-hidden /> Drop
        </span>
      )}
      {col.isEnding && (
        <span className="flex items-center gap-0.5 text-xs font-semibold text-muted-foreground" title="Final section — the ending">
          <Flag className="h-3 w-3" aria-hidden /> End
        </span>
      )}
      {col.dynamics && <span className="text-xs text-muted-foreground">{col.dynamics}</span>}
    </div>
  );
}

function LaneLabel({ label }: { label: string }) {
  return <div className="label-caps flex items-center border-r border-t border-border bg-surface-muted px-2 py-2">{label}</div>;
}

function LaneCell({
  rows,
  states,
  myRoles,
}: {
  rows: { role: string }[];
  states: Record<string, PartState>;
  myRoles: string[];
}) {
  const shown = rows.filter((r) => states[r.role] !== "off");
  return (
    <div className="flex min-h-[2.75rem] flex-wrap content-start items-center gap-1 border-r border-t border-border px-1.5 py-1.5">
      {shown.length === 0 ? (
        <span className="px-1 text-xs text-muted-foreground">—</span>
      ) : (
        shown.map((r) => <Pill key={r.role} role={r.role} state={states[r.role]} mine={myRoles.includes(r.role)} />)
      )}
    </div>
  );
}

function PartLine({
  label,
  rows,
  states,
  myRoles,
}: {
  label: string;
  rows: { role: string }[];
  states: Record<string, PartState>;
  myRoles: string[];
}) {
  const shown = rows.filter((r) => states[r.role] !== "off");
  if (rows.length === 0) return null;
  return (
    <div className="mt-1 flex items-start gap-2">
      <span className="label-caps w-12 shrink-0 pt-1">{label}</span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
        {shown.length === 0 ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          shown.map((r) => <Pill key={r.role} role={r.role} state={states[r.role]} mine={myRoles.includes(r.role)} />)
        )}
      </div>
    </div>
  );
}

// Entrances are solid, continuing parts are quiet, drop-outs are outlined
// and struck through — the state is also spelled out in the tooltip/label,
// never carried by colour alone.
function Pill({ role, state, mine }: { role: string; state: PartState; mine: boolean }) {
  const prefix = state === "enter" || state === "return" ? "▲ " : state === "out" ? "▼ " : "";
  return (
    <span
      title={`${role}: ${PART_STATE_LABEL[state]}`}
      aria-label={`${role}: ${PART_STATE_LABEL[state]}`}
      className={cn(
        "max-w-full truncate rounded-full px-2 py-0.5 text-xs font-semibold leading-tight",
        (state === "enter" || state === "return") && "bg-primary text-primary-foreground",
        state === "play" && "bg-surface-muted text-muted-foreground",
        state === "out" && "border border-dashed border-border text-muted-foreground line-through",
        mine && "ring-2 ring-musical ring-offset-1 ring-offset-surface",
      )}
    >
      {prefix}
      {role}
    </span>
  );
}

function Legend() {
  return (
    <p className="mt-1.5 text-xs text-muted-foreground">
      <span className="font-semibold text-primary">▲ solid</span> enters · plain keeps playing ·{" "}
      <span className="line-through">▼ struck</span> drops out
    </p>
  );
}
