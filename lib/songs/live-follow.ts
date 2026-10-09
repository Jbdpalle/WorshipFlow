// Whether a viewer's current section matches the last confirmed live
// position — the leader/MD is always "following" (they ARE the position);
// a non-leader is following whenever they haven't browsed away, or when no
// live position has been established yet (nothing to diverge from).
export function isFollowingLivePosition(
  isLeaderView: boolean,
  currentSectionId: string | null | undefined,
  lastKnownLiveSectionId: string | null,
): boolean {
  if (isLeaderView) return true;
  if (lastKnownLiveSectionId === null) return true;
  return currentSectionId === lastKnownLiveSectionId;
}
