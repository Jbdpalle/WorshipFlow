# WorshipFlow

A worship planning and rehearsal OS: pick a theme, build a setlist, arrange
every song section-by-section with per-role instructions, and run rehearsal
mode from a phone — with a full history of what changed and why.

> **Working name.** "WorshipFlow" communicates worship + flow + team +
> rehearsal well enough to ship the MVP under. Revisit later if it doesn't
> stick.

## Product principle

The worship leader defines the musical and spiritual direction. The app's
theme engine only *suggests* — grouping the leader's own theme, verses, and
keywords into biblical categories and surfacing matching songs from the
team's library. It never claims theological authority ("this song may fit
because its lyrics focus on...", never "God wants you to sing this").

## Features (MVP)

- **Auth & multi-tenancy** — each worship leader signs up and gets an
  isolated team; every set, song, and note is scoped to that team.
- **Create Worship Set** — theme, Bible verses, keywords, service info.
- **Theme engine** — rule-based categorization (God's Love, Cross /
  Sacrifice, Grace / Mercy, High Praise, ...) with song suggestions pulled
  from your own library, never scraped or copyrighted.
- **Setlist Builder** — drag-and-drop reorder, per-song purpose &
  transition notes, key/BPM overrides, team assignment per song.
- **Song Library & Song Detail** — searchable library; key, BPM, time
  signature, energy, theme category, scripture, tags.
- **Arrangement Builder** — custom section structure (Intro, Verse, Chorus,
  Bridge, ...), reorderable, with a role-instruction row per section. A
  Quick Direction picker (Who → chip vocabulary → optional intensity/note)
  replaces typing full sentences, plus copy-from-previous-section and
  section-level intent chips (Build/Drop/Hold/Full).
- **Chart view** — chords and lyrics per section, adjustable text size,
  Lyrics/Chords/Both/Nashville Number display modes, and a display-only
  key transposition that never touches the song's saved key.
- **Import from PDF** — upload a text-based chord chart (e.g. exported from
  SongBook Pro) and it extracts title, artist, key, and per-section
  chords/lyrics automatically. Everything is editable after import; nothing
  is fetched or scraped from the internet — you provide the file, and it's
  for your team's own internal use.
- **Role-specific notes** — Worship Leader, Lead/Backing Vocal, Acoustic /
  Electric Guitar, Bass, Drums, Keys, Piano, Synth, Violin, Other — plus
  custom roles/dynamics labels scoped to a single song, and in-place role
  reassignment anywhere a person is assigned (fixed the wrong instrument
  by accident? change it, don't remove and re-add).
- **Personal notes** — private to each user, distinct from leader direction
  and team notes.
- **Rehearsal Mode** — mobile-first: current/next section, that section's
  team instructions, an embedded metronome, rehearsal-check status
  (Practiced / Needs Work / Confirmed / Changed), and note capture.
- **Metronome** — 30–240 BPM, tap tempo, draggable circular dial (mouse,
  wheel, keyboard, +/-), accented first beat, optional 8th-note
  subdivision.
- **Team & My Part** — roster with roles/instruments; "My Part" filters
  every assigned song down to just that person's instructions.
- **Import Roster** — upload a spreadsheet (.xlsx/.csv) or a typed
  roster image to add/update team members in bulk; if a Date column/value
  matches an existing worship set, it also assigns those people to that
  set's songs by role. Image import needs `ANTHROPIC_API_KEY`; spreadsheet
  import doesn't.
- **Rehearsal History & Change Log** — every rehearsal's notes, plus a
  structured "what changed" log (field, from → to, reason) so the team
  never re-has the same conversation.
- **Feedback** — in-app bug/feature/general feedback, visible in an admin
  inbox to the account in `ADMIN_EMAIL`.
- **Demo experience** — "Try the demo" on the login screen creates an
  instant, fully-seeded account (same example data new signups get) so
  anyone can explore without waiting on an invite.
- **Church/Membership multi-tenancy** — four roles (`OWNER`, `ADMIN`,
  `LEADER`, `MEMBER`); Owner/Admin can rename the church, Owner/Admin/Leader
  get leader-level access (invite people, delete sets, direct rehearsal),
  Member is view-and-participate only. Per-musician login is real: an
  invited email gets its own account at the role it was invited with — see
  **MVP limitations** for the one caveat.
- **Light/dark Appearance toggle** — explicit System/Light/Dark setting,
  independent of the OS.
- **Hover tooltips** — short explanations on icon-only or ambiguous
  controls, app-wide, with a single on/off switch in Settings.
- **Nashville Number System** — a Chart display mode, in addition to chord
  names and lyrics-only.
- **PWA** — installable, with offline shell caching.

### Deliberately out of scope for the MVP

PDF/audio uploads of audio itself (chord-chart *text* PDFs are supported —
see Import from PDF above), click tracks/MIDI, scheduling & availability,
notifications, and AI-generated setlists. The architecture (see
`lib/songs/theme-engine.ts` and the service layer in `lib/actions/`) is
structured so these can be added without a rewrite — see **Roadmap** below.

## Tech stack

- **Framework**: Next.js 16 (App Router, Server Actions), React 19, TypeScript
- **Styling**: Tailwind CSS v4, small hand-rolled UI kit in `components/ui`
  (no external component library dependency)
- **Drag & drop**: `@dnd-kit`
- **Database**: Prisma ORM on Postgres (Neon, Vercel Postgres, Supabase, or
  any standard Postgres instance — see **Deployment** below)
- **Auth**: custom session cookie (HMAC-signed JWT via `jose`), bcrypt
  password hashing — no third-party auth vendor required for the MVP
- **Icons**: Lucide

## Project structure

```
worshipflow/
├── app/
│   ├── (app)/            # authenticated routes (dashboard, sets, songs, ...)
│   ├── api/auth/          # register / login / logout / demo
│   ├── login/, signup/
│   └── layout.tsx, page.tsx
├── components/
│   ├── ui/                # Button, Card, Input, Dialog, Tabs, ...
│   ├── setlist/, songs/, rehearsal/, metronome/, team/, feedback/, layout/
├── lib/
│   ├── db/prisma.ts        # Prisma client singleton
│   ├── auth/                # session, password hashing, route guard
│   ├── actions/              # server actions = the service/API layer
│   └── songs/                  # constants, rule-based theme engine, demo data
├── prisma/
│   ├── schema.prisma
│   └── seed.ts             # local dev seed (npm run db:seed)
└── .env.example
```

## Database model

A `User` authenticates; a `Church` is the top-level tenant boundary; a
`User`'s access to a `Church` is granted by `Membership` (role: `OWNER` /
`ADMIN` / `LEADER` / `MEMBER`), not by owning a `Team` — so one person can
belong to more than one church, and a church can hold more than one `Team`.
`Team` is the working group everything else (songs, sets, rehearsals) is
scoped to. A `WorshipSet` has many `SetSong` (join row carrying order,
purpose, transition notes, key/BPM overrides) pointing at a `Song`. Each
`Song` has many `SongSection` (the arrangement), each `SongSection` has many
`SongRoleNote` (one per role/person pair). `Rehearsal` records belong to a
`Song` (optionally tied to a `SetSong`) and carry `RehearsalNote`s and
`RehearsalCheck`s; `ChangeLog` is the structured "what changed" record,
separate from free-text rehearsal notes. `PersonalNote` is private per
`User`+`Song`. `Feedback` is unscoped (admin-only inbox) by design, since
it's meant to reach the product owner across teams.

Full schema: `prisma/schema.prisma`.

## Setup

Requires a Postgres database — a free local one works fine for development
(`createdb worshipflow` with a local Postgres install, or `docker run -p
5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16`).

```bash
npm install
cp .env.example .env         # set DATABASE_URL (Postgres) and SESSION_SECRET
npm run db:migrate           # applies prisma/migrations/ to your database
npm run db:seed              # optional: seeds leader@worshipflow.app / worshipflow
npm run dev
```

Open http://localhost:3000 — sign up (you'll get an example "Sunday Worship"
set automatically) or click **Try the demo** for an instant account.

## Environment variables

See `.env.example`:

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string, local or production. Vercel's own Postgres/Neon integration sometimes names this `POSTGRES_URL` or `PRISMA_DATABASE_URL` instead — the Prisma client (`lib/db/prisma.ts`) checks all three, in that order |
| `SESSION_SECRET` | yes | Signs the session cookie — generate with `openssl rand -base64 32` |
| `ADMIN_EMAIL` | no | Account allowed to view the `/feedback` inbox |

## Development commands

```bash
npm run dev         # dev server
npm run build        # production build
npm run typecheck     # tsc --noEmit
npm run lint            # eslint
npm run db:push          # sync schema to the database without a migration (quick iteration)
npm run db:migrate        # create and apply a migration
npm run db:seed             # seed a demo account for local testing
```

## Deployment (Vercel)

The schema and an initial migration (`prisma/migrations/20260928164739_init/`)
are already committed and have been verified against a real Postgres
instance (migrate, seed, build, and a full browser walkthrough all passed).
To deploy:

1. Provision a production Postgres database — the fastest path is Vercel's
   own **Storage** tab (Neon-backed) from inside your Vercel project; Supabase
   and standalone Neon also work.
2. Import this GitHub repo in Vercel (vercel.com/new) — it auto-detects
   Next.js, no `vercel.json` needed.
3. In the Vercel project's Environment Variables, set:
   - `DATABASE_URL` — the Postgres connection string (if you used Vercel's
     own Postgres integration, this is filled in for you)
   - `SESSION_SECRET` — `openssl rand -base64 32`
   - `ADMIN_EMAIL` — optional, gates the `/feedback` admin inbox
4. Deploy. The `build` script runs `prisma migrate deploy && next build`,
   so pending migrations apply automatically as part of every Vercel build
   using Vercel's own environment (no local step, no local database
   connectivity needed — useful since some managed Postgres providers,
   e.g. Vercel's own Prisma Postgres, restrict direct connections from
   outside their network). Every subsequent push to the connected branch
   redeploys, and re-applies `migrate deploy` (a no-op if nothing changed).

## Testing the workflow

Automated: `npm run typecheck`, `npm run lint`, `npm run build` all pass.

Manual (verified in a real browser during development): sign up → land on
a dashboard with a pre-seeded "Sunday Worship" / LOVE set → open the
setlist → reorder songs via drag → open a song → edit its arrangement and
add role notes → open Rehearsal Mode → step through sections → start the
metronome → mark a rehearsal check → save rehearsal notes → return to the
song's Rehearsal History tab and see it recorded → log a change and see it
on the Dashboard's "Recently Changed" panel → switch "My Part" to a
different team member and see only their instructions.

## MVP limitations

- Per-musician login exists and works (invite flow creates a real account
  at the invited role), but every account created by signing up directly
  is `OWNER` — inviting people is currently the only way a team ends up
  with `ADMIN`/`LEADER`/`MEMBER` logins, so most teams haven't exercised
  that path yet even though the code fully supports it.
- The theme engine is rule-based keyword matching against your own tagged
  library, not an AI model — by design, per the product principle above.
- No PDF/audio *uploads of audio itself* (chord-chart text PDFs are
  supported), no AI-generated setlists.
- Feedback inbox is a simple admin list, not a triage workflow.
- A user can belong to more than one church (the schema supports it), but
  there's no church-switcher UI yet — they always resolve to their oldest
  ("home") church.
- `TeamPlan` (`FREE`/`PRO`) exists and `lib/plans/limits.ts` enforces its
  limits, but there's no self-serve billing/checkout — upgrading a team to
  `PRO` is a manual step today, not a payment flow.
- Tooltips (see above) are hover/keyboard-focus based; on touch they need
  a long-press rather than a plain tap, since a plain tap has to keep
  doing the control's normal action.

## Roadmap

**Phase 2**: notifications, availability/scheduling, capo suggestions,
richer search, a church-switcher UI for multi-church users, self-serve
billing for `PRO`.

**Phase 3**: AI-assisted setlist generation and scripture/theme
intelligence (opt-in, leader-in-control by design), transition
suggestions, rehearsal-summary briefings per instrument.

**Long-term**: multitrack/Ableton integration, click tracks & MIDI, sermon
& service-order integration, team rotation.
