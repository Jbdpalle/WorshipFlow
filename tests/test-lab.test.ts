import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createInvite } from "@/lib/actions/invites";
import { enterTestLab, leaveTestLab, createTestSets, resetTestLab } from "@/lib/actions/test-lab";
import { findTestLabChurch, TEST_LAB_CHURCH_NAME } from "@/lib/auth/test-lab";
import { getRehearsalNotesForSet } from "@/lib/actions/rehearsal";
import { createTestTeam, loginAs, cleanupTeam } from "./helpers";

const OWNER_EMAILS = ["leader@worshipflow.app", "jbdpalle@gmail.com"];

// These two emails are real accounts in production. The tests only ever run
// against a local database, and refuse to touch an account that already exists.
async function makeOwnerAccount(email: string) {
  if (await prisma.user.findUnique({ where: { email } })) {
    throw new Error(`Refusing to run: ${email} already exists in this database.`);
  }
  const user = await prisma.user.create({ data: { name: email, email, passwordHash: await hashPassword("x-not-used") } });
  const church = await prisma.church.create({ data: { name: `Home of ${email}`, ownerId: user.id } });
  await prisma.membership.create({ data: { userId: user.id, churchId: church.id, role: "OWNER" } });
  const team = await prisma.team.create({ data: { name: "Home team", ownerId: user.id, churchId: church.id } });
  return { user, church, team };
}

describe("Test Lab (only the two owner accounts)", () => {
  let a: Awaited<ReturnType<typeof makeOwnerAccount>>;
  let b: Awaited<ReturnType<typeof makeOwnerAccount>>;
  const extra: { teamId: string; churchId: string }[] = [];

  beforeAll(async () => {
    expect(await findTestLabChurch()).toBeNull(); // a clean database
    a = await makeOwnerAccount(OWNER_EMAILS[0]);
    b = await makeOwnerAccount(OWNER_EMAILS[1]);
  });

  afterAll(async () => {
    const lab = await findTestLabChurch();
    if (lab) await prisma.church.delete({ where: { id: lab.id } });
    for (const x of [a, b]) {
      if (!x) continue;
      await prisma.user.update({ where: { id: x.user.id }, data: { currentChurchId: null } }).catch(() => {});
      await prisma.church.delete({ where: { id: x.church.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: x.user.id } }).catch(() => {});
    }
    for (const c of extra) await cleanupTeam(c.teamId, c.churchId);
  });

  it("an ordinary user (even a church owner) cannot enter, create, or reset anything", async () => {
    const stranger = await createTestTeam("lab-stranger", "OWNER");
    extra.push({ teamId: stranger.team.id, churchId: stranger.church.id });
    await loginAs(stranger.user.id);

    expect((await enterTestLab()).ok).toBe(false);
    expect((await createTestSets(1)).ok).toBe(false);
    expect((await resetTestLab()).ok).toBe(false);
    expect((await leaveTestLab()).ok).toBe(false);
    expect(await findTestLabChurch()).toBeNull();
    expect(await prisma.membership.count({ where: { userId: stranger.user.id } })).toBe(1);
  });

  it("creating test sets before entering the lab is refused (and writes nothing to the real church)", async () => {
    await loginAs(a.user.id);
    expect((await createTestSets(1)).ok).toBe(false);
    expect(await prisma.worshipSet.count({ where: { teamId: a.team.id } })).toBe(0);
  });

  it("owner A enters: a separate lab church is created and becomes their current church", async () => {
    await loginAs(a.user.id);
    expect((await enterTestLab()).ok).toBe(true);
    const lab = await findTestLabChurch();
    expect(lab?.name).toBe(TEST_LAB_CHURCH_NAME);
    expect(lab?.id).not.toBe(a.church.id);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: a.user.id } })).currentChurchId).toBe(lab!.id);
  });

  it("quick test sets: roster-only band, 4 songs with arrangements, vision, set team — all in the lab team", async () => {
    await loginAs(a.user.id);
    const lab = (await findTestLabChurch())!;
    const labTeam = lab.teams[0];
    const made = await createTestSets(2);
    expect(made.ok && made.data.ids).toHaveLength(2);

    const sets = await prisma.worshipSet.findMany({
      where: { teamId: labTeam.id },
      include: { songs: { include: { song: { include: { sections: { include: { roleNotes: true } } } } } }, teamMembers: true },
    });
    expect(sets).toHaveLength(2);
    for (const s of sets) {
      expect(s.songs).toHaveLength(4);
      expect(s.notes).toBeTruthy();
      expect(s.teamMembers.length).toBe(9);
      for (const ss of s.songs) {
        expect(ss.song.sections.length).toBeGreaterThanOrEqual(8);
        expect(ss.song.sections.some((sec) => sec.roleNotes.some((n) => n.role === "Bass"))).toBe(true);
      }
    }
    // Songs and roster are shared across the lab's sets, not duplicated per set.
    expect(await prisma.song.count({ where: { teamId: labTeam.id } })).toBe(4);
    const roster = await prisma.teamMember.findMany({ where: { teamId: labTeam.id } });
    expect(roster).toHaveLength(9);
    expect(roster.every((m) => m.userId === null)).toBe(true); // no login, no invite
    expect(await prisma.invite.count({ where: { teamId: labTeam.id } })).toBe(0);
  });

  it("the real church is untouched by anything in the lab", async () => {
    expect(await prisma.worshipSet.count({ where: { teamId: a.team.id } })).toBe(0);
    expect(await prisma.song.count({ where: { teamId: a.team.id } })).toBe(0);
    expect(await prisma.teamMember.count({ where: { teamId: a.team.id } })).toBe(0);
  });

  it("owner B shares the same lab (one lab, not one each)", async () => {
    await loginAs(b.user.id);
    expect((await enterTestLab()).ok).toBe(true);
    const labs = await prisma.church.findMany({ where: { name: TEST_LAB_CHURCH_NAME } });
    expect(labs).toHaveLength(1);
    expect(await prisma.membership.count({ where: { churchId: labs[0].id } })).toBe(2);
    expect((await createTestSets(1)).ok).toBe(true);
  });

  it("nobody else can reach the lab's data, even with a valid set id", async () => {
    const lab = (await findTestLabChurch())!;
    const labSet = await prisma.worshipSet.findFirstOrThrow({ where: { teamId: lab.teams[0].id } });

    const invitedMember = await createTestTeam("lab-invited-member", "MEMBER");
    extra.push({ teamId: invitedMember.team.id, churchId: invitedMember.church.id });
    await loginAs(invitedMember.user.id);

    expect((await getRehearsalNotesForSet(labSet.id)).ok).toBe(false);
    expect(await prisma.membership.count({ where: { userId: invitedMember.user.id, churchId: lab.id } })).toBe(0);
  });

  it("nobody can be invited to the lab — not even by an owner who is inside it", async () => {
    await loginAs(a.user.id); // still inside the lab
    const lab = (await findTestLabChurch())!;
    const result = await createInvite({ email: "someone@example.com" });
    expect(result.ok).toBe(false);
    expect(await prisma.invite.count({ where: { churchId: lab.id } })).toBe(0);
  });

  it("a user who names their own church the same does not become the lab", async () => {
    const impostor = await createTestTeam("lab-impostor", "OWNER");
    extra.push({ teamId: impostor.team.id, churchId: impostor.church.id });
    await prisma.church.update({ where: { id: impostor.church.id }, data: { name: TEST_LAB_CHURCH_NAME } });
    const lab = await findTestLabChurch();
    expect(lab?.id).not.toBe(impostor.church.id);
    // ...and their own invites still work normally.
    await loginAs(impostor.user.id);
    expect((await createInvite({ email: "friend@example.com" })).ok).toBe(true);
  });

  it("'Clear all test data' empties only the lab and leaves the owner's real church alone", async () => {
    await loginAs(a.user.id);
    const home = await prisma.song.create({ data: { teamId: a.team.id, title: "Real song" } });
    expect((await resetTestLab()).ok).toBe(true);
    const lab = (await findTestLabChurch())!;
    expect(await prisma.worshipSet.count({ where: { teamId: lab.teams[0].id } })).toBe(0);
    expect(await prisma.song.count({ where: { teamId: lab.teams[0].id } })).toBe(0);
    expect(await prisma.teamMember.count({ where: { teamId: lab.teams[0].id } })).toBe(0);
    expect(await prisma.song.findUnique({ where: { id: home.id } })).not.toBeNull();
  });

  it("'Back to my church' returns the owner to their own church; reset is refused from there", async () => {
    await loginAs(a.user.id);
    expect((await leaveTestLab()).ok).toBe(true);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: a.user.id } })).currentChurchId).toBe(a.church.id);
    expect((await resetTestLab()).ok).toBe(false);
    expect((await createTestSets(1)).ok).toBe(false);
  });
});
