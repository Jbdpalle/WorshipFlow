import { prisma } from "@/lib/db/prisma";

// Fixed vocabulary — keep this list short and meaningful, not exhaustive.
// A lightweight workflow-event log, not an analytics platform: no page
// views, no click tracking, nothing beyond what a product person would
// actually read to answer "where do people get stuck."
export type UsabilityEventName =
  | "set_created"
  | "song_added_to_set"
  | "song_library_content_reused"
  | "song_content_manually_added"
  | "song_arrangement_started"
  | "team_member_invited"
  | "invite_accepted"
  | "my_part_opened"
  | "rehearsal_started"
  | "transition_created"
  | "director_mode_started"
  | "director_announce_used"
  | "feedback_submitted";

// Fire-and-forget by design: usability tracking must never be able to
// break or slow down the real action it's attached to. Errors are
// swallowed, the same pattern already used for the service worker
// registration and PDF-import workarounds in this codebase.
export function trackEvent(
  teamId: string,
  event: UsabilityEventName,
  opts?: { userId?: string | null; entityId?: string | null; meta?: Record<string, unknown> },
): void {
  prisma.usabilityEvent
    .create({
      data: {
        teamId,
        event,
        userId: opts?.userId ?? null,
        entityId: opts?.entityId ?? null,
        meta: opts?.meta ? JSON.stringify(opts.meta) : null,
      },
    })
    .catch(() => {});
}
