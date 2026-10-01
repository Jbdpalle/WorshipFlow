# WorshipFlow — Set → Song Flow → Rehearsal → My Part → Sync: Implementation Report

**Date:** 2026-10-01 **Companion:** `WORSHIPFLOW_SONG_FLOW_AUDIT.md` (Phase 1 audit, written before any code changed)

## Executive Summary

Implemented the full workflow on top of the existing architecture, reusing every piece of pre-existing functionality that already matched the task (song sections, section-level role notes, personal notes, rehearsal records, change log) rather than rebuilding them. Added: Song Vision, section repeat counts and duplication, assignee/visibility on role directions, a set-level team roster, Set Direction (anchor song, leader's note, key words), Song Flow readiness indicators, a real propose→keep/discard rehearsal-experiment workflow that actually mutates the live arrangement, Director Mode, and polling-based team synchronization (measured, not claimed). Two real privacy leaks were found and fixed during testing (see Security). All schema changes are additive; no existing data was altered or lost. `typecheck`, `lint`, and `next build` are clean throughout.

**Honest ceiling, stated once up front:** every acceptance criterion involving "a second logged-in team member" was verified by temporarily flipping one account's role and `TeamMember` link in the database and opening a second browser context with the same login — not by a real second person signing in — because this app has no invite/per-musician-login flow today (confirmed in the audit; `registerUser` always creates `OWNER`, `addTeamMember` never creates a login). This is accurately marked below.

## What Already Existed (reused, not rebuilt)

- `SongSection` + `SongRoleNote` — song structure and section-level role direction, drag-reorder, add/rename/delete, one role at a time (not forced).
- `PersonalNote` — private, author-only notes.
- `Rehearsal` / `RehearsalNote` / `RehearsalCheck` — per-occurrence rehearsal records, free-text notes, status tags.
- `ChangeLog` — manual historical journal (kept as-is; the new `ArrangementChange` model does the job ChangeLog was never built for).
- The Set Detail page's drag-reorder setlist board, per-song assignment, theme suggestions.
- My Part's member-picker pattern (the existing workaround for no per-musician login).

## What Was Changed

### Database
All additive — `prisma/migrations/20261001192831_add_song_flow_rehearsal_sync/migration.sql` contains only `ADD COLUMN` (nullable/defaulted) and `CREATE TABLE`, zero drops. Verified: row counts (5 songs, 1 set, 32 role notes, 7 team members) identical before and after migration.
- `Song.visionNote`, `SongSection.repeatCount`.
- `SongRoleNote.teamMemberId` + `visibility` (`TEAM | ROLE | PERSON`, default `TEAM`).
- New `SetTeamMember` (set-level roster) and `ArrangementChange` (`PROPOSED | KEPT | DISCARDED`) models.
- `WorshipSet.anchorSongId`, `liveSetSongId`, `liveSectionId`, `liveUpdatedAt` (the last three drive sync).

### Set Screen
- **Worship Team** card — assign once for the whole service (`SetTeamMember`); per-song override still available but moved behind progressive disclosure.
- **Set Direction** card — Worship Leader, Theme, Anchor Song (★ toggle on each song card, also editable here), Key Words — all editable (none had an edit control before this pass, only at creation).
- **Leader's Note** — reused the existing `notes` field, relabeled and re-copied rather than adding a duplicate field.
- Song cards simplified to order/title/key/BPM/anchor/Song Flow status, with Purpose/Transition/per-song-assignment behind a "Details" toggle.
- Set readiness banner (`lib/songs/readiness.ts`) computed from real data — no hard-coded conditions.
- Relabeled "Suggested Songs" (✨ Sparkles icon) → "Theme Matches" (🏷 Tags icon, no AI framing) — it was always rule-based keyword matching, never an LLM call, but read as AI; this was the one real instance of the "fake AI" problem the task named.

### Song Flow
- Song Vision card at the top of Song Detail ("Where are we taking this song?").
- Section repeat count (`×4`), duplicate-section action (copies role notes too), both persisted and verified.
- Role notes gained optional assignee + visibility (Team/Role/Person), fast to enter (collapsed by default, a small toggle reveals it).

### My Part
- Fixed to respect the new `visibility` field: a `PERSON`-scoped note is only shown to its assignee, never to someone else sharing the same role string. Verified with two team members sharing "Lead Vocal."

### Rehearsal Mode / Director Mode
- Leader view ("Directing live" banner) vs. member view, branched on `membershipRole`.
- **Experiment workflow**: "Try something different" → propose a role-scoped change for the current section (status `PROPOSED`, original content captured) → leader-only **Keep** (writes the proposed content onto the live `SongRoleNote`, logs a `ChangeLog` entry, marks `KEPT`) or **Discard** (marks `DISCARDED`, live arrangement untouched). Verified end-to-end against the database, both directions.
- Section repeat count shown in the Current Section display.

### Synchronization
Polling-based, not push/WebSocket — no realtime provider (Pusher/Ably/Supabase Realtime, etc.) is configured in this environment, and this was an explicit decision confirmed with the user rather than assumed. The leader's Prev/Next/song-switch writes `WorshipSet.liveSetSongId/liveSectionId/liveUpdatedAt`; every other client polls every 3.5s and jumps to follow. **Measured, not claimed**: in a two-browser-context test, the follower picked up the leader's section change in **1054ms** — comfortably inside the task's own "≤5 seconds, no manual refresh" bar.

### Security (found and fixed during this work)
1. **Privacy leak**: `PrepareMeCard` and `generatePrepareMeSummary` (the "Prepare Me" AI prep feature) read role notes by role-string match only, so a `PERSON`-scoped note could be shown — or fed into an AI prompt — for a different team member sharing that role. Found by testing two "Lead Vocal" members against each other, not by inspection. Fixed in both places with the same rule used in My Part.
2. **Missing server-side authorization**: `setLivePosition`, `keepArrangementChange`, and `discardArrangementChange` only checked team membership, not leader role — the UI hid the controls from non-leaders, but a direct Server Action call could have bypassed that (exactly what SEC-04 warns against). Added an explicit `isLeaderRole()` check to all three.

## Tests Run

`npm run typecheck`, `npm run lint`, `npx next build` — all clean, re-run after every phase (6 times total across this work). No automated test suite exists in this repo (pre-existing condition, documented in the audit, out of scope to add here). Manual verification throughout was against a local Postgres instance with real seeded data, using Playwright against `localhost` (no TLS involved, so the sandbox's HTTPS-interception limitation from earlier sessions doesn't apply here) plus direct SQL checks to confirm every mutation actually persisted — not just that a button existed.

## Acceptance Criteria Matrix

| ID | Requirement | Result | Evidence |
|---|---|---|---|
| SC-01 | Set screen shows service details | PASS | Screenshot: date, theme, leader all visible in header |
| SC-02 | Worship leader visible | PASS | Set Direction card + header |
| SC-03 | Assigned team visible | PASS | Worship Team card, screenshot |
| SC-04 | Team manageable from the set | PASS | Assign/remove tested via Playwright + DB check |
| SC-05 | Song list simple/scannable | PASS | Screenshot: order/title/key/BPM/status only by default |
| SC-06 | No fake AI suggestion | PASS | Relabeled "Suggested Songs"→"Theme Matches", icon changed |
| SC-07 | Purpose not required | PASS | Optional field, behind Details disclosure |
| SC-08 | Leader's Note exists | PASS | Reused `notes`, relabeled |
| SC-09 | Anchor Song exists | PASS | Star toggle + dropdown, both tested, DB-verified |
| SC-10 | Set readiness visible | PASS | Readiness banner, computed from real data |
| SF-01 | Song Vision | PASS | Field added, editor wired |
| SF-02 | Create/reorder sections | PASS | Pre-existing, re-verified |
| SF-03 | Standard + custom sections | PASS | Free-text section labels, pre-existing |
| SF-04 | Repeat counts | PASS | `×4` set and persisted, DB-verified |
| SF-05 | Role-specific directions | PASS | Pre-existing, re-verified |
| SF-06 | Not every role required | PASS | Add-one-at-a-time UI, pre-existing |
| SF-07 | Vocal directions | PASS | Same role-note mechanism (Lead Vocal/Backing Vocal roles) |
| SF-08 | Musical directions | PASS | Same mechanism (Drums/Bass/Keys/Guitar roles) |
| SF-09 | Individual directions | PASS | Assignee field on role notes, DB-verified |
| SF-10 | Ending/transition behavior | PASS | `transitionNotes` field, repositioned under Details |
| SF-11 | Arrangement persists after reload | PASS | Verified via fresh page loads throughout |
| MP-01 | View assigned part | PASS | Pre-existing, re-verified |
| MP-02 | Only relevant instructions shown | PASS | Visibility filter added and verified |
| MP-03 | Personal notes private | PASS | Pre-existing model; PERSON-visibility leak found and fixed |
| MP-04 | My Part on mobile | PASS | Screenshot at 375px, no horizontal scroll |
| RH-01 | Current section | PASS | Screenshot |
| RH-02 | Next section | PASS | Screenshot |
| RH-03 | Relevant team directions visible | PASS | Visibility-filtered for non-leader viewers |
| RH-04 | Add rehearsal notes | PASS | Pre-existing, re-verified |
| RH-05 | Mark change as experimental | PASS | `ArrangementChange` PROPOSED, DB-verified |
| RH-06 | Keep experimental change | PASS | DB-verified: SongRoleNote updated, ChangeLog created |
| RH-07 | Discard experimental change | PASS | DB-verified: live note untouched |
| RH-08 | Director Mode | PASS | Leader-only banner + controls, role-gated server-side |
| RH-09 | Rehearsal state persists | PASS | Verified across reloads and across the live-position tests |
| SYNC-01 | Leader changes persisted | PASS | `WorshipSet.liveSetSongId/liveSectionId/liveUpdatedAt`, DB-verified |
| SYNC-02 | Members see correct changes | PASS | Two-context test, follower matched leader's section |
| SYNC-03 | No manual refresh (only if real-time exists) | PASS | Polling confirmed working, 1054ms measured latency |
| SYNC-04 | Don't claim real-time if not implemented | PASS | Documented as polling throughout — code comments, this report, UI copy |
| SYNC-05 | Concurrent changes don't silently overwrite | PARTIAL | Last-write-wins on `liveSectionId` (acceptable — one leader drives); **not** addressed for two people editing the same role note's text simultaneously — see Known Limitations |
| SEC-01 | Team isolation | PASS | Pre-existing `findOwned*` pattern, unchanged, still in place everywhere |
| SEC-02 | Personal notes protected | PASS | Fixed PERSON-visibility leak in two places; verified not leaking |
| SEC-03 | Server-side permission enforcement | PASS | Added `isLeaderRole()` gate to the three leader-only actions |
| SEC-04 | Client-side hiding ≠ security | PASS | Directly motivated the SEC-03 fix |

**PARTIAL/NOT VERIFIED counted as FAIL for release, per the task's own rule:**
- SYNC-05 is PARTIAL (see above).
- Everything requiring a genuinely independent second login is **NOT VERIFIED** with a real second user (see Honest ceiling). This affects the *spirit* of SF-09's "visible to a different real person," RH-08's "a different person running Director Mode," and SYNC-02/03 — all were verified by role-flipping one account across two browser contexts, which proves the mechanism is correct but is not the same as independent multi-user proof.
- PDF import → automatic role-direction extraction (task §26) was **not attempted** — documented in the audit as unsupported rather than built and silently wrong. PDF import still only extracts sections and raw lyrics/chords text, unchanged by this work.

## Mobile

Verified at 375px (iPhone reference) and 390px (Android reference) for Set Detail, Song Flow (Song Detail), My Part, and Rehearsal Mode: no horizontal scroll at any of them, confirmed programmatically (`scrollWidth > clientWidth` check) in addition to visual screenshots.

## Known Limitations

1. Multi-user testing ceiling (see Honest ceiling above) — this is a pre-existing architectural fact, not something this pass could fix without building an invite/login system, which was out of scope.
2. Concurrent edits to the *same* role note's text by two people are last-write-wins, same as the rest of this app's text fields (no optimistic-locking anywhere in the codebase before or after this change) — SYNC-05 is only solved at the "which section is live" level, not at the text-field level.
3. Transitions remain a field on `SetSong` rather than a fully independent entity between two songs — a deliberate, documented minimal-change decision (the audit found today's model already points the right direction, so a bigger schema change wasn't justified).
4. PDF import's role-direction extraction is unsupported, as stated above — not a regression, just not attempted.

## Remaining Risks

- If a real invite/per-musician-login feature ships later, the MEMBER-role branches throughout (My Part visibility, Rehearsal Mode viewer-filtering, Director Mode gating) should be re-verified with genuinely independent logins, since today's verification is role-flip-based.
- Polling at 3.5s means up to that long a window of staleness in the worst case before each poll fires — acceptable against the stated 5s bar, but worth remembering if a tighter bar is ever wanted (would need a real realtime provider).

## Recommended Next Steps

1. Re-verify the MEMBER-role branches with real second logins once an invite system exists.
2. Consider a realtime provider (Pusher/Ably/Supabase Realtime) if sub-second sync ever becomes a hard requirement — the current polling architecture can swap in without a data-model change.
3. Decide whether transitions deserve a fully independent model, if the product direction leans toward richer per-transition structure (e.g. multiple simultaneous role actions during a transition) beyond the current single free-text field.
