"use server";

import { prisma } from "@/lib/db/prisma";
import { getOptionalUser } from "@/lib/auth/guard";

export async function submitFeedback(input: { type: string; message: string; page?: string }) {
  if (!input.message.trim()) throw new Error("Feedback message is required.");
  const user = await getOptionalUser();

  await prisma.feedback.create({
    data: {
      userId: user?.id ?? null,
      type: input.type,
      message: input.message,
      page: input.page || null,
    },
  });
}
