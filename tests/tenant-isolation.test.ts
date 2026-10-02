import { describe, it, expect, afterEach } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { registerUser } from "@/lib/auth/actions";
import { updateSong } from "@/lib/actions/songs";
import { createTestTeam, loginAs, cleanupTeam } from "./helpers";

describe("tenant isolation", () => {
  const cleanup: { teamId: string; churchId: string }[] = [];
  afterEach(async () => {
    while (cleanup.length) {
      const c = cleanup.pop()!;
      await cleanupTeam(c.teamId, c.churchId);
    }
  });

  it("registerUser gives two separate signups two separate, isolated teams", async () => {
    const stamp = Date.now();
    const userA = await registerUser({
      name: "Tenant A",
      email: `tenant-a-${stamp}@test.invalid`,
      password: "TenantAPass123!",
      teamName: `Tenant A Team ${stamp}`,
    });
    const userB = await registerUser({
      name: "Tenant B",
      email: `tenant-b-${stamp}@test.invalid`,
      password: "TenantBPass123!",
      teamName: `Tenant B Team ${stamp}`,
    });

    const teamA = await prisma.team.findFirst({ where: { ownerId: userA.id } });
    const teamB = await prisma.team.findFirst({ where: { ownerId: userB.id } });

    expect(teamA).not.toBeNull();
    expect(teamB).not.toBeNull();
    expect(teamA!.id).not.toBe(teamB!.id);
    expect(teamA!.churchId).not.toBe(teamB!.churchId);

    // cleanup
    const churchA = await prisma.church.findFirst({ where: { ownerId: userA.id } });
    const churchB = await prisma.church.findFirst({ where: { ownerId: userB.id } });
    if (churchA) cleanup.push({ teamId: teamA!.id, churchId: churchA.id });
    if (churchB) cleanup.push({ teamId: teamB!.id, churchId: churchB.id });
  });

  it("rejects an update to a song that belongs to a different team, even with a valid session", async () => {
    const owner = await createTestTeam("song-owner");
    const attacker = await createTestTeam("song-attacker");
    cleanup.push({ teamId: owner.team.id, churchId: owner.church.id });
    cleanup.push({ teamId: attacker.team.id, churchId: attacker.church.id });

    const song = await prisma.song.create({
      data: { teamId: owner.team.id, title: "Owner's Song" },
    });

    // Log in as the ATTACKER (a real, valid session on a different team),
    // then try to mutate the OWNER's song by forging its ID — this is
    // exactly the "hidden button vs. real enforcement" scenario SEC-04/SEC-03
    // call out: proving the server rejects it, not just that the UI hides it.
    await loginAs(attacker.user.id);
    const result = await updateSong(song.id, { title: "Hijacked Title" });

    expect(result.ok).toBe(false);

    const unchanged = await prisma.song.findUnique({ where: { id: song.id } });
    expect(unchanged?.title).toBe("Owner's Song");
  });
});
