import { describe, it, expect, afterEach } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  startRehearsal,
  captureRehearsalNote,
  getRehearsalNotesForSet,
  resolveRehearsalNote,
  convertRehearsalNoteToChange,
} from "@/lib/actions/rehearsal";
import { canConvertNote } from "@/lib/songs/rehearsal-notes";
import { createTestTeam, loginAs, cleanupTeam } from "./helpers";

describe("Rehearsal notes: capture, review, agreed change", () => {
  const cleanup: { teamId: string; churchId: string }[] = [];
  afterEach(async () => {
    while (cleanup.length) {
      const c = cleanup.pop()!;
      await cleanupTeam(c.teamId, c.churchId);
    }
  });

  async function setup(label: string) {
    const leader = await createTestTeam(label, "OWNER");
    cleanup.push({ teamId: leader.team.id, churchId: leader.church.id });
    const set = await prisma.worshipSet.create({ data: { teamId: leader.team.id, title: "Sunday" } });
    const song = await prisma.song.create({ data: { teamId: leader.team.id, title: "Song A" } });
    const chorus = await prisma.songSection.create({ data: { songId: song.id, label: "Chorus", order: 0 } });
    const verse = await prisma.songSection.create({ data: { songId: song.id, label: "Verse", order: 1 } });
    await prisma.songRoleNote.create({ data: { sectionId: chorus.id, role: "Bass", content: "Root notes" } });
    const setSong = await prisma.setSong.create({ data: { setId: set.id, songId: song.id, order: 0 } });
    await loginAs(leader.user.id);
    const started = await startRehearsal(song.id, setSong.id);
    if (!started.ok) throw new Error(started.error);
    return { leader, set, song, chorus, verse, setSong, rehearsalId: started.data.id };
  }

  it("captures a one-line note with a category and the current section, as OPEN", async () => {
    const { chorus, rehearsalId } = await setup("note-capture");
    const result = await captureRehearsalNote({ rehearsalId, content: "Bass enters too early", category: "FIX", sectionId: chorus.id });
    expect(result.ok).toBe(true);
    const row = await prisma.rehearsalNote.findFirst({ where: { rehearsalId } });
    expect(row).toMatchObject({ content: "Bass enters too early", category: "FIX", sectionId: chorus.id, status: "OPEN" });
  });

  it("works with nothing but text (category and section are optional)", async () => {
    const { rehearsalId } = await setup("note-bare");
    expect((await captureRehearsalNote({ rehearsalId, content: "Slower into the bridge" })).ok).toBe(true);
  });

  it("rejects empty text, unknown categories, over-long text and a section from a different song", async () => {
    const { leader, rehearsalId } = await setup("note-validate");
    expect((await captureRehearsalNote({ rehearsalId, content: "   " })).ok).toBe(false);
    expect((await captureRehearsalNote({ rehearsalId, content: "x", category: "BOGUS" })).ok).toBe(false);
    expect((await captureRehearsalNote({ rehearsalId, content: "x".repeat(501) })).ok).toBe(false);
    const other = await prisma.song.create({ data: { teamId: leader.team.id, title: "Other" } });
    const foreign = await prisma.songSection.create({ data: { songId: other.id, label: "Chorus", order: 0 } });
    expect((await captureRehearsalNote({ rehearsalId, content: "x", sectionId: foreign.id })).ok).toBe(false);
  });

  it("a note does NOT change the canonical arrangement", async () => {
    const { chorus, rehearsalId } = await setup("note-no-edit");
    await captureRehearsalNote({ rehearsalId, content: "Bass should hold longer", category: "DECISION", sectionId: chorus.id });
    const notes = await prisma.songRoleNote.findMany({ where: { sectionId: chorus.id } });
    expect(notes).toHaveLength(1);
    expect(notes[0].content).toBe("Root notes");
    expect(await prisma.changeLog.count({ where: { songId: chorus.songId } })).toBe(0);
  });

  it("lists only OPEN notes for review across the whole set", async () => {
    const { set, rehearsalId, chorus } = await setup("note-list");
    await captureRehearsalNote({ rehearsalId, content: "one", sectionId: chorus.id });
    const second = await captureRehearsalNote({ rehearsalId, content: "two" });
    if (!second.ok) throw new Error("setup");
    await resolveRehearsalNote(second.data.id, "DISCARDED");
    const open = await getRehearsalNotesForSet(set.id);
    expect(open.ok && open.data.map((n) => n.content)).toEqual(["one"]);
    const all = await getRehearsalNotesForSet(set.id, { status: "ALL" });
    expect(all.ok && all.data).toHaveLength(2);
  });

  it("leader can keep or discard a note; neither touches the arrangement", async () => {
    const { chorus, rehearsalId } = await setup("note-resolve");
    const a = await captureRehearsalNote({ rehearsalId, content: "keep me", sectionId: chorus.id });
    const b = await captureRehearsalNote({ rehearsalId, content: "bin me", sectionId: chorus.id });
    if (!a.ok || !b.ok) throw new Error("setup");
    expect((await resolveRehearsalNote(a.data.id, "KEPT")).ok).toBe(true);
    expect((await resolveRehearsalNote(b.data.id, "DISCARDED")).ok).toBe(true);
    expect((await prisma.rehearsalNote.findUnique({ where: { id: a.data.id } }))?.status).toBe("KEPT");
    expect((await prisma.rehearsalNote.findUnique({ where: { id: b.data.id } }))?.status).toBe("DISCARDED");
    expect((await prisma.songRoleNote.findMany({ where: { sectionId: chorus.id } }))[0].content).toBe("Root notes");
    // Already decided — a second decision is refused rather than flipping it.
    expect((await resolveRehearsalNote(a.data.id, "DISCARDED")).ok).toBe(false);
  });

  it("leader can convert a section note into an agreed change: shared direction updated, journaled, note CONVERTED", async () => {
    const { chorus, song, rehearsalId } = await setup("note-convert");
    const note = await captureRehearsalNote({ rehearsalId, content: "Bass waits until bar 3", category: "DECISION", sectionId: chorus.id });
    if (!note.ok) throw new Error("setup");

    const result = await convertRehearsalNoteToChange(note.data.id, { role: "Bass", content: "Enter on bar 3, root notes" });
    expect(result.ok).toBe(true);

    const direction = await prisma.songRoleNote.findFirst({ where: { sectionId: chorus.id, role: "Bass", teamMemberId: null } });
    expect(direction?.content).toBe("Enter on bar 3, root notes");
    const log = await prisma.changeLog.findFirst({ where: { songId: song.id } });
    expect(log).toMatchObject({ fromValue: "Root notes", toValue: "Enter on bar 3, root notes", reason: "Agreed in rehearsal" });
    expect((await prisma.rehearsalNote.findUnique({ where: { id: note.data.id } }))?.status).toBe("CONVERTED");
  });

  it("creates the direction when the role had none, and a second convert is refused (no double apply)", async () => {
    const { verse, rehearsalId } = await setup("note-convert-new");
    const note = await captureRehearsalNote({ rehearsalId, content: "Keys pad only", sectionId: verse.id });
    if (!note.ok) throw new Error("setup");
    expect((await convertRehearsalNoteToChange(note.data.id, { role: "Keys" })).ok).toBe(true);
    expect((await convertRehearsalNoteToChange(note.data.id, { role: "Keys", content: "Something else" })).ok).toBe(false);
    const rows = await prisma.songRoleNote.findMany({ where: { sectionId: verse.id, role: "Keys" } });
    expect(rows).toHaveLength(1);
    expect(rows[0].content).toBe("Keys pad only");
  });

  it("cannot convert a note without a section, or a transition note", async () => {
    const { rehearsalId, chorus } = await setup("note-noconvert");
    const bare = await captureRehearsalNote({ rehearsalId, content: "General thought" });
    const trans = await captureRehearsalNote({ rehearsalId, content: "Pray between songs", category: "TRANSITION", sectionId: chorus.id });
    if (!bare.ok || !trans.ok) throw new Error("setup");
    expect((await convertRehearsalNoteToChange(bare.data.id, { role: "Bass" })).ok).toBe(false);
    expect((await convertRehearsalNoteToChange(trans.data.id, { role: "Bass" })).ok).toBe(false);
    expect(canConvertNote({ sectionId: null, category: null, status: "OPEN" })).toBe(false);
    expect(canConvertNote({ sectionId: "s", category: "FIX", status: "OPEN" })).toBe(true);
    expect(canConvertNote({ sectionId: "s", category: "FIX", status: "CONVERTED" })).toBe(false);
  });

  it("a plain team member can capture a note but not review or convert one (direct calls)", async () => {
    const { leader, chorus, rehearsalId } = await setup("note-perm");
    const note = await captureRehearsalNote({ rehearsalId, content: "from the leader", sectionId: chorus.id });
    if (!note.ok) throw new Error("setup");

    const member = await prisma.user.create({
      data: { name: "Member", email: `m-${Date.now()}@test.invalid`, passwordHash: "x" },
    });
    await prisma.membership.create({ data: { userId: member.id, churchId: leader.church.id, role: "MEMBER" } });
    await loginAs(member.id);

    expect((await captureRehearsalNote({ rehearsalId, content: "I heard the bass drift", sectionId: chorus.id })).ok).toBe(true);
    expect((await resolveRehearsalNote(note.data.id, "DISCARDED")).ok).toBe(false);
    expect((await convertRehearsalNoteToChange(note.data.id, { role: "Bass", content: "hijack" })).ok).toBe(false);
    expect((await prisma.rehearsalNote.findUnique({ where: { id: note.data.id } }))?.status).toBe("OPEN");
    expect((await prisma.songRoleNote.findFirst({ where: { sectionId: chorus.id, role: "Bass" } }))?.content).toBe("Root notes");
  });

  it("another team can neither read, capture against, nor resolve this team's notes", async () => {
    const { set, chorus, rehearsalId } = await setup("note-tenant");
    const note = await captureRehearsalNote({ rehearsalId, content: "private to team A", sectionId: chorus.id });
    if (!note.ok) throw new Error("setup");

    const outsider = await createTestTeam("note-tenant-b", "OWNER");
    cleanup.push({ teamId: outsider.team.id, churchId: outsider.church.id });
    await loginAs(outsider.user.id);

    expect((await getRehearsalNotesForSet(set.id)).ok).toBe(false);
    expect((await captureRehearsalNote({ rehearsalId, content: "intrusion" })).ok).toBe(false);
    expect((await resolveRehearsalNote(note.data.id, "DISCARDED")).ok).toBe(false);
    expect((await convertRehearsalNoteToChange(note.data.id, { role: "Bass", content: "x" })).ok).toBe(false);
    expect(await prisma.rehearsalNote.count({ where: { rehearsalId } })).toBe(1);
  });

  it("personal (private) notes are never part of the rehearsal-notes list", async () => {
    const { leader, set, song, rehearsalId } = await setup("note-private");
    await prisma.personalNote.create({ data: { userId: leader.user.id, songId: song.id, content: "my private reminder" } });
    await captureRehearsalNote({ rehearsalId, content: "shared observation" });
    const all = await getRehearsalNotesForSet(set.id, { status: "ALL" });
    expect(all.ok && all.data.map((n) => n.content)).toEqual(["shared observation"]);
  });
});
