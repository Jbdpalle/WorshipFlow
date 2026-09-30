"use server";

import { prisma } from "@/lib/db/prisma";
import { getOptionalUser } from "@/lib/auth/guard";
import { runAction, type ActionResult } from "@/lib/actions/action-result";

export async function submitFeedback(input: {
  type: string;
  message: string;
  page?: string;
}): Promise<ActionResult> {
  return runAction(async () => {
    if (!input.message.trim()) return { ok: false, error: "Feedback message is required." };
    const user = await getOptionalUser();

    await prisma.feedback.create({
      data: {
        userId: user?.id ?? null,
        type: input.type,
        message: input.message,
        page: input.page || null,
      },
    });
    return { ok: true };
  });
}
