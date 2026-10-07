import { describe, it, expect, afterEach } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { createInvite } from "@/lib/actions/invites";
import { createTestTeam, loginAs, cleanupTeam } from "./helpers";

// These exercise the data the Team page's per-member "Invitation Sent /
// Invitation Expired / Active" status is derived from (acceptedAt/expiresAt
// on Invite) — there is no separate status field (the brief is explicit
// that none should be invented), so the query shape itself is what these
// protect.
describe("Invitation status data", () => {
  const cleanup: { teamId: string; churchId: string }[] = [];
  afterEach(async () => {
    while (cleanup.length) {
      const c = cleanup.pop()!;
      await cleanupTeam(c.teamId, c.churchId);
    }
  });

  it("an expired, unaccepted invite is still returned by the unaccepted-invites query (so it can render as Expired, not disappear)", async () => {
    const leader = await createTestTeam("invite-status-expired", "LEADER");
    cleanup.push({ teamId: leader.team.id, churchId: leader.church.id });
    const joel = await prisma.teamMember.create({ data: { teamId: leader.team.id, name: "Joel", role: "Bass" } });

    await prisma.invite.create({
      data: {
        churchId: leader.church.id,
        teamId: leader.team.id,
        teamMemberId: joel.id,
        email: "joel@example.com",
        expiresAt: new Date(Date.now() - 1000), // already expired
      },
    });

    const unaccepted = await prisma.invite.findMany({ where: { teamId: leader.team.id, acceptedAt: null } });
    expect(unaccepted).toHaveLength(1);
    expect(unaccepted[0].teamMemberId).toBe(joel.id);
    expect(unaccepted[0].expiresAt.getTime()).toBeLessThan(Date.now());
  });

  it("resending reuses the same invite row instead of creating a duplicate", async () => {
    const leader = await createTestTeam("invite-status-resend", "LEADER");
    cleanup.push({ teamId: leader.team.id, churchId: leader.church.id });
    const joel = await prisma.teamMember.create({ data: { teamId: leader.team.id, name: "Joel", role: "Bass" } });
    await loginAs(leader.user.id);

    const first = await createInvite({ email: "joel@example.com", teamMemberId: joel.id });
    expect(first.ok).toBe(true);
    const second = await createInvite({ email: "joel@example.com", teamMemberId: joel.id });
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.data.id).toBe(first.data.id);

    const count = await prisma.invite.count({ where: { teamId: leader.team.id, teamMemberId: joel.id } });
    expect(count).toBe(1);
  });

  it("resending an expired invite refreshes its expiry instead of leaving it expired", async () => {
    const leader = await createTestTeam("invite-status-resend-expired", "LEADER");
    cleanup.push({ teamId: leader.team.id, churchId: leader.church.id });
    const joel = await prisma.teamMember.create({ data: { teamId: leader.team.id, name: "Joel", role: "Bass" } });
    await prisma.invite.create({
      data: {
        churchId: leader.church.id,
        teamId: leader.team.id,
        teamMemberId: joel.id,
        email: "joel@example.com",
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    await loginAs(leader.user.id);

    const result = await createInvite({ email: "joel@example.com", teamMemberId: joel.id });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const refreshed = await prisma.invite.findUnique({ where: { id: result.data.id } });
    expect(refreshed!.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("an accepted invite's member shows Active via userId, independent of invite status", async () => {
    const leader = await createTestTeam("invite-status-accepted", "LEADER");
    cleanup.push({ teamId: leader.team.id, churchId: leader.church.id });
    const sarah = await prisma.teamMember.create({
      data: { teamId: leader.team.id, userId: leader.user.id, name: "Sarah", role: "Lead Vocal" },
    });

    // Active status is read from TeamMember.userId directly in the UI,
    // not from the invite at all once accepted.
    const member = await prisma.teamMember.findUnique({ where: { id: sarah.id } });
    expect(member!.userId).not.toBeNull();
  });
});
