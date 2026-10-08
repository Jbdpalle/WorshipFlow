import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DynamicIndicator } from "@/components/songs/dynamic-indicator";
import { selectRoleNoteForViewer } from "@/lib/songs/role-notes";

type RoleNote = {
  id: string;
  role: string;
  content: string;
  teamMemberId: string | null;
  visibility: "TEAM" | "ROLE" | "PERSON";
};

export type MyPartAssignment = {
  id: string;
  role: string;
  setSong: {
    set: { id: string; title: string; serviceDate: Date | null };
    song: {
      id: string;
      title: string;
      key: string | null;
      bpm: number | null;
      sections: {
        id: string;
        label: string;
        repeatCount: number | null;
        dynamics: string | null;
        roleNotes: RoleNote[];
      }[];
    };
  };
};

// One song, from a musician's point of view: the song, what they play
// (their role), then each section in order with what to do there. Sections
// with no direction for them stay visible but quiet, so the flow of the
// song, and what comes next, is never hidden. A note aimed at one person
// beats a shared note (selectRoleNoteForViewer), and is never shown to
// anyone else who plays the same role.
export function MyPartCard({
  assignment,
  memberId,
  muted,
  showSet,
}: {
  assignment: MyPartAssignment;
  memberId: string;
  muted?: boolean;
  showSet?: boolean;
}) {
  const { role, setSong } = assignment;
  const { song, set } = setSong;
  const rows = song.sections.map((section) => ({
    section,
    note: selectRoleNoteForViewer(section.roleNotes, role, memberId),
  }));
  const hasAnyDirection = rows.some((r) => r.note);

  // Consecutive sections with no direction for this person collapse into
  // one quiet row ("Verse 2 · Chorus: follow the flow") so the sections
  // that matter to them stand out instead of drowning in repeats.
  type Entry =
    | { kind: "note"; section: (typeof rows)[number]["section"]; content: string }
    | { kind: "quiet"; labels: string[]; key: string };
  const entries: Entry[] = [];
  for (const { section, note } of rows) {
    const label = `${section.label}${section.repeatCount && section.repeatCount > 1 ? ` ×${section.repeatCount}` : ""}`;
    if (note) {
      entries.push({ kind: "note", section, content: note.content });
    } else {
      const last = entries[entries.length - 1];
      if (last?.kind === "quiet") last.labels.push(label);
      else entries.push({ kind: "quiet", labels: [label], key: section.id });
    }
  }

  return (
    <Card muted={muted} className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-border p-4 sm:p-5">
        <div className="min-w-0">
          <h3 className="text-xl font-extrabold tracking-tight text-foreground">
            <Link href={`/songs/${song.id}`} className="hover:underline">
              {song.title}
            </Link>
          </h3>
          {showSet && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {set.title}
              {set.serviceDate && ` · ${new Date(set.serviceDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="primary" className="px-3 py-1 text-sm">
            {role}
          </Badge>
          {song.key && (
            <Badge variant="musical" className="tnum px-3 py-1 text-sm">
              Key {song.key}
            </Badge>
          )}
          {song.bpm && (
            <Badge variant="musical" className="tnum px-3 py-1 text-sm">
              {song.bpm} BPM
            </Badge>
          )}
        </div>
      </div>

      {hasAnyDirection ? (
        <ol>
          {entries.map((entry) =>
            entry.kind === "note" ? (
              <li
                key={entry.section.id}
                className="grid gap-x-6 gap-y-1 border-t border-border px-4 py-3 first:border-t-0 sm:grid-cols-[11rem_1fr] sm:px-5"
              >
                <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-start sm:justify-start">
                  <span className="text-sm font-bold text-foreground">
                    {entry.section.label}
                    {entry.section.repeatCount && entry.section.repeatCount > 1 ? ` ×${entry.section.repeatCount}` : ""}
                  </span>
                  <DynamicIndicator dynamics={entry.section.dynamics} />
                </div>
                <p className="text-base font-medium leading-snug text-foreground">{entry.content}</p>
              </li>
            ) : (
              <li
                key={entry.key}
                className="grid gap-x-6 gap-y-0.5 border-t border-border px-4 py-2 first:border-t-0 sm:grid-cols-[11rem_1fr] sm:px-5"
              >
                <span className="text-sm font-semibold text-muted-foreground">{entry.labels.join(" · ")}</span>
                <p className="text-sm text-muted-foreground">No direction for you. Follow the flow.</p>
              </li>
            ),
          )}
        </ol>
      ) : (
        <p className="p-4 text-sm text-muted-foreground sm:p-5">
          No specific instructions yet for {role}. Play it as written.
        </p>
      )}
    </Card>
  );
}
