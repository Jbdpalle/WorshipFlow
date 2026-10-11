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

// Tracks the "RETURN TO PLANNED FLOW" anchor within one song: the section
// index to come back to after the leader detours into a Free Worship
// section. Scoped to one song on purpose — Rehearsal Mode remounts its
// section-level state on every song change (see SongRehearsalPanel's own
// `key`), so a detour anchor spanning multiple songs would need state
// lifted to the parent; this covers the common, in-song case (an
// open-ended bridge/interlude) and is silently reset by a song change,
// not silently wrong.
//
// Called on every goTo(): stashes the position being left the moment the
// leader moves from a planned section into a freeform one (and nothing is
// already stashed), and clears the stash once they arrive back at exactly
// that remembered position — via "Return to Plan" or just by navigating
// there normally. Any other move leaves an existing stash untouched, so
// browsing within the freeform detour doesn't lose the anchor.
export function nextDetourAnchor(
  current: { sectionIndex: number; isFreeform: boolean },
  target: { sectionIndex: number; isFreeform: boolean },
  preDetourSectionIndex: number | null,
): number | null {
  if (!current.isFreeform && target.isFreeform && preDetourSectionIndex === null) {
    return current.sectionIndex;
  }
  if (preDetourSectionIndex !== null && target.sectionIndex === preDetourSectionIndex) {
    return null;
  }
  return preDetourSectionIndex;
}
