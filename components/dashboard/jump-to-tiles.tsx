import { CircleUser, Library, ListMusic, Radio, UserPlus } from "lucide-react";
import { ActionTile } from "@/components/ui/action-tile";
import type { DashboardSet } from "@/lib/dashboard/data";

// "Jump to": one tap to what people do most. Every detail line is real data
// from the dashboard query; nothing is shown that we do not have.
export function JumpToTiles({
  next,
  isLeaderView,
  uninvitedMemberCount,
}: {
  next: DashboardSet | null;
  isLeaderView: boolean;
  uninvitedMemberCount: number;
}) {
  return (
    <nav aria-label="Jump to" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
      <ActionTile
        href={next ? `/sets/${next.id}` : "/sets"}
        icon={ListMusic}
        stage="plan"
        label={next ? "Open next set" : "Plan a service"}
        detail={next?.title}
      />
      {next && (
        <ActionTile
          href={`/rehearsal/${next.id}`}
          icon={Radio}
          stage="rehearse"
          label="Rehearse"
          detail={`${next.songCount} song${next.songCount === 1 ? "" : "s"}`}
        />
      )}
      <ActionTile href="/my-part" icon={CircleUser} stage="mypart" label="My part" />
      {isLeaderView && (
        <ActionTile
          href="/team"
          icon={UserPlus}
          stage="assign"
          label="Invite team"
          detail={uninvitedMemberCount > 0 ? `${uninvitedMemberCount} without a login` : undefined}
        />
      )}
      <ActionTile href="/songs" icon={Library} stage="arrange" label="Song library" />
    </nav>
  );
}
