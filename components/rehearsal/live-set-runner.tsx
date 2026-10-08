"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlayCircle, CalendarDays, Music2, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Status } from "@/components/ui/status";
import { RehearsalMode, type SetSongData } from "@/components/rehearsal/rehearsal-mode";
import { startLiveSet } from "@/lib/actions/live-set";

type SetInfo = {
  id: string;
  title: string;
  serviceDate: string | null;
  liveMode: "NONE" | "PRACTICE" | "LIVE";
  liveStartedAt: string | null;
  liveEndedAt: string | null;
  songCount: number;
  teamCount: number;
};

function formatDate(iso: string | null) {
  if (!iso) return "No date set";
  return new Date(iso).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

export function LiveSetRunner({
  set,
  songs,
  setTeamMembers,
  isLeaderView,
  viewerTeamMemberId,
  initialLiveSetSongId,
  initialLiveSectionId,
}: {
  set: SetInfo;
  songs: SetSongData[];
  setTeamMembers: { teamMemberId: string; role: string }[];
  isLeaderView: boolean;
  viewerTeamMemberId: string | null;
  initialLiveSetSongId: string | null;
  initialLiveSectionId: string | null;
}) {
  const router = useRouter();
  const [liveMode, setLiveMode] = useState(set.liveMode);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  if (liveMode === "LIVE") {
    return (
      <RehearsalMode
        setId={set.id}
        setTitle={set.title}
        songs={songs}
        setTeamMembers={setTeamMembers}
        isLeaderView={isLeaderView}
        viewerTeamMemberId={viewerTeamMemberId}
        initialLiveSetSongId={initialLiveSetSongId}
        initialLiveSectionId={initialLiveSectionId}
        mode="live"
        onFinished={() => {
          setLiveMode("NONE");
          router.refresh();
        }}
      />
    );
  }

  const completed = !!set.liveEndedAt && liveMode === "NONE";
  const ready = songs.length > 0;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <p className="text-sm">
        <Link href={`/sets/${set.id}`} className="text-muted-foreground hover:text-foreground">
          ← Back to set
        </Link>
      </p>
      <Card>
        <CardHeader>
          <CardTitle>Live Set</CardTitle>
          <CardDescription className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" aria-hidden /> {set.title} · {formatDate(set.serviceDate)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Music2 className="h-4 w-4" aria-hidden /> {set.songCount} song{set.songCount === 1 ? "" : "s"}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" aria-hidden /> {set.teamCount} team member{set.teamCount === 1 ? "" : "s"}
            </span>
          </div>

          <Status tone={completed ? "muted" : ready ? "success" : "warning"}>
            {completed ? "Completed" : ready ? "Ready" : "Add songs first"}
          </Status>

          {isLeaderView ? (
            <>
              <Button
                loading={starting}
                disabled={starting || !ready}
                className="w-full"
                onClick={async () => {
                  setStarting(true);
                  setStartError(null);
                  const result = await startLiveSet(set.id);
                  setStarting(false);
                  if (!result.ok) {
                    setStartError(result.error);
                    return;
                  }
                  setLiveMode("LIVE");
                  router.refresh();
                }}
              >
                <PlayCircle className="h-4 w-4" aria-hidden /> {starting ? "Starting…" : "Start Live Set"}
              </Button>
              {startError && (
                <p role="alert" className="text-sm text-danger">
                  {startError}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {completed
                ? "This service has finished."
                : "Waiting for your worship leader to start the live set."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
