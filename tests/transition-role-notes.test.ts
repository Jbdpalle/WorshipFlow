import { describe, it, expect, afterEach } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { upsertTransition, upsertTransitionRoleNote } from "@/lib/actions/transitions";
import { selectRoleNoteForViewer } from "@/lib/songs/role-notes";
import { createTestTeam, loginAs, cleanupTeam } from "./helpers";

// Builds a two-song set with a transition between them, ready for per-role
// direction tests — mirrors the shape the Setlist Builder's Transition
// Builder already creates.
async function createSetWithTransition(teamId: string) {
  const songA = await prisma.song.create({ data: { teamId, title: "Song A" } });
  const songB = await prisma.song.create({ data: { teamId, title: "Song B" } });
  const set = await prisma.worshipSet.create({ data: { teamId, title: "Sunday" } });
  const setSongA = await prisma.setSong.create({ data: { setId: set.id, songId: songA.id, order: 0 } });
  const setSongB = await prisma.setSong.create({ data: { setId: set.id, songId: songB.id, order: 1 } });
  return { songA, songB, set, setSongA, setSongB };
}

describe("upsertTransitionRoleNote", () => {
  const cleanup: { teamId: string; churchId: string }[] = [];
  afterEach(async () => {
    while (cleanup.length) {
      const c = cleanup.pop()!;
      await cleanupTeam(c.teamId, c.churchId);
    }
  });

  it("adds a per-musician direction onto an existing transition without touching the shared direction text", async () => {
    const leader = await createTestTeam("transition-notes-basic", "LEADER");
    cleanup.push({ teamId: leader.team.id, churchId: leader.church.id });
    await loginAs(leader.user.id);
    const { set, setSongA, setSongB } = await createSetWithTransition(leader.team.id);

    const created = await upsertTransition({
      setId: set.id,
      fromSetSongId: setSongA.id,
      toSetSongId: setSongB.id,
      type: "PAD",
      direction: "Hold the wash, keys change to pads.",
    });
    expect(created.ok).toBe(true);

    const transition = await prisma.transition.findUniqueOrThrow({ where: { fromSetSongId: setSongA.id } });
    const result = await upsertTransitionRoleNote(transition.id, "Keys", "Fade from lead motif into sustained pad.", set.id, {
      visibility: "ROLE",
    });
    expect(result.ok).toBe(true);

    const refreshed = await prisma.transition.findUniqueOrThrow({
      where: { id: transition.id },
      include: { roleNotes: true },
    });
    expect(refreshed.direction).toBe("Hold the wash, keys change to pads."); // unchanged
    expect(refreshed.roleNotes).toHaveLength(1);
    expect(refreshed.roleNotes[0]).toMatchObject({
      role: "Keys",
      content: "Fade from lead motif into sustained pad.",
      visibility: "ROLE",
      teamMemberId: null,
    });
  });

  it("supports a PERSON-scoped transition direction alongside a ROLE-scoped one for the same role", async () => {
    const leader = await createTestTeam("transition-notes-person", "LEADER");
    cleanup.push({ teamId: leader.team.id, churchId: leader.church.id });
    await loginAs(leader.user.id);
    const { set, setSongA, setSongB } = await createSetWithTransition(leader.team.id);
    const bassPlayer = await prisma.teamMember.create({ data: { teamId: leader.team.id, name: "Karthik", role: "Bass" } });

    await upsertTransition({ setId: set.id, fromSetSongId: setSongA.id, toSetSongId: setSongB.id, type: "DIRECT", direction: "" });
    const transition = await prisma.transition.findUniqueOrThrow({ where: { fromSetSongId: setSongA.id } });

    await upsertTransitionRoleNote(transition.id, "Bass", "Rest of the band.", set.id, { visibility: "ROLE" });
    await upsertTransitionRoleNote(transition.id, "Bass", "You lead the transition — walk up into the new key.", set.id, {
      teamMemberId: bassPlayer.id,
      visibility: "PERSON",
    });

    const refreshed = await prisma.transition.findUniqueOrThrow({
      where: { id: transition.id },
      include: { roleNotes: true },
    });
    expect(refreshed.roleNotes).toHaveLength(2);

    // selectRoleNoteForViewer (the same reader My Part/Rehearsal Mode use)
    // gives Karthik his personal note, and anyone else on Bass the shared one.
    const forKarthik = selectRoleNoteForViewer(refreshed.roleNotes, "Bass", bassPlayer.id);
    expect(forKarthik?.content).toBe("You lead the transition — walk up into the new key.");
    const forSomeoneElse = selectRoleNoteForViewer(refreshed.roleNotes, "Bass", "someone-else-id");
    expect(forSomeoneElse?.content).toBe("Rest of the band.");
  });

  it("deletes the row when content is cleared", async () => {
    const leader = await createTestTeam("transition-notes-clear", "LEADER");
    cleanup.push({ teamId: leader.team.id, churchId: leader.church.id });
    await loginAs(leader.user.id);
    const { set, setSongA, setSongB } = await createSetWithTransition(leader.team.id);

    await upsertTransition({ setId: set.id, fromSetSongId: setSongA.id, toSetSongId: setSongB.id, type: "DIRECT", direction: "" });
    const transition = await prisma.transition.findUniqueOrThrow({ where: { fromSetSongId: setSongA.id } });
    await upsertTransitionRoleNote(transition.id, "Drums", "Crash and stop.", set.id);
    await upsertTransitionRoleNote(transition.id, "Drums", "", set.id);

    const remaining = await prisma.songRoleNote.findMany({ where: { transitionId: transition.id } });
    expect(remaining).toHaveLength(0);
  });

  it("is rejected for a transition belonging to a different team (tenant isolation)", async () => {
    const leaderA = await createTestTeam("transition-notes-tenant-a", "LEADER");
    const leaderB = await createTestTeam("transition-notes-tenant-b", "LEADER");
    cleanup.push({ teamId: leaderA.team.id, churchId: leaderA.church.id });
    cleanup.push({ teamId: leaderB.team.id, churchId: leaderB.church.id });

    const { set, setSongA, setSongB } = await createSetWithTransition(leaderA.team.id);
    await loginAs(leaderA.user.id);
    await upsertTransition({ setId: set.id, fromSetSongId: setSongA.id, toSetSongId: setSongB.id, type: "DIRECT", direction: "" });
    const transition = await prisma.transition.findUniqueOrThrow({ where: { fromSetSongId: setSongA.id } });

    await loginAs(leaderB.user.id);
    const result = await upsertTransitionRoleNote(transition.id, "Drums", "Should not save.", set.id);
    expect(result.ok).toBe(false);

    const rows = await prisma.songRoleNote.findMany({ where: { transitionId: transition.id } });
    expect(rows).toHaveLength(0);
  });
});
