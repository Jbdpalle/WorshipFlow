import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedDemoDataForTeam } from "../lib/songs/seed-demo-data";

const prisma = new PrismaClient();

async function main() {
  const email = "leader@worshipflow.app";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Seed user already exists: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash("worshipflow", 10);

  const { user, team } = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name: "Joel Martinez", email, passwordHash },
    });

    const church = await tx.church.create({
      data: { name: "Grace Community Worship", ownerId: user.id },
    });

    await tx.membership.create({
      data: { userId: user.id, churchId: church.id, role: "OWNER" },
    });

    const team = await tx.team.create({
      data: { name: "Grace Community Worship", ownerId: user.id, churchId: church.id },
    });

    const member = await tx.teamMember.create({
      data: { teamId: team.id, userId: user.id, name: "Joel Martinez", role: "Worship Leader" },
    });

    await tx.teamMemberRole.create({
      data: { teamMemberId: member.id, role: "Worship Leader" },
    });

    return { user, team };
  });

  await seedDemoDataForTeam(team.id);

  console.log(`Seeded demo team for ${email} (password: worshipflow)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
