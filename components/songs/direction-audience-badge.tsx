import { Lock, Users, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import type { UpcomingRosterRow } from "@/lib/songs/direction-audience";

// Always-visible — never hidden behind an expand toggle — so a leader sees
// exactly who a direction reaches the instant it's saved, without having to
// open My Part and pick a musician to find out. Two independent facts:
// (1) who it's SCOPED to (visibility/assignee, set when writing it) and
// (2) who it will ACTUALLY reach right now (resolved against upcoming
// services' real rosters) — these can differ, and that gap is the real
// root cause of directions "disappearing" (see lib/songs/direction-audience.ts).
export function DirectionAudienceBadge({
  visibility,
  assigneeName,
  role,
  matches,
}: {
  visibility: "TEAM" | "ROLE" | "PERSON";
  assigneeName?: string;
  role: string;
  matches: UpcomingRosterRow[];
}) {
  const scopeLabel =
    visibility === "PERSON"
      ? `${assigneeName ?? "One person"} only`
      : visibility === "ROLE"
        ? `${role} only`
        : "Everyone";

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge variant={visibility === "PERSON" ? "musical" : "outline"} className="gap-1">
        {visibility === "PERSON" ? <Lock className="h-3 w-3" aria-hidden /> : <Users className="h-3 w-3" aria-hidden />}
        {scopeLabel}
      </Badge>
      {matches.length > 0 ? (
        <Tooltip content={matches.map((m) => `${m.memberName} — ${m.setTitle}`).join(", ")}>
          <Badge variant="success" className="gap-1">
            Visible to {matches.map((m) => m.memberName).join(", ")}
          </Badge>
        </Tooltip>
      ) : (
        <Tooltip content="No one currently rostered under this exact role for an upcoming service — add them to the Worship Team for that role, and this direction will appear in their My Part automatically.">
          <Badge variant="warning" className="gap-1">
            <AlertTriangle className="h-3 w-3" aria-hidden /> Not matched to anyone upcoming
          </Badge>
        </Tooltip>
      )}
    </div>
  );
}
