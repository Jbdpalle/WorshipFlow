import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Status } from "@/components/ui/status";
import type { MemberStatus } from "@/lib/dashboard/data";

// "What is my part?" for a musician: their role for the next service and
// whether anything changed, with one way into My Part.
export function MemberStatusCard({ status }: { status: MemberStatus | null }) {
  let body;
  let showAction = false;

  if (!status) {
    body = (
      <p className="text-sm text-muted-foreground">
        No roster record is linked to your account yet. Ask your worship leader to connect it.
      </p>
    );
  } else if (!status.hasAssignmentForNextSunday) {
    body = <p className="text-sm text-muted-foreground">No part is assigned to you for this service yet.</p>;
  } else {
    showAction = true;
    body = (
      <div className="space-y-3">
        <p className="text-lg font-bold text-foreground">{status.roleLabel}</p>
        {status.isVocalist ? (
          status.partReady ? (
            <Status tone="success">Your part is ready</Status>
          ) : (
            <Status tone="warning">Not rehearsed yet</Status>
          )
        ) : status.changedSongCount > 0 ? (
          <Status tone="info">
            {status.changedSongCount} song change{status.changedSongCount === 1 ? "" : "s"} since
            last rehearsal
          </Status>
        ) : (
          <Status tone="success">No changes since last rehearsal</Status>
        )}
      </div>
    );
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="py-3">
        <CardTitle className="text-base">Your part</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-4">
        {body}
        {showAction && (
          <ButtonLink href="/my-part" className="self-start" variant="outline">View my part</ButtonLink>
        )}
      </CardContent>
    </Card>
  );
}
