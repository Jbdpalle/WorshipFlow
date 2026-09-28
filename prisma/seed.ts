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
  const user = await prisma.user.create({
    data: {
      name: "Joel Martinez",
      email,
      passwordHash,
      ownedTeams: {
        create: {
          name: "Grace Community Worship",
          members: { create: { name: "Joel Martinez", role: "Worship Leader" } },
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
