import { prisma } from "@/lib/db/prisma";
import { ensurePrimaryTeamMemberRole } from "@/lib/songs/team-member-roles";

// The "Try Demo" account's starting content — deliberately ONE song, richly
// filled in (sections, directions including the "Rest of the Band"/"Rest of
// the Vocals" group directions, dynamics, lyrics/chords) so the guided tour
// can demonstrate the full Song Flow workflow without the clutter of a
// multi-song library. All lyric/chord text below is original, written for
// this demo — not taken from any real song. Separate from
// seedDemoDataForTeam (lib/songs/seed-demo-data.ts), which still seeds the
// larger multi-song sample library used by real accounts' "load sample
// data" action and the local dev seed script.

const DEMO_MEMBERS = [
  { name: "Alex", role: "Drums", instrument: "Drums" },
  { name: "Priya", role: "Keys", instrument: "Keys" },
  { name: "Sam", role: "Lead Vocal", instrument: "Vocals" },
];

const SONG_SECTIONS: {
  label: string;
  dynamics: "Intimate" | "Light" | "Building" | "Strong" | "Full";
  lyricsChords?: string;
  directions?: Record<string, string>;
}[] = [
  {
    label: "Intro",
    dynamics: "Intimate",
    lyricsChords: "G             Em\nBe still, be still before Him",
    directions: {
      Keys: "Soft pad only, let it breathe.",
      "Rest of the Band": "Rest — just Keys for now.",
    },
  },
  {
    label: "Verse 1",
    dynamics: "Light",
    lyricsChords: "C             G\nIn the quiet, You are near",
    directions: {
      "Lead Vocal": "Sing melody only, no harmony yet.",
      Drums: "Stay minimal — brushes or hi-hat only.",
    },
  },
  {
    label: "Chorus",
    dynamics: "Building",
    lyricsChords: "G        D         Em       C\nStill before You, I will rest, I will trust",
    directions: {
      Drums: "Full kit enters here, keep it driving but not busy.",
      "Rest of the Vocals": "Hum underneath — join fully on the second chorus.",
    },
  },
  { label: "Verse 2", dynamics: "Light" },
  { label: "Chorus", dynamics: "Building" },
  {
    label: "Bridge",
    dynamics: "Strong",
    directions: {
      Drums: "Build gradually across the bridge — no rushing.",
      Keys: "Add rhythmic comping under the build.",
    },
  },
  { label: "Final Chorus", dynamics: "Full" },
  { label: "Outro", dynamics: "Intimate" },
];

export async function seedDemoWalkthroughSong(teamId: string) {
  for (const dm of DEMO_MEMBERS) {
    const created = await prisma.teamMember.create({
      data: { teamId, name: dm.name, role: dm.role, instrument: dm.instrument },
    });
    await ensurePrimaryTeamMemberRole(prisma, created.id, dm.role);
  }

  const song = await prisma.song.create({
    data: {
      teamId,
      title: "Still Before You",
      artist: "WorshipFlow Demo",
      key: "G",
      bpm: 72,
      energy: "medium",
      themeCategory: "Trust & Rest",
      biblicalConnection: "Psalm 46:10 — Be still, and know that I am God.",
      lyricsSummary: "A quiet declaration of trust that builds into confident, full-voiced worship.",
      visionNote: "Start intimate — let it build gently into a confident declaration by the final chorus.",
      tags: { create: [{ label: "Trust" }, { label: "Rest" }] },
      sections: {
        create: SONG_SECTIONS.map((s, order) => ({
          label: s.label,
          order,
          dynamics: s.dynamics,
          lyricsChords: s.lyricsChords ?? null,
        })),
      },
    },
    include: { sections: true },
  });

  // SONG_SECTIONS has two "Chorus" entries with identical label+dynamics,
  // so match by creation order (section.order), not by content — a
  // label/dynamics lookup would resolve both to the same spec.
  const sectionsByOrder = [...song.sections].sort((a, b) => a.order - b.order);
  for (let i = 0; i < sectionsByOrder.length; i++) {
    const spec = SONG_SECTIONS[i];
    if (!spec?.directions) continue;
    for (const [role, content] of Object.entries(spec.directions)) {
      await prisma.songRoleNote.create({ data: { sectionId: sectionsByOrder[i].id, role, content } });
    }
  }

  return song;
}
