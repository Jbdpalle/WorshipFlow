import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle } from "lucide-react";
import type { MemberStatus } from "@/lib/dashboard/data";

export function MemberStatusCard({ status }: { status: MemberStatus | null }) {
  if (!status) {
    return (
      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your Status</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          No roster record linked to your account yet — ask your worship leader to connect it.
        </p>
      </section>
    );
  }

  if (!status.hasAssignmentForNextSunday) {
    return (
      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your Status</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          No part assigned to you for Sunday yet.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your Status</h2>
      <p className="mt-2 text-sm font-medium text-foreground">{status.roleLabel}</p>

      {status.isVocalist ? (
        <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          {status.partReady ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-success" aria-hidden /> Your part is ready
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 text-accent" aria-hidden /> Your part hasn&apos;t been rehearsed yet
            </>
          )}
        </p>
      ) : status.changedSongCount > 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">
          {status.changedSongCount} song change{status.changedSongCount === 1 ? "" : "s"} since last rehearsal
        </p>
      ) : (
        <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-success" aria-hidden /> No changes since last rehearsal
        </p>
      )}

      <Link href="/my-part" className="mt-3 inline-block">
        <Button size="sm" variant="secondary">
          View My Part
        </Button>
      </Link>
    </section>
  );
}
