"use server";

import { prisma } from "@/lib/db/prisma";
import { getOptionalUser } from "@/lib/auth/guard";
import { runAction, type ActionResult } from "@/lib/actions/action-result";
import { trackEvent } from "@/lib/usability/track";

export async function submitFeedback(input: {
  type: string;
  message: string;
  page?: string;
  rating?: number;
}): Promise<ActionResult> {
  return runAction(async () => {
    if (!input.message.trim() && !input.rating) {
      return { ok: false, error: "Add a rating or a message first." };
    }
    const user = await getOptionalUser();

    const feedback = await prisma.feedback.create({
      data: {
        userId: user?.id ?? null,
        type: input.type,
        message: input.message,
        page: input.page || null,
        rating: input.rating ?? null,
      },
    });

    if (user) {
      const membership = await prisma.membership.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
        include: { church: { include: { teams: true } } },
      });
      const teamId = membership?.church.teams[0]?.id;
      if (teamId) {
        trackEvent(teamId, "feedback_submitted", {
          userId: user.id,
          entityId: feedback.id,
          meta: { rating: input.rating ?? null },
        });
      }
    }

    return { ok: true };
  });
}
