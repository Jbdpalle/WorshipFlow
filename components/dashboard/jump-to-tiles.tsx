import { CircleUser, Library, ClipboardList, Timer, UserPlus } from "lucide-react";
import { ActionTile } from "@/components/ui/action-tile";

// "Jump to": shortcuts to destinations the Next Service card does not already
// cover. Quiet tiles, so the card's primary button stays the loudest thing on
// the page. The Invite tile only appears when someone still has no login;
// otherwise the Metronome fills that spot.
export function JumpToTiles({
  isLeaderView,
  uninvitedMemberCount,
}: {
  isLeaderView: boolean;
  uninvitedMemberCount: number;
}) {
  const showInvite = isLeaderView && uninvitedMemberCount > 0;
  return (
    <nav aria-label="Jump to" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <ActionTile variant="quiet" href="/my-part" icon={CircleUser} stage="mypart" label="My part" detail="What I play" />
      <ActionTile variant="quiet" href="/roster" icon={ClipboardList} stage="assign" label="Roster" detail="Who's serving" />
      <ActionTile variant="quiet" href="/songs" icon={Library} stage="arrange" label="Song library" detail="All your songs" />
      {showInvite ? (
        <ActionTile
          variant="quiet"
          href="/team"
          icon={UserPlus}
          stage="assign"
          label="Invite team"
          detail={`${uninvitedMemberCount} without a login`}
        />
      ) : (
        <ActionTile variant="quiet" href="/metronome" icon={Timer} stage="rehearse" label="Metronome" detail="Set a tempo" />
      )}
    </nav>
  );
}
