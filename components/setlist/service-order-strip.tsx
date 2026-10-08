import Link from "next/link";
import { CheckCircle2, AlertCircle, Circle } from "lucide-react";
import type { SongFlowStatus } from "@/lib/songs/readiness";
import { cn } from "@/lib/utils/cn";

export type ServiceOrderSong = {
  id: string;
  order: number;
  overrideKey: string | null;
  song: { id: string; title: string; key: string | null };
  songFlowStatus: SongFlowStatus;
  transitionFrom: { type: string; direction: string | null } | null;
};

const FLOW_ICON: Record<SongFlowStatus, { icon: typeof CheckCircle2; className: string }> = {
  ready: { icon: CheckCircle2, className: "text-success" },
  needs_work: { icon: AlertCircle, className: "text-warning" },
  not_started: { icon: Circle, className: "text-muted-foreground" },
};

const TRANSITION_LABELS: Record<string, string> = {
  DIRECT: "Direct",
  INSTRUMENTAL: "Instrumental",
  PAD: "Pad",
  SPOKEN: "Spoken",
  PRAYER: "Prayer",
  FREE_WORSHIP: "Free Worship",
  COUNT_IN: "Count-in",
  PAUSE: "Pause",
  CUSTOM: "Custom",
};

// A compact, scannable "service order at a glance" strip — jump straight
// into any song's Song Flow without losing the surrounding service context
// (the full Setlist board below keeps all the detailed editing controls).
export function ServiceOrderStrip({ songs }: { songs: ServiceOrderSong[] }) {
  if (songs.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {songs.map((s, i) => {
        const flow = FLOW_ICON[s.songFlowStatus];
        const FlowIcon = flow.icon;
        return (
          <div key={s.id} className="flex shrink-0 items-center gap-2">
            <Link
              href={`/songs/${s.song.id}`}
              className={cn(
                "flex w-36 shrink-0 flex-col gap-1 rounded-xl border border-border bg-surface p-2.5 text-left transition-colors hover:border-primary/50 hover:bg-surface-muted",
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-mono text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <FlowIcon className={cn("h-3.5 w-3.5 shrink-0", flow.className)} aria-hidden />
              </div>
              <p className="truncate text-sm font-semibold text-foreground">{s.song.title}</p>
              <p className="text-xs text-muted-foreground">
                {s.overrideKey ?? s.song.key ?? "No key"}
              </p>
            </Link>
            {i < songs.length - 1 && (
              <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {s.transitionFrom ? TRANSITION_LABELS[s.transitionFrom.type] ?? s.transitionFrom.type : "→"}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
