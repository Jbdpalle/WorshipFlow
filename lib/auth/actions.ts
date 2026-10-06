import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { seedDemoWalkthroughSong } from "@/lib/songs/seed-demo-walkthrough";
import { DEMO_LIMITS } from "@/lib/plans/limits";

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
  // A real signup starts with an empty team — it is going to hold this
  // leader's actual songs and people, not a cluttered mix of their first
  // real entries alongside sample content. Sample content remains
  // available on request (lib/actions/sample-data.ts) for someone who
  // wants to explore with a fuller library before entering their own.
  const { user } = await createUserWithChurch({
    name: input.name,
    email: input.email,
    passwordHash,
    teamName: input.teamName,
  });

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

  const demoExpiresAt = new Date(Date.now() + DEMO_LIMITS.days * 24 * 60 * 60 * 1000);
  await prisma.user.update({ where: { id: user.id }, data: { demoExpiresAt } });

  // Deliberately one song, not the full multi-song sample library — see
  // seed-demo-walkthrough.ts for why.
  await seedDemoWalkthroughSong(team.id);

  return { ...user, demoExpiresAt };
}
