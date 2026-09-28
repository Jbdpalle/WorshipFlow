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

export async function registerUser(input: z.infer<typeof registerSchema>) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new Error("An account with that email already exists.");
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      ownedTeams: {
        create: {
          name: input.teamName,
          members: {
            create: {
              name: input.name,
              role: "Worship Leader",
            },
          },
        },
      },
    },
    include: { ownedTeams: { include: { members: true } } },
  });

  const team = user.ownedTeams[0];
  await prisma.teamMember.updateMany({
    where: { teamId: team.id, role: "Worship Leader" },
    data: { userId: user.id },
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

  const user = await prisma.user.create({
    data: {
      name: "Guest Worship Leader",
      email,
      passwordHash,
      isDemo: true,
      ownedTeams: {
        create: {
          name: "Demo Worship Team",
          members: {
            create: { name: "Guest Worship Leader", role: "Worship Leader" },
          },
        },
      },
    },
    include: { ownedTeams: { include: { members: true } } },
  });

  const team = user.ownedTeams[0];
  await prisma.teamMember.updateMany({
    where: { teamId: team.id, role: "Worship Leader" },
    data: { userId: user.id },
  });

  await seedDemoDataForTeam(team.id);

  return user;
}
