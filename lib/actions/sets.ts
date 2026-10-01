"use server";

import { revalidatePath } from "next/cache";
import type { EventType, WorshipSet } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/guard";
import { runAction, type ActionResult, type ActionResultData } from "@/lib/actions/action-result";

export async function createSet(input: {
  title: string;
  eventType?: EventType;
  theme?: string;
  keywords?: string;
  verses?: string[];
  serviceDate?: string;
  location?: string;
  church?: string;
  serviceType?: string;
  leaderName?: string;
}): Promise<ActionResultData<{ id: string }>> {
  return runAction(async () => {
    const { team } = await requireUser();

    const set = await prisma.worshipSet.create({
      data: {
        teamId: team.id,
        title: input.title,
        eventType: input.eventType || undefined,
        theme: input.theme || null,
        keywords: input.keywords || null,
        serviceDate: input.serviceDate ? new Date(input.serviceDate) : null,
        location: input.location || null,
        church: input.church || null,
        serviceType: input.serviceType || null,
        leaderName: input.leaderName || null,
        bibleRefs: {
          create: (input.verses ?? [])
            .filter((v) => v.trim().length > 0)
            .map((reference) => ({ reference })),
        },
      },
    });

    revalidatePath("/sets");
    revalidatePath("/dashboard");
    return { ok: true, data: { id: set.id } };
  });
}

type SetLookup = { ok: true; set: WorshipSet } | { ok: false; error: string };

async function findOwnedSet(setId: string, teamId: string): Promise<SetLookup> {
  const set = await prisma.worshipSet.findUnique({ where: { id: setId } });
  if (!set || set.teamId !== teamId) return { ok: false, error: "Worship set not found." };
  return { ok: true, set };
}

export async function updateSetNotes(setId: string, notes: string): Promise<ActionResult> {
  return runAction(async () => {
    const { team } = await requireUser();
    const lookup = await findOwnedSet(setId, team.id);
    if (!lookup.ok) return lookup;
    await prisma.worshipSet.update({ where: { id: setId }, data: { notes } });
    revalidatePath(`/sets/${setId}`);
    return { ok: true };
  });
}

// Theme, leaderName, keywords and anchorSongId are otherwise only ever set
// once, at creation (/sets/new) — this is the only way to edit any of them
// afterward (the "Set Direction" card on the Set Detail page).
export async function updateSetMeta(
  setId: string,
  input: {
    theme?: string | null;
    leaderName?: string | null;
    keywords?: string | null;
    anchorSongId?: string | null;
  },
): Promise<ActionResult> {
  return runAction(async () => {
    const { team } = await requireUser();
    const lookup = await findOwnedSet(setId, team.id);
    if (!lookup.ok) return lookup;

    if (input.anchorSongId) {
      const song = await prisma.setSong.findFirst({
        where: { setId, songId: input.anchorSongId },
      });
      if (!song) return { ok: false, error: "That song isn't in this set." };
    }

    await prisma.worshipSet.update({
      where: { id: setId },
      data: {
        ...(input.theme !== undefined ? { theme: input.theme?.trim() || null } : {}),
        ...(input.leaderName !== undefined ? { leaderName: input.leaderName?.trim() || null } : {}),
        ...(input.keywords !== undefined ? { keywords: input.keywords?.trim() || null } : {}),
        ...(input.anchorSongId !== undefined ? { anchorSongId: input.anchorSongId || null } : {}),
      },
    });
    revalidatePath(`/sets/${setId}`);
    revalidatePath("/dashboard");
    return { ok: true };
  });
}

export async function addSongToSet(setId: string, songId: string): Promise<ActionResult> {
  return runAction(async () => {
    const { team } = await requireUser();
    const lookup = await findOwnedSet(setId, team.id);
    if (!lookup.ok) return lookup;

    const song = await prisma.song.findUnique({ where: { id: songId } });
    if (!song || song.teamId !== team.id) return { ok: false, error: "Song not found." };

    const count = await prisma.setSong.count({ where: { setId } });
    await prisma.setSong.create({ data: { setId, songId, order: count } });
    revalidatePath(`/sets/${setId}`);
    return { ok: true };
  });
}

export async function removeSongFromSet(setSongId: string): Promise<ActionResult> {
  return runAction(async () => {
    const { team } = await requireUser();
    const setSong = await prisma.setSong.findUnique({
      where: { id: setSongId },
      include: { set: true },
    });
    if (!setSong || setSong.set.teamId !== team.id) return { ok: false, error: "Not found." };

    await prisma.setSong.delete({ where: { id: setSongId } });

    const remaining = await prisma.setSong.findMany({
      where: { setId: setSong.setId },
      orderBy: { order: "asc" },
    });
    await Promise.all(
      remaining.map((s, i) =>
        prisma.setSong.update({ where: { id: s.id }, data: { order: i } }),
      ),
    );

    revalidatePath(`/sets/${setSong.setId}`);
    return { ok: true };
  });
}

export async function reorderSetSongs(setId: string, orderedSetSongIds: string[]): Promise<ActionResult> {
  return runAction(async () => {
    const { team } = await requireUser();
    const lookup = await findOwnedSet(setId, team.id);
    if (!lookup.ok) return lookup;

    await Promise.all(
      orderedSetSongIds.map((id, index) =>
        prisma.setSong.update({ where: { id }, data: { order: index } }),
      ),
    );

    revalidatePath(`/sets/${setId}`);
    return { ok: true };
  });
}

export async function updateSetSongDetails(
  setSongId: string,
  input: {
    purpose?: string;
    transitionNotes?: string;
    overrideKey?: string | null;
    overrideBpm?: number | null;
    capo?: number | null;
  },
): Promise<ActionResult> {
  return runAction(async () => {
    const { team } = await requireUser();
    const setSong = await prisma.setSong.findUnique({
      where: { id: setSongId },
      include: { set: true },
    });
    if (!setSong || setSong.set.teamId !== team.id) return { ok: false, error: "Not found." };

    await prisma.setSong.update({ where: { id: setSongId }, data: input });
    revalidatePath(`/sets/${setSong.setId}`);
    return { ok: true };
  });
}

export async function assignMemberToSetSong(
  setSongId: string,
  teamMemberId: string,
  role: string,
): Promise<ActionResult> {
  return runAction(async () => {
    const { team } = await requireUser();
    const setSong = await prisma.setSong.findUnique({
      where: { id: setSongId },
      include: { set: true },
    });
    if (!setSong || setSong.set.teamId !== team.id) return { ok: false, error: "Not found." };

    const existing = await prisma.songAssignment.findFirst({
      where: { setSongId, teamMemberId },
    });
    if (existing) {
      await prisma.songAssignment.update({ where: { id: existing.id }, data: { role } });
    } else {
      await prisma.songAssignment.create({ data: { setSongId, teamMemberId, role } });
    }

    revalidatePath(`/sets/${setSong.setId}`);
    return { ok: true };
  });
}

export async function removeAssignment(assignmentId: string): Promise<ActionResult> {
  return runAction(async () => {
    const { team } = await requireUser();
    const assignment = await prisma.songAssignment.findUnique({
      where: { id: assignmentId },
      include: { setSong: { include: { set: true } } },
    });
    if (!assignment || assignment.setSong.set.teamId !== team.id) return { ok: false, error: "Not found." };

    await prisma.songAssignment.delete({ where: { id: assignmentId } });
    revalidatePath(`/sets/${assignment.setSong.set.id}`);
    return { ok: true };
  });
}

// The service's roster, assigned once for the whole set rather than
// per-song (SongAssignment above still exists for the optional per-song
// override).
export async function assignMemberToSet(
  setId: string,
  teamMemberId: string,
  role: string,
): Promise<ActionResult> {
  return runAction(async () => {
    const { team } = await requireUser();
    const lookup = await findOwnedSet(setId, team.id);
    if (!lookup.ok) return lookup;

    const member = await prisma.teamMember.findUnique({ where: { id: teamMemberId } });
    if (!member || member.teamId !== team.id) return { ok: false, error: "Team member not found." };

    await prisma.setTeamMember.upsert({
      where: { setId_teamMemberId_role: { setId, teamMemberId, role } },
      update: {},
      create: { setId, teamMemberId, role },
    });
    revalidatePath(`/sets/${setId}`);
    return { ok: true };
  });
}

export async function removeSetMember(setTeamMemberId: string): Promise<ActionResult> {
  return runAction(async () => {
    const { team } = await requireUser();
    const row = await prisma.setTeamMember.findUnique({
      where: { id: setTeamMemberId },
      include: { set: true },
    });
    if (!row || row.set.teamId !== team.id) return { ok: false, error: "Not found." };

    await prisma.setTeamMember.delete({ where: { id: setTeamMemberId } });
    revalidatePath(`/sets/${row.setId}`);
    return { ok: true };
  });
}
