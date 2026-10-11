import { Compass } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SetNotes } from "@/components/setlist/set-notes";
import { SetExaltation } from "@/components/setlist/set-exaltation";

// The one place a leader describes the whole service: why these songs sit
// together, how the set should move, how songs hand off to each other, and
// how it ends. It is the existing WorshipSet.notes field ("Leader's Note")
// and WorshipSet.exaltation, presented as the set's primary vision instead
// of two unrelated cards — no new model. Individual songs never need their
// own vision for the set to be ready; a short per-song "role in the set"
// line is available (and optional) on each setlist row.
export function SetVision({
  setId,
  notes,
  exaltation,
  isLeader,
}: {
  setId: string;
  notes: string;
  exaltation: string;
  isLeader: boolean;
}) {
  return (
    <Card className="p-4">
      <h2 className="flex items-center gap-1.5 text-base font-semibold">
        <Compass className="h-4 w-4 text-musical" aria-hidden /> Set Vision
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Why these songs, together? How should the set move, and how does it end?
      </p>
      <div className="mt-3">
        <SetNotes
          setId={setId}
          initialNotes={notes}
          isLeader={isLeader}
          rows={4}
          placeholder={
            "Purpose: remind us we're held by grace.\nFlow: awe → surrender → declaration.\nHandoff: let the last chord ring, leader prays, then the offering."
          }
          emptyText="The leader hasn't described this set's vision yet."
        />
      </div>
      {(isLeader || exaltation.trim()) && (
        <details className="mt-3 rounded-lg bg-surface-muted p-3" open={!isLeader && !!exaltation.trim()}>
          <summary className="tap-target flex cursor-pointer items-center text-sm font-semibold">
            Opening / Exaltation{exaltation.trim() ? " ✓" : " (optional)"}
          </summary>
          <div className="mt-2">
            <SetExaltation setId={setId} initialExaltation={exaltation} isLeader={isLeader} />
          </div>
        </details>
      )}
    </Card>
  );
}
