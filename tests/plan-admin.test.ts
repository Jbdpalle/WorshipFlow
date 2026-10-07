import { describe, it, expect, vi, afterEach } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { isSuperAdmin } from "@/lib/auth/super-admin";
import { createSet } from "@/lib/actions/sets";
import { addTeamMember } from "@/lib/actions/team";
import { FREE_LIMITS } from "@/lib/plans/limits";
import { createTestTeam, loginAs, cleanupTeam } from "./helpers";

describe("isSuperAdmin", () => {
  it("recognizes only the two designated owner accounts, case-insensitively", () => {
    expect(isSuperAdmin("leader@worshipflow.app")).toBe(true);
    expect(isSuperAdmin("jbdpalle@gmail.com")).toBe(true);
    expect(isSuperAdmin("Leader@WorshipFlow.App")).toBe(true);
    expect(isSuperAdmin("JBDPALLE@GMAIL.COM")).toBe(true);
    expect(isSuperAdmin("someone-else@example.com")).toBe(false);
    expect(isSuperAdmin("")).toBe(false);
  });
});

describe("Plan administration: authorization", () => {
  const cleanup: { teamId: string; churchId: string }[] = [];
  afterEach(async () => {
    while (cleanup.length) {
      const c = cleanup.pop()!;
      await cleanupTeam(c.teamId, c.churchId);
    }
  });

  it("a normal church OWNER (not a designated super admin) cannot change any team's plan", async () => {
    const { setTeamPlan } = await import("@/lib/actions/plan");
    const owner = await createTestTeam("plan-owner-blocked", "OWNER");
    cleanup.push({ teamId: owner.team.id, churchId: owner.church.id });
    await loginAs(owner.user.id);

    const result = await setTeamPlan(owner.team.id, "PRO");
    expect(result.ok).toBe(false);

    const unchanged = await prisma.team.findUnique({ where: { id: owner.team.id } });
    expect(unchanged?.plan).toBe("FREE");
  });

  it("a normal church OWNER cannot list all teams", async () => {
    const { listAllTeamsForAdmin } = await import("@/lib/actions/plan");
    const owner = await createTestTeam("plan-list-blocked", "OWNER");
    cleanup.push({ teamId: owner.team.id, churchId: owner.church.id });
    await loginAs(owner.user.id);

    const result = await listAllTeamsForAdmin();
    expect(result.ok).toBe(false);
  });

  it("a recognized super admin can change a team's plan even when they aren't a member of it", async () => {
    vi.doMock("@/lib/auth/super-admin", () => ({ isSuperAdmin: () => true }));
    vi.resetModules();
    const { setTeamPlan } = await import("@/lib/actions/plan");

    const someoneElse = await createTestTeam("plan-admin-target", "OWNER");
    cleanup.push({ teamId: someoneElse.team.id, churchId: someoneElse.church.id });
    // The "super admin" here isn't a member of someoneElse's church at all —
    // a separate team/user is logged in, standing in for one of the two
    // designated accounts without touching their real email/row.
    const admin = await createTestTeam("plan-admin-caller", "MEMBER");
    cleanup.push({ teamId: admin.team.id, churchId: admin.church.id });
    await loginAs(admin.user.id);

    const result = await setTeamPlan(someoneElse.team.id, "PRO");
    expect(result.ok).toBe(true);

    const updated = await prisma.team.findUnique({ where: { id: someoneElse.team.id } });
    expect(updated?.plan).toBe("PRO");

    vi.doUnmock("@/lib/auth/super-admin");
    vi.resetModules();
  });
});

describe("Beta entitlement: Free-plan limits are not enforced during beta", () => {
  const cleanup: { teamId: string; churchId: string }[] = [];
  afterEach(async () => {
    while (cleanup.length) {
      const c = cleanup.pop()!;
      await cleanupTeam(c.teamId, c.churchId);
    }
  });

  it("a FREE-plan team can create more active sets than FREE_LIMITS.maxActiveSets", async () => {
    const leader = await createTestTeam("beta-sets-unrestricted", "LEADER");
    cleanup.push({ teamId: leader.team.id, churchId: leader.church.id });
    await loginAs(leader.user.id);

    expect(leader.team.plan).toBe("FREE");

    for (let i = 0; i < FREE_LIMITS.maxActiveSets + 2; i++) {
      const result = await createSet({ title: `Beta Set ${i}` });
      expect(result.ok).toBe(true);
    }

    const count = await prisma.worshipSet.count({ where: { teamId: leader.team.id } });
    expect(count).toBe(FREE_LIMITS.maxActiveSets + 2);
  });

  it("a FREE-plan team can add more team members than FREE_LIMITS.maxTeamMembers", async () => {
    const leader = await createTestTeam("beta-members-unrestricted", "LEADER");
    cleanup.push({ teamId: leader.team.id, churchId: leader.church.id });
    await loginAs(leader.user.id);

    for (let i = 0; i < FREE_LIMITS.maxTeamMembers + 2; i++) {
      const result = await addTeamMember({ name: `Member ${i}`, role: "Other" });
      expect(result.ok).toBe(true);
    }
  });
});
