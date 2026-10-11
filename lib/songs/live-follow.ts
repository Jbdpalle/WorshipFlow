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

export type LiveCursor = { setSongId: string | null; sectionId: string | null };

// Decides whether an incoming leader move should carry this viewer along.
// A viewer who is sitting on the last confirmed live position is "following"
// and moves with it, so a musician never has to tap Next. A viewer who has
// deliberately browsed to another section/song is left where they are —
// they get a "jump back to live" prompt instead of being yanked mid-read.
// Leader-role screens always follow: they are, or are shadowing, the
// controller. Nothing here is time-based; position only ever changes on an
// explicit controller write.
export function shouldAutoFollow(
  isLeaderView: boolean,
  viewer: LiveCursor,
  previousLive: LiveCursor | null,
): boolean {
  if (isLeaderView) return true;
  if (!previousLive || !previousLive.setSongId) return true;
  if (viewer.setSongId !== previousLive.setSongId) return false;
  if (previousLive.sectionId === null) return true;
  return viewer.sectionId === previousLive.sectionId;
}

// Which controller write wins when a client's view of the position is out of
// date (two controllers, a retried request, a slow tab). `baseUpdatedAt` is
// the position version the client last saw; omitted means "don't check".
export function isStalePositionWrite(
  baseUpdatedAt: string | null | undefined,
  currentUpdatedAt: Date | null,
): boolean {
  if (baseUpdatedAt === undefined) return false;
  const current = currentUpdatedAt ? currentUpdatedAt.getTime() : null;
  const base = baseUpdatedAt === null ? null : new Date(baseUpdatedAt).getTime();
  return current !== base;
}
