"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/guard";
import { ensurePrimaryTeamMemberRole } from "@/lib/songs/team-member-roles";

export async function addTeamMember(input: {
  name: string;
  role: string;
  instrument?: string;
  bio?: string;
}) {
  const { team } = await requireUser();
  const member = await prisma.teamMember.create({
    data: {
      teamId: team.id,
      name: input.name,
      role: input.role,
      instrument: input.instrument || null,
      bio: input.bio || null,
    },
  });
  await ensurePrimaryTeamMemberRole(prisma, member.id, input.role);
  revalidatePath("/team");
}

export async function updateTeamMember(
  memberId: string,
  input: Partial<{ name: string; role: string; instrument: string; bio: string }>,
) {
  const { team } = await requireUser();
  const member = await prisma.teamMember.findUnique({ where: { id: memberId } });
  if (!member || member.teamId !== team.id) throw new Error("Not found.");
  await prisma.teamMember.update({ where: { id: memberId }, data: input });
  if (input.role) await ensurePrimaryTeamMemberRole(prisma, memberId, input.role);
  revalidatePath("/team");
}

export async function removeTeamMember(memberId: string) {
  const { team } = await requireUser();
  const member = await prisma.teamMember.findUnique({ where: { id: memberId } });
  if (!member || member.teamId !== team.id) throw new Error("Not found.");
  await prisma.teamMember.delete({ where: { id: memberId } });
  revalidatePath("/team");
}
