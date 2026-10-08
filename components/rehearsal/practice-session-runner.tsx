"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlayCircle, Clock3, ListMusic, LayoutGrid } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Status } from "@/components/ui/status";
import { RehearsalMode, type SetSongData } from "@/components/rehearsal/rehearsal-mode";
import { startPracticeSession, type PracticeSessionSummary } from "@/lib/actions/practice-sessions";

type Session = {
  id: string;
  name: string;
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED";
  scheduledAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
};

function formatWhen(iso: string | null) {
  if (!iso) return "No date set";
  return new Date(iso).toLocaleString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function PracticeSessionRunner({
  session,
  setId,
  setTitle,
  songs,
  setTeamMembers,
  isLeaderView,
  viewerTeamMemberId,
  initialLiveSetSongId,
  initialLiveSectionId,
  initialSummary,
}: {
  session: Session;
  setId: string;
  setTitle: string;
  songs: SetSongData[];
  setTeamMembers: { teamMemberId: string; role: string }[];
  isLeaderView: boolean;
  viewerTeamMemberId: string | null;
  initialLiveSetSongId: string | null;
  initialLiveSectionId: string | null;
  initialSummary: PracticeSessionSummary;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(session.status);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [summary, setSummary] = useState<PracticeSessionSummary | null>(
    session.status === "COMPLETED" ? initialSummary : null,
  );

  if (status === "COMPLETED") {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Practice Session Complete</CardTitle>
            <CardDescription>{session.name}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-surface-muted p-3">
                <Clock3 className="mx-auto h-4 w-4 text-muted-foreground" aria-hidden />
                <p className="tnum mt-1 text-xl font-extrabold">
                  {summary?.durationMinutes ?? initialSummary.durationMinutes ?? "—"}
                </p>
                <p className="text-xs text-muted-foreground">minutes</p>
              </div>
              <div className="rounded-lg bg-surface-muted p-3">
                <ListMusic className="mx-auto h-4 w-4 text-muted-foreground" aria-hidden />
                <p className="tnum mt-1 text-xl font-extrabold">
                  {summary?.songsPracticed ?? initialSummary.songsPracticed}
                </p>
                <p className="text-xs text-muted-foreground">songs practiced</p>
              </div>
              <div className="rounded-lg bg-surface-muted p-3">
                <LayoutGrid className="mx-auto h-4 w-4 text-muted-foreground" aria-hidden />
                <p className="tnum mt-1 text-xl font-extrabold">
                  {summary?.sectionsCovered ?? initialSummary.sectionsCovered}
                </p>
                <p className="text-xs text-muted-foreground">sections covered</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Your current arrangement remains ready for the next practice session or the Live Set.
            </p>
            <ButtonLink href={`/sets/${setId}/practice`} className="w-full">
              Back to Practice Sessions
            </ButtonLink>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "IN_PROGRESS") {
    return (
      <RehearsalMode
        setId={setId}
        setTitle={setTitle}
        songs={songs}
        setTeamMembers={setTeamMembers}
        isLeaderView={isLeaderView}
        viewerTeamMemberId={viewerTeamMemberId}
        initialLiveSetSongId={initialLiveSetSongId}
        initialLiveSectionId={initialLiveSectionId}
        mode="practice"
        practiceSessionId={session.id}
        onFinished={(finishedSummary) => {
          if (finishedSummary) setSummary(finishedSummary);
          setStatus("COMPLETED");
        }}
      />
    );
  }

  // PLANNED — don't drop straight into Director Mode; show what's about to
  // happen and let the leader choose when to start.
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <p className="text-sm">
        <Link href={`/sets/${setId}/practice`} className="text-muted-foreground hover:text-foreground">
          ← Back to Practice Sessions
        </Link>
      </p>
      <Card>
        <CardHeader>
          <CardTitle>{session.name}</CardTitle>
          <CardDescription>{formatWhen(session.scheduledAt)}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Status tone="muted">Planned</Status>
          {isLeaderView ? (
            <>
              <Button
                loading={starting}
                disabled={starting}
                className="w-full"
                onClick={async () => {
                  setStarting(true);
                  setStartError(null);
                  const result = await startPracticeSession(session.id);
                  setStarting(false);
                  if (!result.ok) {
                    setStartError(result.error);
                    return;
                  }
                  setStatus("IN_PROGRESS");
                  router.refresh();
                }}
              >
                <PlayCircle className="h-4 w-4" aria-hidden /> {starting ? "Starting…" : "Start Practice"}
              </Button>
              {startError && (
                <p role="alert" className="text-sm text-danger">
                  {startError}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Waiting for your worship leader to start practice.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
