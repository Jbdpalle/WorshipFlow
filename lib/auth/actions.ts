import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { seedDemoDataForTeam } from "@/lib/songs/seed-demo-data";

export const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  teamName: z.string().min(1, "Team name is required"),
});

// Creates the User plus its starting Church/Membership/Team/TeamMember
// graph in one transaction: a fresh account is always the OWNER of its
// own church, with one team and one member row (itself) to start from.
async function createUserWithChurch(input: { name: string; email: string; passwordHash: string; teamName: string; isDemo?: boolean }) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: input.passwordHash,
        isDemo: input.isDemo ?? false,
      },
    });

    const church = await tx.church.create({
      data: { name: input.teamName, ownerId: user.id },
    });

    await tx.membership.create({
      data: { userId: user.id, churchId: church.id, role: "OWNER" },
    });

    const team = await tx.team.create({
      data: { name: input.teamName, ownerId: user.id, churchId: church.id },
    });

    const member = await tx.teamMember.create({
      data: { teamId: team.id, userId: user.id, name: input.name, role: "Worship Leader" },
    });

    await tx.teamMemberRole.create({
      data: { teamMemberId: member.id, role: "Worship Leader" },
    });

    return { user, team };
  });
}

export async function registerUser(input: z.infer<typeof registerSchema>) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new Error("An account with that email already exists.");
  }

  const passwordHash = await hashPassword(input.password);
  const { user, team } = await createUserWithChurch({
    name: input.name,
    email: input.email,
    passwordHash,
    teamName: input.teamName,
  });

  await seedDemoDataForTeam(team.id);

  return user;
}

let demoCounter = 0;

export async function createDemoAccount() {
  demoCounter += 1;
  const suffix = `${Date.now()}${demoCounter}`;
  const email = `demo-${suffix}@worshipflow.app`;
  const passwordHash = await hashPassword(`demo-${suffix}`);

  const { user, team } = await createUserWithChurch({
    name: "Guest Worship Leader",
    email,
    passwordHash,
    teamName: "Demo Worship Team",
    isDemo: true,
  });

  await seedDemoDataForTeam(team.id);

  return user;
}
