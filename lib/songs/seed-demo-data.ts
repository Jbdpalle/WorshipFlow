import { prisma } from "@/lib/db/prisma";
import { DEFAULT_SONG_STRUCTURE } from "@/lib/songs/constants";
import { ensurePrimaryTeamMemberRole } from "@/lib/songs/team-member-roles";

type SectionNotes = Record<string, Partial<Record<string, string>>>;

type DemoSong = {
  title: string;
  artist: string;
  key: string;
  bpm: number;
  energy: "low" | "medium" | "high";
  durationSeconds: number;
  themeCategory: string;
  biblicalConnection: string;
  lyricsSummary: string;
  tags: string[];
  sectionNotes: SectionNotes;
};

const DEMO_SONGS: DemoSong[] = [
  {
    title: "Your Amazing Love",
    artist: "WorshipFlow Demo Collective",
    key: "G",
    bpm: 72,
    energy: "medium",
    durationSeconds: 258,
    themeCategory: "God's Love",
    biblicalConnection: "1 John 4:19 — We love because He first loved us.",
    lyricsSummary:
      "A reflective declaration of God's love shown before we ever responded to it.",
    tags: ["Love", "God's Love", "Grace"],
    sectionNotes: {
      Intro: {
        "Worship Leader": "Start intimate. No drums.",
        "Acoustic Guitar": "Finger picking only.",
        "Electric Guitar": "Ambient pad. No rhythmic playing.",
        Bass: "Rest.",
        Drums: "No drums.",
        Keys: "Pad only.",
        "Lead Vocal": "Sing lead only, no harmony yet.",
      },
      Chorus: {
        Drums: "Kick + shaker, building gently.",
        Bass: "Enter here, simple root notes.",
        "Backing Vocal": "Add soft harmony on the last line.",
      },
      Bridge: {
        Drums: "Build gradually into the final chorus.",
        "Electric Guitar": "Swell in on bar 5, no earlier.",
      },
      "Final Chorus": {
        Drums: "Full kit, add crash on the downbeat.",
        "Backing Vocal": "Full harmony throughout.",
      },
    },
  },
  {
    title: "Grace Has Found Me",
    artist: "WorshipFlow Demo Collective",
    key: "D",
    bpm: 72,
    energy: "medium",
    durationSeconds: 241,
    themeCategory: "Grace / Mercy",
    biblicalConnection: "Ephesians 2:8 — For it is by grace you have been saved.",
    lyricsSummary: "A personal testimony of being found and forgiven by grace.",
    tags: ["Grace", "Mercy", "Redemption"],
    sectionNotes: {
      Intro: { "Acoustic Guitar": "Solo acoustic only, let it breathe." },
      "Verse 1": { Bass: "Enter only after second chorus — stay out until then." },
      Chorus: { Drums: "Full band from here." },
      Bridge: { Drums: "Build gradually, add toms." },
      "Final Chorus": { "Backing Vocal": "Harmony waits until the final chorus." },
    },
  },
  {
    title: "At the Cross",
    artist: "WorshipFlow Demo Collective",
    key: "E",
    bpm: 68,
    energy: "low",
    durationSeconds: 289,
    themeCategory: "Cross / Sacrifice",
    biblicalConnection: "Romans 5:8 — While we were still sinners, Christ died for us.",
    lyricsSummary: "A weighty, worshipful reflection on Christ's sacrifice.",
    tags: ["Cross", "Sacrifice", "Love"],
    sectionNotes: {
      Intro: { Drums: "No drums." },
      Bridge: {
        "Electric Guitar": "Do not play first 4 bars. Swells enter on bar 5.",
        Drums: "Slow, spacious build — no rushing.",
      },
      "Final Chorus": { "Lead Vocal": "Full conviction, let the band open up." },
    },
  },
  {
    title: "Forever Yours",
    artist: "WorshipFlow Demo Collective",
    key: "C",
    bpm: 140,
    energy: "high",
    durationSeconds: 224,
    themeCategory: "High Praise",
    biblicalConnection: "Psalm 100:1-2 — Shout for joy to the Lord.",
    lyricsSummary: "An energetic, celebratory declaration of devotion.",
    tags: ["Praise", "Joy", "Celebration"],
    sectionNotes: {
      Intro: { Drums: "Count off, full energy from bar 1." },
      Chorus: { "Backing Vocal": "Big harmonies, hands up moment." },
    },
  },
  {
    title: "Love That Never Fails",
    artist: "WorshipFlow Demo Collective",
    key: "A",
    bpm: 90,
    energy: "medium",
    durationSeconds: 246,
    themeCategory: "Our Response to God's Love",
    biblicalConnection: "1 Corinthians 13:8 — Love never fails.",
    lyricsSummary: "A response song committing to reflect God's unfailing love.",
    tags: ["Love", "Faithfulness", "Response"],
    sectionNotes: {
      Chorus: { Keys: "Full pad + rhythmic comping." },
    },
  },
];

const DEMO_MEMBERS = [
  { name: "John", role: "Electric Guitar", instrument: "Electric Guitar" },
  { name: "David", role: "Drums", instrument: "Drums" },
  { name: "Sarah", role: "Lead Vocal", instrument: "Vocals" },
  { name: "Mary", role: "Backing Vocal", instrument: "Vocals" },
  { name: "Peter", role: "Bass", instrument: "Bass" },
  { name: "Grace", role: "Keys", instrument: "Keys" },
];

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function nextSunday() {
  const d = new Date();
  const day = d.getDay();
  const diff = (7 - day) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d;
}

export async function seedDemoDataForTeam(teamId: string) {
  const existingMembers = await prisma.teamMember.findMany({ where: { teamId } });
  const existingNames = new Set(existingMembers.map((m) => m.name));

  const memberByRole = new Map<string, string>();
  for (const m of existingMembers) memberByRole.set(m.role, m.id);

  for (const dm of DEMO_MEMBERS) {
    if (existingNames.has(dm.name)) continue;
    const created = await prisma.teamMember.create({
      data: { teamId, name: dm.name, role: dm.role, instrument: dm.instrument },
    });
    await ensurePrimaryTeamMemberRole(prisma, created.id, dm.role);
    memberByRole.set(dm.role, created.id);
  }

  const createdSongs: { id: string; title: string }[] = [];

  for (const demo of DEMO_SONGS) {
    const song = await prisma.song.create({
      data: {
        teamId,
        title: demo.title,
        artist: demo.artist,
        key: demo.key,
        bpm: demo.bpm,
        energy: demo.energy,
        durationSeconds: demo.durationSeconds,
        themeCategory: demo.themeCategory,
        biblicalConnection: demo.biblicalConnection,
        lyricsSummary: demo.lyricsSummary,
        tags: { create: demo.tags.map((label) => ({ label })) },
        sections: {
          create: DEFAULT_SONG_STRUCTURE.map((label, order) => ({
            label,
            order,
          })),
        },
      },
      include: { sections: true },
    });

    for (const section of song.sections) {
      const notes = demo.sectionNotes[section.label];
      if (!notes) continue;
      for (const [role, content] of Object.entries(notes)) {
        if (!content) continue;
        await prisma.songRoleNote.create({
          data: { sectionId: section.id, role, content },
        });
      }
    }

    createdSongs.push({ id: song.id, title: song.title });
  }

  // Rehearsal history demonstrating change tracking on two songs.
  const graceSong = createdSongs.find((s) => s.title === "Grace Has Found Me");
  const crossSong = createdSongs.find((s) => s.title === "At the Cross");

  if (graceSong) {
    const rehearsal = await prisma.rehearsal.create({
      data: {
        songId: graceSong.id,
        bpmUsed: 72,
        occurredAt: daysAgo(2),
        summary: "Second rehearsal — bass entrance and BPM adjusted.",
        notes: {
          create: [
            { content: "Chorus was too loud." },
            { content: "Bass enters too early." },
            { content: "Key works well." },
          ],
        },
      },
    });
    await prisma.changeLog.createMany({
      data: [
        {
          songId: graceSong.id,
          field: "BPM",
          fromValue: "76",
          toValue: "72",
          reason: "Song felt rushed during rehearsal.",
          createdAt: rehearsal.occurredAt,
        },
        {
          songId: graceSong.id,
          field: "Bass — Verse 1",
          fromValue: "Enters at start",
          toValue: "Enters after second chorus",
          reason: "Too busy under the vocal early on.",
          createdAt: rehearsal.occurredAt,
        },
      ],
    });
  }

  if (crossSong) {
    const rehearsal = await prisma.rehearsal.create({
      data: {
        songId: crossSong.id,
        bpmUsed: 68,
        occurredAt: daysAgo(5),
        summary: "First read-through of the arrangement.",
        notes: {
          create: [
            { content: "Bridge guitar swells landed well." },
            { content: "Slow down the bridge slightly next time." },
          ],
        },
      },
    });
    await prisma.changeLog.create({
      data: {
        songId: crossSong.id,
        field: "Bridge — Electric Guitar",
        fromValue: "Plays throughout",
        toValue: "Rests first 4 bars, swells on bar 5",
        reason: "Created more space for the moment to land.",
        createdAt: rehearsal.occurredAt,
      },
    });
  }

  const existingSet = await prisma.worshipSet.findFirst({
    where: { teamId, title: "Sunday Worship" },
  });

  if (!existingSet && createdSongs.length >= 4) {
    const set = await prisma.worshipSet.create({
      data: {
        teamId,
        title: "Sunday Worship",
        theme: "LOVE",
        keywords: "Love, Grace, Sacrifice, Cross, God's Love, Jesus, Mercy",
        serviceDate: nextSunday(),
        church: "Grace Community Church",
        serviceType: "Sunday Worship Service",
        leaderName: "Joel",
        notes:
          "Keep the set moving from praise into reflection. Let transitions breathe — no rushing between songs 3 and 4.",
        bibleRefs: {
          create: [
            { reference: "1 Corinthians 13:4-8" },
            { reference: "John 3:16" },
            { reference: "Romans 5:8" },
          ],
        },
      },
    });

    const order = [
      { title: "Your Amazing Love", purpose: "Open the set — establish God's love as the theme.", transition: "Let the final chord ring, move directly into song 2." },
      { title: "Grace Has Found Me", purpose: "Personalize the theme — our response to grace.", transition: "Soft landing, count in song 3 quietly." },
      { title: "At the Cross", purpose: "Peak / reflection — the theological center of the set.", transition: "Hold the silence for a moment before the tempo lifts." },
      { title: "Forever Yours", purpose: "Response — celebratory declaration to close.", transition: "End full, let the band land together." },
    ];

    for (let i = 0; i < order.length; i++) {
      const song = createdSongs.find((s) => s.title === order[i].title);
      if (!song) continue;
      const setSong = await prisma.setSong.create({
        data: {
          setId: set.id,
          songId: song.id,
          order: i,
          purpose: order[i].purpose,
          transitionNotes: order[i].transition,
        },
      });

      const roleAssignments: { role: string; memberId?: string }[] = [
        { role: "Lead Vocal", memberId: memberByRole.get("Lead Vocal") },
        { role: "Electric Guitar", memberId: memberByRole.get("Electric Guitar") },
        { role: "Bass", memberId: memberByRole.get("Bass") },
        { role: "Drums", memberId: memberByRole.get("Drums") },
      ];
      for (const ra of roleAssignments) {
        if (!ra.memberId) continue;
        await prisma.songAssignment.create({
          data: { setSongId: setSong.id, teamMemberId: ra.memberId, role: ra.role },
        });
      }
    }
  }
}
