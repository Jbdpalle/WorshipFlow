"use server";

import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/guard";
import { runAction, type ActionResult, type ActionResultData } from "@/lib/actions/action-result";
import { trackEvent } from "@/lib/usability/track";
import { TOUR_TOTAL_STEPS } from "@/lib/demo-tour/steps";

// Many of the actions that advance the tour (a role-note textarea's
// onBlur, a dynamics <select>'s onChange) deliberately don't call
// router.refresh() afterward — that would blow away whatever else the
// user is mid-editing on the page. So the banner can't just trust the
// tourStep it was first rendered with; it polls this instead, the same
// pattern already used for live rehearsal position elsewhere in this app.
export async function getTourState(): Promise<ActionResultData<{ tourStatus: string | null; tourStep: number }>> {
  return runAction(async () => {
    const { user } = await requireUser();
    return { ok: true, data: { tourStatus: user.tourStatus, tourStep: user.tourStep } };
  });
}

export async function startTour(): Promise<ActionResult> {
  return runAction(async () => {
    const { user, team } = await requireUser();
    await prisma.user.update({ where: { id: user.id }, data: { tourStatus: "active", tourStep: 1 } });
    trackEvent(team.id, "demo_started", { userId: user.id });
    return { ok: true };
  });
}

export async function skipTour(): Promise<ActionResult> {
  return runAction(async () => {
    const { user, team } = await requireUser();
    await prisma.user.update({ where: { id: user.id }, data: { tourStatus: "skipped" } });
    trackEvent(team.id, "demo_skipped", { userId: user.id });
    return { ok: true };
  });
}

export async function exitTour(): Promise<ActionResult> {
  return runAction(async () => {
    const { user, team } = await requireUser();
    await prisma.user.update({ where: { id: user.id }, data: { tourStatus: "skipped" } });
    trackEvent(team.id, "demo_exited", { userId: user.id, meta: { atStep: user.tourStep } });
    return { ok: true };
  });
}

export async function restartTour(): Promise<ActionResult> {
  return runAction(async () => {
    const { user, team } = await requireUser();
    await prisma.user.update({ where: { id: user.id }, data: { tourStatus: "active", tourStep: 1 } });
    trackEvent(team.id, "demo_started", { userId: user.id, meta: { restarted: true } });
    return { ok: true };
  });
}

// Called from inside other Server Actions (song/set/rehearsal/transition/
// announce) right after the REAL action succeeds — never from a client
// "Next" button. Only advances if this user has an active tour sitting at
// exactly this step, so an unrelated action can never skip it ahead, and
// it's a no-op for every non-demo user (tourStatus stays null for them).
// Fire-and-forget, same convention as trackEvent: tour bookkeeping must
// never be able to break the real action it's attached to.
export async function advanceTourIfNeeded(userId: string, teamId: string, atStep: number): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { tourStatus: true, tourStep: true },
    });
    if (!user || user.tourStatus !== "active" || user.tourStep !== atStep) return;

    const nextStep = atStep + 1;
    const justCompleted = nextStep > TOUR_TOTAL_STEPS;
    await prisma.user.update({
      where: { id: userId },
      data: { tourStep: justCompleted ? atStep : nextStep, tourStatus: justCompleted ? "completed" : "active" },
    });
    trackEvent(teamId, justCompleted ? "demo_completed" : "demo_step_completed", {
      userId,
      meta: { step: atStep },
    });
  } catch {
    // swallow — see comment above
  }
}
