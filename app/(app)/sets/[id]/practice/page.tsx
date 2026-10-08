import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser, isLeaderRole } from "@/lib/auth/guard";
import { prisma } from "@/lib/db/prisma";
import { SectionHeader } from "@/components/ui/section-header";
import { Card, CardContent } from "@/components/ui/card";
import { Status, type StatusTone } from "@/components/ui/status";
import { EmptyState } from "@/components/ui/empty-state";
import { TextLink } from "@/components/ui/text-link";
import { ClipboardList, ChevronRight } from "lucide-react";
import { AddPracticeSessionDialog } from "@/components/rehearsal/add-practice-session-dialog";

function statusDisplay(status: "PLANNED" | "IN_PROGRESS" | "COMPLETED"): { label: string; tone: StatusTone } {
  if (status === "IN_PROGRESS") return { label: "In progress", tone: "info" };
  if (status === "COMPLETED") return { label: "Completed", tone: "muted" };
  return { label: "Planned", tone: "muted" };
}

function formatWhen(date: Date | null) {
  if (!date) return "No date set";
  return date.toLocaleString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function PracticeSessionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { team, membershipRole } = await requireUser();
  const isLeader = isLeaderRole(membershipRole);

  const set = await prisma.worshipSet.findUnique({
    where: { id },
    select: { id: true, teamId: true, title: true },
  });
  if (!set || set.teamId !== team.id) notFound();

  const sessions = await prisma.practiceSession.findMany({
    where: { setId: id },
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }],
  });

  const active = sessions.filter((s) => s.status !== "COMPLETED");
  const past = sessions
    .filter((s) => s.status === "COMPLETED")
    .sort((a, b) => (b.finishedAt?.getTime() ?? 0) - (a.finishedAt?.getTime() ?? 0));

  const nextNumber = sessions.length + 1;

  return (
    <div className="space-y-6">
      <SectionHeader
        level={1} icon={ClipboardList} stage="rehearse"
        label={set.title}
        title="Practice Sessions"
        description="Prepare this set through one or more practice sessions."
        action={isLeader && sessions.length > 0 ? <AddPracticeSessionDialog setId={id} nextNumber={nextNumber} /> : undefined}
      />

      <p className="text-sm">
        <TextLink href={`/sets/${id}`} className="inline-flex">
          ← Back to set
        </TextLink>
      </p>

      {sessions.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No practice sessions yet"
          description="Add one to start preparing this set — a quick Sunday run-through, or the first of several leading up to an event."
          action={isLeader ? <AddPracticeSessionDialog setId={id} nextNumber={1} /> : undefined}
        />
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div className="space-y-2">
              <h2 className="label-caps">Upcoming / Planned</h2>
              <div className="space-y-2">
                {active.map((s) => {
                  const { label, tone } = statusDisplay(s.status);
                  return (
                    <Link
                      key={s.id}
                      href={`/sets/${id}/practice/${s.id}`}
                      className="tap-target flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 hover:bg-surface-muted"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-foreground">{s.name}</p>
                        <p className="text-sm text-muted-foreground">{formatWhen(s.scheduledAt)}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Status tone={tone}>{label}</Status>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/50" aria-hidden />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div className="space-y-2">
              <h2 className="label-caps">Past Practice Sessions</h2>
              <Card>
                <CardContent className="divide-y divide-border p-0">
                  {past.map((s) => (
                    <Link
                      key={s.id}
                      href={`/sets/${id}/practice/${s.id}`}
                      className="tap-target flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-muted"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground">{s.name}</p>
                        <p className="text-sm text-muted-foreground">{formatWhen(s.finishedAt ?? s.scheduledAt)}</p>
                      </div>
                      <Status tone="muted">Completed</Status>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
