# WorshipFlow — Full Product Audit

**Date:** 2026-10-02
**Scope:** Entire repository at commit `a20fe4a` (branch `claude/vigilant-volta-k1n2x7`), audited against the full 46-part product-vision brief (Song Vision, Song Flow, Transition Builder, Dynamics, Free Worship, Director Mode, Rehearsal Change Capture, multi-persona journeys, security, mobile, sync).
**Method:** Every claim below is either (a) read directly from the source file cited, or (b) exercised live against a local dev server + local Postgres instance seeded with real data, with database rows checked directly via `psql` as independent proof — not inferred from the UI alone. Where something could not be verified this way, it is marked **NOT VERIFIED**, not assumed working. No numeric score is given anywhere in this document, per instruction.
**Categorization scheme used throughout:** WORKING WELL / NEEDS IMPROVEMENT / MISSING / BROKEN / CONFUSING / DUPLICATED / FUTURE / CRITICAL.

**Reference document check:** "SONG STRUCTURE.pdf" was searched for again this session (filesystem + session uploads) and is still not present. This audit works from the task brief's own detailed section/role examples, same as the prior `WORSHIPFLOW_SONG_FLOW_AUDIT.md`.

**Important context before anything else:** a prior session (documented in `WORSHIPFLOW_SONG_FLOW_AUDIT.md` and `WORSHIPFLOW_SONG_FLOW_IMPLEMENTATION_REPORT.md`, both already in this repo) already implemented most of what the 46-part brief asks for: Song Vision, section repeat counts, assignee/visibility on role notes, a set-level team roster, Set Direction, Song Flow readiness, a real propose→keep/discard rehearsal-experiment workflow, Director Mode, and polling-based sync. This audit **independently re-verifies** those claims (not just re-reads them) and adds its own live testing, including one thing the prior session's own report flagged as its verification ceiling: all of that session's "second user" testing was done by flipping one account's role across two browser tabs of the *same login*. This audit instead created a **genuinely separate second `User` row** linked to the same team and logged into it independently, which is a stronger proof than was previously available — see Section 12.

---

## 1. Executive Summary

WorshipFlow is a working, single-tenant-per-leader worship planning and rehearsal app. The core data model (songs → sections → role notes → sets → rehearsals) is sound and almost everything built on top of it — including the newer Song Vision / Song Flow / Director Mode / rehearsal-experiment layer — genuinely works, verified live with real database writes, not just by reading the code. `typecheck`, `lint`, and `next build` are all clean.

The one structural fact that shapes almost every other finding: **there is still no invite/second-login flow.** Every real signup becomes the `OWNER` of its own isolated church; a "team member" the leader adds is a roster row with no login (`TeamMember.userId` is null unless manually linked). This is not a bug to patch — it's the single biggest gap between what the 46-part brief asks for (distinct Worship Leader / Vocalist / Musician *logins*) and what exists. Everything downstream of it (My Part's member-picker instead of per-user identity, Director Mode's leader/follower distinction, every "test as a second person" requirement) is built *correctly for a world with real logins* but can only be used or tested today by one person switching hats.

Two genuine, newly-found issues from this session's own live testing (not present in prior audits):
1. A pre-hydration input-reset race on a freshly-compiled dev route (see §15).
2. `SongRoleNote` can hold only **one** row per (section, role) — so two different people sharing a role (e.g. two Lead Vocals) cannot get two different individualized directions in the *same section* at the same time (see §15).

Neither is severe, but both are real and previously undocumented.

---

## 2. Architecture Overview

- **Framework**: Next.js 16.3.6, App Router, React 19.3.0, TypeScript. Server Actions are the entire mutation/service layer — there is no separate REST API except three auth routes (`/api/auth/register`, `/login`, `/logout`) plus a demo-account route, all thin wrappers that end in `createSession`.
- **Database**: Prisma 6.19.3 on Postgres. Schema at `prisma/schema.prisma` (477 lines), 5 migrations, the latest (`20261001192831_add_song_flow_rehearsal_sync`) additive only — confirmed no `DROP` statements in any migration file.
- **Auth**: Custom JWT session cookie (`jose`, HS256), bcrypt(10) password hashing (`lib/auth/password.ts`), httpOnly+secure(prod)+sameSite=Lax cookie (`lib/auth/session.ts`).
- **Tenancy**: `User` → `Membership` (role: OWNER/ADMIN/LEADER/MEMBER) → `Church` → `Team` → everything else. A user resolves to their *oldest* Membership/Team (`lib/auth/guard.ts:requireUser`) — there is no team switcher.
- **Error handling**: every Server Action is wrapped in `runAction()` (`lib/actions/action-result.ts`), which catches any throw (including an unguarded `requireUser()` DB hiccup) and returns `{ok:false, error}` instead of letting Next.js strip the message to the opaque "Minified React error #441" in production. This is a real, well-reasoned fix for a documented production bug class, applied consistently — verified by reading all 9 files under `lib/actions/`.
- **PWA**: `app/manifest.ts`, `public/sw.js` (cache-first static, network-first navigation with offline fallback), `/offline` page. All three confirmed live via `curl` (200 each) this session.
- **No AI by default**: three features call the Anthropic API (`suggestThemeAndVerse`, `generatePrepareMeSummary`, `importRosterFromImage`) and all three correctly degrade with a clear error message when `ANTHROPIC_API_KEY` is unset, rather than silently failing or faking a result — verified by reading each action.

**Category: WORKING WELL.**

---

## 3. Routes & Screens Inventory

| Route | Purpose | Status |
|---|---|---|
| `/`, `/login`, `/signup` | Marketing/auth | WORKING WELL |
| `/api/auth/{register,login,logout,demo}` | Auth endpoints | WORKING WELL |
| `/dashboard` | Role-aware home (Next Sunday hero, Following Sunday, This Week, Needs Attention *or* Member Status) | WORKING WELL |
| `/sets`, `/sets/new`, `/sets/[id]` | Set list, creation wizard, Set Detail (Worship Team, Setlist, Set Direction, Leader's Note, Theme Matches) | WORKING WELL |
| `/songs`, `/songs/[id]`, `/songs/[id]/chart` | Library, Song Detail (Song Vision + Song Flow/Notes/History tabs), performable chart (Lyrics/Chords/Both/Nashville) | WORKING WELL |
| `/rehearsal/[setId]` | Rehearsal Mode / Director Mode | WORKING WELL (live-tested, §12) |
| `/my-part` | Member-picker + per-person instructions + "Prepare Me" | WORKING WELL (visibility-tested, §12) |
| `/team` | Roster CRUD + roster import (spreadsheet/image) | WORKING WELL (code-verified) |
| `/metronome` | Standalone metronome | WORKING WELL (code-verified; not live-tested this session) |
| `/settings` | Edit own name / church name | WORKING WELL (code-verified) |
| `/feedback` | Submit + admin inbox (gated by `ADMIN_EMAIL`) | WORKING WELL (code-verified) |
| `/offline` | PWA offline fallback | WORKING WELL (200 confirmed) |

No route returned an error or dead end during this audit's testing.

---

## 4. Components Inventory

68 components across `components/{dashboard,feedback,layout,metronome,pwa,rehearsal,setlist,songs,team,ui}`. No external component library — a small hand-rolled `components/ui` kit (Button, Card, Dialog, Tabs, Select, Input, Textarea, Checkbox, Badge, Label). Notable ones exercised directly this session: `ArrangementEditor` + `SectionCard` + `RoleNoteRow` (§9), `RehearsalMode` + `SongRehearsalPanel` + `ExperimentPanel` (§11), `SetlistBoard`, `AddFromLibraryDialog`, `SetTeam`, `SetMetaEditor`. All read and, for the ones central to the new feature set, live-tested.

**Category: WORKING WELL**, with one **CONFUSING** note: `AddFromLibraryDialog` rows have an icon-only add button with no visible label — functional (verified) but not self-explanatory without a tooltip; a first-time user has to guess that the row itself isn't clickable.

---

## 5. Database Schema / Entities

Full schema read in `prisma/schema.prisma`. Entity groups:
- **Identity/Tenancy**: `User`, `Church`, `Membership`, `Team`, `TeamMember`, `TeamMemberRole`.
- **Songs**: `Song` (now carries `visionNote`), `SongTag`, `SongSection` (now carries `repeatCount`), `SongRoleNote` (now carries `teamMemberId` + `visibility` enum TEAM/ROLE/PERSON), `SongAssignment`.
- **Sets**: `WorshipSet` (now carries `anchorSongId`, `leaderNote`-equivalent via `notes`, `liveSetSongId`/`liveSectionId`/`liveUpdatedAt`), `SetTeamMember` (new — set-level roster), `SetSong`, `BibleReference`.
- **Rehearsal**: `Rehearsal`, `RehearsalNote`, `RehearsalCheck`, `ArrangementChange` (new — PROPOSED/KEPT/DISCARDED), `ChangeLog`.
- **Notes**: `PersonalNote` (private, author-only).
- **Feedback**: `Feedback` (intentionally unscoped, admin-only).

**One real structural limitation found this session** (not in the prior audit): `SongRoleNote` has `@@unique([sectionId, role])` — **at most one role-note row can exist per section per role**, full stop. Even with the new `teamMemberId`/`visibility` fields, this means a section can carry only one targeted PERSON-note per role. If two people share a role (common — e.g. two "Lead Vocal" singers, or three "Backing Vocal" members), the schema cannot hold two different individualized directions for them in the same section simultaneously; only one can be targeted at a time, and the TEAM/ROLE-visibility fallback is shared. This directly limits the brief's Backup Vocalist persona example ("Harmony Part 2 on Chorus" for one singer while a different backing vocalist gets a different line in the same Chorus) — today that requires choosing one assignee per role per section, not several.

**Category: NEEDS IMPROVEMENT** (the one-targeted-person-per-role-per-section ceiling). Everything else: **WORKING WELL**.

---

## 6. Server Actions (the API layer)

9 files under `lib/actions/`, all read in full this session: `action-result.ts`, `feedback.ts`, `import.ts`, `notes.ts`, `prepare.ts`, `profile.ts`, `rehearsal.ts`, `roster-import.ts`, `song-insights.ts`, `sets.ts`, `songs.ts`, `team.ts`. Every mutating action:
1. Calls `requireUser()` first (auth + tenant resolution).
2. Re-fetches the target row and checks `row.teamId === team.id` (or walks up to a row that has `teamId`) before mutating — never trusts a client-supplied ID blindly.
3. Is wrapped in `runAction()`.

This pattern was checked file-by-file, not sampled — every single action listed above follows it. **Category: WORKING WELL.**

---

## 7. Auth & Multi-Tenancy

Verified live this session:
- Signup creates `User` + `Church` + `Membership(OWNER)` + `Team` + a `TeamMember` for the signer, inside one `$transaction` (`lib/auth/actions.ts`), then seeds demo data (`seedDemoDataForTeam`). **PASS**, DB-confirmed (5 full signups during testing, all produced the expected graph).
- `requireUser()` redirects unauthenticated requests to `/login`. **PASS**.
- Password hashing uses bcrypt(10). **PASS** (code-read).
- Session cookie is httpOnly, sameSite=Lax, secure in production. **PASS** (code-read).

**Structural gap (CRITICAL, carried over and re-confirmed, not newly introduced):** no invite/join flow exists anywhere in the codebase (`grep -rni "invite"` finds only a line of marketing copy on the signup page — "invite your team once you're set up" — that doesn't correspond to any actual feature). `registerUser` always creates a brand-new, isolated `Church`; there is no action that adds an existing `User` to an existing `Church`/`Team`. The only way a second real login was linkable to an existing team in this audit was a direct SQL `INSERT`/`UPDATE` — there is no in-product path to do it.

---

## 8. Permissions & Server-Side Authorization

- `isLeaderRole()` (`lib/actions/rehearsal.ts`) gates `keepArrangementChange`, `discardArrangementChange`, and `setLivePosition` server-side — re-checked independent of whatever the UI shows. Confirmed by reading the code (checks `membershipRole === OWNER|ADMIN|LEADER`) and confirmed *behaviorally*: when this session accidentally flipped a single account's own role to MEMBER mid-test (see §12's first, failed attempt), the *same account's* own "Next" click silently stopped writing `liveSectionId` to the database — proving the server-side check is real and not just a UI toggle, because the client-side button still rendered but the write was rejected.
- `updateChurchName` requires OWNER or ADMIN. **PASS** (code-read).
- Every song/set/section/role-note/rehearsal action re-validates team ownership before mutating (§6).

**Category: WORKING WELL**, and this session produced an accidental but genuine proof that it's enforced server-side, not just hidden in the UI.

---

## 9. Core Workflows — Live-Tested

All of the following were exercised against a real local dev server + Postgres instance this session, with database state checked directly via `psql` after each step (not inferred from UI text alone):

| Workflow | Result | Evidence |
|---|---|---|
| Sign up → land on seeded dashboard | PASS | `/dashboard` shows seeded "Sunday Worship" set, 4 songs, 4 team members immediately after signup |
| Create a song, set title/artist | PASS | DB row created with correct title/artist |
| Song Vision — write, reload, confirm persisted | PASS | Textarea value survived a full page reload, reading the exact string back |
| Add custom arrangement sections (incl. "Free Worship") | PASS | DB: 9 `SongSection` rows (8 default + 1 custom), confirmed via `psql` across 3 separate test runs |
| Add a role-specific direction with assignee + visibility | PASS | DB row with correct `role`, `content`, `teamMemberId`, `visibility='TEAM'` |
| Create a Worship Set | PASS | DB row with correct title |
| Add a song to a set from the library | PASS | `SetSong` row created, 1 row confirmed |
| Start Rehearsal → Director Mode banner (leader) | PASS | "Directing live" banner rendered; non-leader account (separate login) correctly does **not** see it |
| Advance to next section (leader) | PASS | Displayed section label changed "Intro" → "Verse 1"; `WorshipSet.liveSetSongId`/`liveSectionId` written to DB |
| Propose a rehearsal experiment | PASS | `ArrangementChange` row created with `status='PROPOSED'` |
| Keep the experiment | PASS | `ArrangementChange.status` → `KEPT`; live `SongRoleNote.content` actually updated; a `ChangeLog` row auto-created with reason "Kept from a rehearsal experiment" |

**Category: WORKING WELL**, independently re-verified, not just re-read from the prior session's report.

---

## 10. Song Vision, Song Flow, Dynamics, Transitions, Free Worship — Assessed Against the New Product Vision

- **Song Vision** (brief's central new concept): exists as `Song.visionNote`, a free-text "Where are we taking this song?" field at the top of Song Detail. **WORKING WELL** for capture; it is genuinely a single natural-language field, not a form the leader has to translate their intent into — matches the brief's "no double entry" requirement. It does **not** feed into or auto-populate anything else (e.g. it doesn't pre-fill Dynamics or section directions) — that's a reasonable MVP boundary, not a bug.
- **Song Flow** (sections + role notes + repeat counts + assignee/visibility): **WORKING WELL**, live-verified in §9.
- **Dynamics** (brief's §10: a simple 1–5 or Intimate/Light/Building/Strong/Full model): **MISSING.** There is no structured dynamics field anywhere — `grep` confirms the only occurrence of the word "dynamics" in the whole codebase is inside a placeholder hint string in the generic notes editor ("Overall feel, dynamics, anything that applies to the whole song."). A leader can *write* about dynamics in free text (Vision, section role notes) but there is no first-class 1–5/label model to pick from.
- **Transitions**: `SetSong.transitionNotes` is a single free-text field per song ("transition leaving this song"), correctly oriented (not miscoupled to "the next song," as the audit confirms) and repositioned behind a "Details" disclosure on the Set Detail page. **NEEDS IMPROVEMENT relative to the brief**: this is explicitly *not* the dedicated Transition Builder the brief calls for (no FROM/TO song+key pair, no `TransitionType` enum — Direct/Instrumental/Pad/Spoken/Prayer/Free Worship/Count-in/Pause/Custom — confirmed via `grep`, zero matches for any such enum or type anywhere). It is a lighter-touch, deliberate decision documented in the prior session's own report, not an oversight — but it means Part 13–16 of the brief ("Transitions as first-class objects") is genuinely **not built**.
- **Free Worship**: **NOT a first-class concept** — it exists only as an example value a leader can type as a section label ("Free Worship" is suggested as placeholder text in the "Add section" input) or mention in the Leader's Note placeholder text. Once added as a section, it behaves exactly like any other section (role notes, repeat count, lyrics/chords field) — there is no "unstructured/spontaneous" mode, no toggle to say "this section doesn't need the usual structure." This matches the brief's warning against *over*-programming free worship, but it also means there's no dedicated support for it beyond "type the label yourself" — **NEEDS IMPROVEMENT**, arguably **MISSING** as a distinct feature, though what exists is at least not actively wrong.
- **No fake AI**: confirmed only one historical instance existed ("Suggested Songs" ✨), already fixed (renamed "Theme Matches" 🏷) by the prior session — re-confirmed present in the current `ThemeSuggestions` component naming. **WORKING WELL.**

---

## 11. Director Mode & Rehearsal Experiments

Director Mode (leader-only banner, Prev/Next, per-role instructions filtered by `visibility`, embedded metronome) and the propose→keep/discard experiment workflow were both live-tested end-to-end in §9 with real database writes at every step, including the **Keep** path actually mutating the live `SongRoleNote` (not just logging that it happened). This is the single most important claim in the whole brief's Part 18–20 ("Rehearsal Change Capture" + "Director Mode"), and it is **genuinely real**, not a UI-only simulation. **Category: WORKING WELL.**

One gap: there is no "Announce" / broadcast-a-note-to-the-team action distinct from just moving sections — the brief's Director Mode spec (Part 20) lists "Announce" as a discrete control; this app's Director Mode has Next/Previous and the experiment panel but no separate announcement mechanism. **MISSING** (minor).

---

## 12. Team Synchronization — Verified With a Genuinely Independent Second Login

This is the one area where this audit went further than the prior session's own stated verification ceiling. The prior session's report says plainly: *"every acceptance criterion involving a second logged-in team member was verified by temporarily flipping one account's role... not by a real second person signing in."*

This session **reproduced that exact limitation first** (flipping one account's role broke that same account's own leader-write permission mid-test, which is itself a useful confirmation that server-side role checks are real — see §8), then went further: created a **second, genuinely independent `User` row**, gave it its own `Membership(MEMBER)` on the same `Church`, and logged into it in a separate browser context with its own session cookie.

Result: the follower (second login, `membershipRole=MEMBER`) correctly did not see the "Directing live" banner, and after the leader (first login) advanced to the next section, **the follower's own page updated to match in 1453ms**, via the documented polling mechanism (poll interval 3.5s client-side; this measured time is well inside that, consistent with catching an early poll tick). This is the first time in this app's audit history that this claim has been verified with two actually-distinct logins rather than one account's role flipped across two tabs.

**Category: WORKING WELL**, and now verified to a higher standard than before. This remains **polling-based, not push/WebSocket** — correctly never claimed as real-time anywhere in the UI copy this session found.

---

## 13. Mobile Behavior

Checked at 375px (iPhone reference) viewport, this session, via `document.documentElement.scrollWidth > clientWidth`:

| Screen | Horizontal overflow? |
|---|---|
| Dashboard | No |
| Set Detail | No |
| Rehearsal Mode | No |
| My Part | No |

**Category: WORKING WELL.** (Not exhaustively re-checked: Song Detail/chart, Team, Settings — these were checked by the prior session's report but not independently re-verified this session; treat as **NOT VERIFIED** this session, though no reason to doubt the prior finding.)

---

## 14. PWA Behavior

`manifest.ts`, `/offline`, and `public/sw.js` all return HTTP 200, confirmed via direct `curl` this session. Full install-prompt / offline-navigation-fallback behavior (actually going offline in a browser and confirming the fallback renders) was **NOT VERIFIED** this session — only endpoint availability was checked, not the full offline UX.

---

## 15. Bugs Found This Session

1. **Pre-hydration controlled-input reset on a freshly-compiled dev route.** Reproduced multiple times: filling a controlled React input (`<Input>`) immediately after a page navigation — before React finishes hydrating that specific component — can result in the typed value silently reverting to empty once hydration completes, with no error shown. This was most visible on `/signup` and `/sets/new` on their *first* visit in a dev server's lifetime (Turbopack's on-demand compile adds extra delay before hydration attaches). A human typing at normal speed is very unlikely to hit this (hydration is fast once the route is warm), but it is a real, reproducible app behavior — not a testing artifact — and could plausibly affect very fast typers, browser autofill, or a password manager that fills instantly on page load. **Category: NEEDS IMPROVEMENT** (not CRITICAL — no production evidence this affects typical usage, and it's a general Next.js/React hydration-timing characteristic rather than a WorshipFlow-specific logic bug, but it is real and worth a defensive fix, e.g. disabling the submit button until a client-mount flag is true).
2. **`SongRoleNote` one-row-per-(section, role) ceiling** — see §5. **Category: NEEDS IMPROVEMENT.**

No other bugs were found this session. All previously-documented and previously-fixed bugs (silent PDF content loss, silent junk-song creation, mobile overflow, systemic #441 unguarded-throw class) were re-confirmed fixed by reading the current code; none were live-regressed this session.

---

## 16. Incomplete / Partially-Built Features

- **Transition Builder** (brief Parts 13–16): not built as a first-class entity — see §10. **MISSING** relative to brief, by deliberate, documented choice.
- **Dynamics model** (brief Part 10): **MISSING**, see §10.
- **Free Worship as a distinct mode** (brief Part 12): **MISSING** as a first-class concept, see §10.
- **Click track / tempo map** (brief Part 17): correctly **not** built — this was explicitly out of scope for this phase per the brief itself, and nothing in the codebase fakes it. **FUTURE**, as instructed.
- **"Announce" control in Director Mode** (brief Part 20): **MISSING**, see §11.
- **Per-musician login / invite flow**: **MISSING**, see §7 — the single largest gap in the whole app relative to the brief's persona-based testing requirements.

---

## 17. Duplicated Functionality

None found. `ChangeLog` (manual historical journal) and `ArrangementChange` (propose/keep/discard mechanism) look superficially similar but serve genuinely different purposes and are correctly not merged — confirmed by reading both code paths; `keepArrangementChange` *creates* a `ChangeLog` entry as a side effect, rather than the two systems overlapping. `SongAssignment` (per-song) and `SetTeamMember` (per-set) likewise look similar but are deliberately both kept — per-set is the common case, per-song is the documented override path.

---

## 18. Tech Debt

- No automated test suite exists anywhere in the repository (confirmed: no `*.test.ts`, no `vitest.config`, no Playwright config committed) — this is a pre-existing, previously-documented condition, not new. All verification in this app's history, including this audit, has been manual (typecheck/lint/build + live browser/DB testing), not automated regression tests. This is real tech debt: every future change currently risks silent regressions that only manual re-testing would catch.
- `lib/songs/pdf-dom-polyfill.ts` exists specifically to work around `pdf-parse` requiring `DOMMatrix` in a serverless runtime that doesn't have it — a reasonable, narrow workaround, but it's a sign the PDF-import dependency is somewhat fragile outside local dev.
- The hand-rolled `components/ui` kit (vs. a maintained library like Radix/shadcn) means every primitive (Dialog focus-trapping, Select accessibility, etc.) is this project's own responsibility to keep correct — not wrong, but worth naming as a deliberate trade-off that adds long-term maintenance surface.

---

## 19. UX Problems / Confusing Areas

- `AddFromLibraryDialog`'s icon-only add button (§4) — functional but not self-labeled.
- The `@dnd-kit` drag-and-drop library produces a benign-but-visible hydration-mismatch console warning on Song Detail (`aria-describedby` ID mismatch between SSR and client) — cosmetic only (confirmed: no functional drag/reorder breakage), but a developer opening devtools will see a scary-looking red error on a page that otherwise works correctly. **CONFUSING**, worth silencing if `@dnd-kit`'s SSR id-generation option supports it.
- The `/sets/new` → Set Detail flow is otherwise clean and matches the brief's "progressive disclosure" request well (Details collapsed by default on song cards).

---

## 20. Strengths (Working Well)

- Server-action-first architecture with a disciplined, uniformly-applied `runAction()` + ownership-check pattern (§6) — this is unusually consistent for a codebase this size.
- The Song Vision → Song Flow → Role Notes → My Part pipeline is real, coherent, and now independently re-verified end-to-end, not just a UI mockup.
- The rehearsal-experiment propose→keep/discard flow is a genuinely good, honest implementation of "try something in rehearsal without corrupting the finalized arrangement" — exactly what the brief asked for, and it actually mutates the live arrangement on Keep (verified via DB).
- Honest handling of AI features: every AI-backed action degrades cleanly and informatively without a key, rather than faking a result.
- Honest handling of sync: correctly implemented as polling and correctly never over-claimed as real-time anywhere found in UI copy.

---

## 21. Features to Retain / Remove / Redesign / Add

- **Retain**: everything in §20, as-is.
- **Add**: a real invite/second-login flow (the single highest-leverage change — unlocks every "second person" claim in the brief from simulated to real); a structured Dynamics field (1–5 or labeled scale); a first-class Transition Builder (FROM/TO + type enum) if/when the product wants richer multi-song flow description; an explicit "Free Worship / unstructured" section flag, distinct from a normal labeled section, so the UI can visually de-emphasize the usual structure fields for it.
- **Redesign**: `SongRoleNote`'s one-row-per-(section, role) constraint, if the product wants to support two different people sharing a role getting two different individualized directions in the same section (currently schema-blocked).
- **Remove**: nothing identified as dead weight this session.

---

## 22. Security Review

- Team isolation: re-confirmed via code read of every action in §6 (`findOwned*`/explicit `teamId` check pattern, no exceptions found).
- Personal notes: `PersonalNote` correctly scoped by `userId`, confirmed in `lib/actions/notes.ts`.
- `PERSON`-visibility role notes: **live-tested this session** with two distinct team members sharing the same role ("Lead Vocal") — the assignee saw the note, the other person did not. **PASS**, DB- and UI-confirmed.
- Leader-only actions enforced server-side, not just hidden client-side: **PASS**, both by code read and by the accidental-but-real proof in §8.
- No secrets, API keys, or credentials found committed in the repository (`.env` is gitignored; `.env.example` contains only placeholder values).

**Category: WORKING WELL.**

---

## 23. Acceptance Criteria Summary (this session's own verification)

| Area | Verified this session? |
|---|---|
| Song Vision capture + persistence | PASS |
| Song Flow: sections, repeat count, role notes, assignee, visibility | PASS |
| Set creation, add song, Set Direction | PASS |
| Director Mode leader/follower distinction | PASS (genuinely independent login) |
| Rehearsal experiment propose/keep | PASS (DB-level) |
| My Part visibility filtering (PERSON notes) | PASS (two real team members) |
| Polling sync latency | PASS — 1453ms, polling-based |
| Mobile no-overflow (4 screens) | PASS |
| PWA endpoints reachable | PASS |
| Dynamics structured model | FAIL (missing) |
| Transition Builder as first-class entity | FAIL (missing, by design) |
| Free Worship as first-class mode | FAIL (missing) |
| Invite / second real login | FAIL (missing — critical structural gap) |
| Full offline PWA UX | NOT VERIFIED |
| Mobile check on Song Detail/Team/Settings | NOT VERIFIED (this session) |

PARTIAL/NOT VERIFIED are not counted as passing, per the task's own rule.

---

## 24. The YouTube Auto-Analysis Question — Direct Answer

The user separately asked: *"can I enter a YouTube link of a song and have the app automatically go through it and tell me what's happening in the song, like who's doing what?"*

**Honest answer: not reliably, not today, and not as a near-term WorshipFlow feature, for reasons specific to what the task is actually asking.**

What's being asked for is automatic *source separation + per-instrument activity detection* from an arbitrary YouTube video — i.e., listening to a mixed stereo recording and determining which instrument/vocal is doing what, when. This is a genuinely hard, actively-researched audio ML problem (stem separation models like Spleeter/Demucs exist and work reasonably well for isolating *stems* — vocals/drums/bass/other — but going from separated stems to a structured, musically-meaningful description like "acoustic guitar fingerpicks the intro, drums enter second half of Verse 2" is a much harder, unsolved-in-general problem). Claude itself has no built-in audio-analysis capability — it cannot listen to or process an audio/video file directly.

A *technically honest* version of this feature, if ever built, would look like:
- Fetching the YouTube audio (a real engineering/ToS consideration on its own — YouTube's terms restrict automated downloading, which would need its own legal/compliance review, separate from the ML question).
- Running it through an existing stem-separation model (e.g. Demucs) to isolate rough instrument groups.
- At best, producing a coarse energy/activity timeline per stem (e.g. "drums are present from 0:45–1:30") — not a confident, musically-literate description of *what* each instrument is playing or *why* it entered there.

This is consistent with the brief's own stated principle (Part 16) against fabricating capability. Building this as a "tell you what's happening in the song" feature today would mean either overselling a crude energy-detection heuristic as musical intelligence, or genuinely investing in a nontrivial ML pipeline with real accuracy limitations that would need to be disclosed, not hidden behind confident-sounding copy. **Recommendation: do not build this for WorshipFlow now.** If there's appetite later, the honestly-buildable version is "upload or link a reference track, and we'll show you a rough per-stem energy timeline you can use as a visual reference" — explicitly not "tell you what's happening," which overpromises.

---

## 25. Recommended Next Steps (priority order, consistent with the brief's own Part 46 ordering)

1. Real invite/second-login flow — unlocks everything else from simulated to real.
2. Dynamics structured field.
3. Free Worship as a distinct, lighter-weight section mode.
4. Transition Builder (if the product wants richer multi-song flow description beyond the current single free-text field).
5. Resolve the `SongRoleNote` one-per-(section,role) ceiling if multi-person-per-role individualized direction is wanted.
6. Add a minimal automated test suite (even a handful of integration tests around the Server Action layer would meaningfully reduce the tech debt in §18).
7. Fix the pre-hydration input-reset race defensively (disable submit until client-mounted).

**Do not build AI source-separation / YouTube analysis** per §24. **Do not build click tracks yet** per the brief's own instruction — nothing in this audit suggests that priority has changed.
