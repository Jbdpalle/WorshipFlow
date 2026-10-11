"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, PlayCircle } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { startDefaultPractice } from "@/lib/actions/practice-sessions";

// The ordinary Sunday path in one tap: starts (or resumes) the set's practice
// and drops the leader straight into it. Anyone else joins the practice in
// progress, or sees the session list when nothing is running yet. Extra
// sessions for camps and events are still created from the list page.
export function StartPracticeButton({
  setId,
  isLeader,
  practiceInProgress,
  activeSessionId,
}: {
  setId: string;
  isLeader: boolean;
  practiceInProgress: boolean;
  activeSessionId: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isLeader) {
    return practiceInProgress && activeSessionId ? (
      <ButtonLink href={`/sets/${setId}/practice/${activeSessionId}`}>
        <PlayCircle className="h-4 w-4" aria-hidden /> Join practice
      </ButtonLink>
    ) : (
      <ButtonLink href={`/sets/${setId}/practice`} variant="outline">
        <ClipboardList className="h-4 w-4" aria-hidden /> Practice
      </ButtonLink>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        loading={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          const result = await startDefaultPractice(setId);
          if (!result.ok) {
            setBusy(false);
            setError(result.error);
            return;
          }
          router.push(`/sets/${setId}/practice/${result.data.id}`);
        }}
      >
        <PlayCircle className="h-4 w-4" aria-hidden /> {practiceInProgress ? "Resume practice" : "Start practice"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
