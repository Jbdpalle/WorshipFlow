import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DynamicIndicator } from "@/components/songs/dynamic-indicator";
import { selectRoleNoteForViewer } from "@/lib/songs/role-notes";
import { cn } from "@/lib/utils/cn";

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
          {rows.map(({ section, note }) => (
            <li
              key={section.id}
              className={cn(
                "grid gap-x-6 gap-y-1 border-t border-border px-4 py-3 first:border-t-0 sm:grid-cols-[11rem_1fr] sm:px-5",
                !note && "py-2",
              )}
            >
              <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-start sm:justify-start">
                <span className={cn("text-sm font-bold", note ? "text-foreground" : "text-muted-foreground")}>
                  {section.label}
                  {section.repeatCount && section.repeatCount > 1 ? ` ×${section.repeatCount}` : ""}
                </span>
                <DynamicIndicator dynamics={section.dynamics} />
              </div>
              {note ? (
                <p className="text-base font-medium leading-snug text-foreground">{note.content}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No direction for you here. Follow the flow.</p>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <p className="p-4 text-sm text-muted-foreground sm:p-5">
          No specific instructions yet for {role}. Play it as written.
        </p>
      )}
    </Card>
  );
}
