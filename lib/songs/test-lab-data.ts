import { prisma } from "@/lib/db/prisma";
import { DEFAULT_SONG_STRUCTURE } from "@/lib/songs/constants";
import { ensurePrimaryTeamMemberRole } from "@/lib/songs/team-member-roles";

// Roster-only people: no login, no invite, nothing to accept.
export const TEST_ROSTER = [
  { name: "Test Leader", role: "Worship Leader", instrument: null },
  { name: "Test Lead Vocal", role: "Lead Vocal", instrument: null },
  { name: "Test Backing Vocal 1", role: "Backing Vocal", instrument: null },
  { name: "Test Backing Vocal 2", role: "Backing Vocal", instrument: null },
  { name: "Test Acoustic", role: "Acoustic Guitar", instrument: "Acoustic Guitar" },
  { name: "Test Electric", role: "Electric Guitar", instrument: "Electric Guitar" },
  { name: "Test Bass", role: "Bass", instrument: "Bass" },
  { name: "Test Drums", role: "Drums", instrument: "Drums" },
  { name: "Test Keys", role: "Keys", instrument: "Keys" },
] as const;

// Original placeholder songs — no real song titles or lyrics.
const TEST_SONGS = [
  { title: "Test Song 1 — Opening Praise", key: "G", bpm: 120, energy: "high", purpose: "Opens the set with energy" },
  { title: "Test Song 2 — Declaration", key: "D", bpm: 96, energy: "medium", purpose: "Our declaration of trust" },
  { title: "Test Song 3 — Slow Surrender", key: "E", bpm: 68, energy: "low", purpose: "Quiet response — space to pray" },
  { title: "Test Song 4 — Closing Response", key: "A", bpm: 84, energy: "medium", purpose: "Sends everyone out together" },
] as const;

const DYNAMICS = ["Intimate", "Light", "Building", "Strong", "Building", "Intimate", "Full", "Light"];

// Layered so the arrangement overview shows entrances, drop-outs and a
// return: pad first, guitars in the verse, bass half-way, drums + harmony in
// the chorus, a stripped bridge, everyone back for the final chorus.
const NOTES: Record<string, Record<string, string>> = {
  Intro: { Keys: "Pad swell, 4 bars" },
  "Verse 1": { "Lead Vocal": "Sing softly, leave space", Keys: "Pad", "Acoustic Guitar": "Light 8ths", Bass: "Enter halfway" },
  Chorus: { "Lead Vocal": "Full voice", "Backing Vocal": "Harmony on 3rds", Keys: "Piano", "Acoustic Guitar": "Full strum", Bass: "Root notes", Drums: "Full groove" },
  "Verse 2": { "Lead Vocal": "Sing softly", Keys: "Pad", "Acoustic Guitar": "Light 8ths", Bass: "Root notes", Drums: "Hi-hats (8ths)" },
  Bridge: { "Lead Vocal": "Build", "Backing Vocal": "Rest", Keys: "Rest", Bass: "Rest", Drums: "Build" },
  "Final Chorus": { "Lead Vocal": "Full voice", "Backing Vocal": "Harmony on 3rds", Keys: "Piano", "Electric Guitar": "Swells", Bass: "Root notes", Drums: "Full groove" },
  Outro: { Keys: "Pad, let it ring", "Lead Vocal": "Rest" },
};

function nextSunday() {
  const d = new Date();
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
  return d;
}

async function ensureRoster(teamId: string) {
  const existing = await prisma.teamMember.findMany({ where: { teamId } });
  const byName = new Map(existing.map((m) => [m.name, m]));
  const members: { id: string; role: string }[] = [];
  for (const r of TEST_ROSTER) {
    let m = byName.get(r.name);
    if (!m) {
      m = await prisma.teamMember.create({ data: { teamId, name: r.name, role: r.role, instrument: r.instrument } });
      await ensurePrimaryTeamMemberRole(prisma, m.id, r.role);
    }
    members.push({ id: m.id, role: r.role });
  }
  return members;
}

async function ensureSongs(teamId: string) {
  const out: { id: string; purpose: string }[] = [];
  for (const t of TEST_SONGS) {
    let song = await prisma.song.findFirst({ where: { teamId, title: t.title } });
    if (!song) {
      song = await prisma.song.create({ data: { teamId, title: t.title, key: t.key, bpm: t.bpm, energy: t.energy } });
      for (const [order, label] of DEFAULT_SONG_STRUCTURE.entries()) {
        const section = await prisma.songSection.create({
          data: {
            songId: song.id,
            label,
            order,
            repeatCount: label.includes("Chorus") ? 2 : null,
            dynamics: DYNAMICS[order],
            lyricsChords: `[${t.key}]Placeholder line one for ${label}\n[${t.key === "G" ? "D" : "A"}]Placeholder line two for testing`,
          },
        });
        for (const [role, content] of Object.entries(NOTES[label] ?? {})) {
          await prisma.songRoleNote.create({ data: { sectionId: section.id, role, content } });
        }
      }
    }
    out.push({ id: song.id, purpose: t.purpose });
  }
  return out;
}

export async function createTestSet(teamId: string): Promise<{ id: string; title: string }> {
  const members = await ensureRoster(teamId);
  const songs = await ensureSongs(teamId);
  const stamp = new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const title = `Test Set — ${stamp}`;
  const set = await prisma.worshipSet.create({
    data: {
      teamId,
      title,
      theme: "Test",
      leaderName: "Test Leader",
      serviceDate: nextSunday(),
      notes: "Test vision: start high, settle into surrender, then send everyone out together.",
    },
  });
  await prisma.setTeamMember.createMany({ data: members.map((m) => ({ setId: set.id, teamMemberId: m.id, role: m.role })) });
  await prisma.setSong.createMany({
    data: songs.map((s, order) => ({ setId: set.id, songId: s.id, order, purpose: s.purpose })),
  });
  return { id: set.id, title };
}

// Removes only what lives in this one team (sets cascade to their songs'
// set rows, practice sessions and rehearsals).
export async function clearTestData(teamId: string) {
  await prisma.worshipSet.deleteMany({ where: { teamId } });
  await prisma.song.deleteMany({ where: { teamId } });
  await prisma.teamMember.deleteMany({ where: { teamId } });
}
