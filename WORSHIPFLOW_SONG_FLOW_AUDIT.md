# WorshipFlow — Set → Song Flow → Rehearsal → My Part → Sync Audit

**Version:** 1.0 **Date:** 2026-10-01 **Phase:** 1 (Audit only — no code changed in this pass)

**Note on the reference document:** the task references `SONG STRUCTURE.pdf` as the primary UX reference. That file was **not actually attached to this session** — I searched the whole filesystem and it isn't present. This audit and the recommendations below work from the detailed section/role examples written directly into the task prompt (Intro/Verse/Chorus/Bridge/Free Worship/etc., and directions like "Hi-hat only", "Don't play", "BGVs enter second half"), which are specific enough to design against. If the actual PDF is uploaded later, it should be re-checked against the schema recommendations in Section 6 before Phase 2 (schema) is implemented, in case it reveals structure this text summary doesn't capture.

---

## 1. Current Architecture

- Next.js App Router, Server Actions as the only mutation layer (no REST API), Prisma on Postgres.
- Multi-tenancy: `User` → `Membership` (role: OWNER/ADMIN/LEADER/MEMBER) → `Church` → `Team` → everything else. Confirmed this session (see `Dashboard_UX_Audit.md`): **every real login today is `OWNER`** — there is no invite flow, so `TeamMember` roster rows are names on a list, not second logins. This matters a great deal for Sections 10–16 of the task (My Part, Team Sync) — see Section 4 below.
- Relevant routes today:
  - `/sets`, `/sets/new`, `/sets/[id]` — list, create, detail (setlist board).
  - `/songs`, `/songs/[id]`, `/songs/[id]/chart` — library, detail (tabs: Arrangement & Role Notes / Notes / Rehearsal History), performable chart view.
  - `/rehearsal/[setId]` — rehearsal mode.
  - `/my-part` — personal assignment view (member-picker dropdown, since there's no second login).
  - `/team` — roster CRUD.
  - `/dashboard` — just redesigned this session (Next Sunday / Following Sunday / This Week / Needs Attention).

## 2. Existing Data Models Relevant to This Task

Already in `prisma/schema.prisma`, already wired to working UI — **all reusable, none need to be rebuilt**:

| Model | Fields relevant here | Current UI |
|---|---|---|
| `SongSection` | `label`, `order`, `lyricsChords` | `ArrangementEditor` — add/rename/delete/drag-reorder sections on the Song Detail page's "Arrangement & Role Notes" tab |
| `SongRoleNote` | `sectionId`, `role` (free string), `content` | Per-section role instruction rows in the same editor; role picked from the hardcoded `ROLES` constant, one row per role, added individually (not all roles forced) |
| `TeamMember` / `TeamMemberRole` | `role`, `instrument`, multi-role set | `/team` roster CRUD |
| `SongAssignment` | `setSongId`, `teamMemberId`, `role` | Per-*song* assignment picker inside each `SetSongCard` on the Set Detail page |
| `SetSong` | `purpose`, `transitionNotes`, `overrideKey`, `overrideBpm`, `capo` | Set Detail page — `purpose` and `transitionNotes` are both free-text boxes shown unconditionally on every song card |
| `Rehearsal` / `RehearsalNote` / `RehearsalCheck` | per-song-per-occurrence record, free-text notes, status tag | Rehearsal Mode: auto-starts a `Rehearsal` row on open, "Record Rehearsal Notes" textarea, "Mark this rehearsal" status buttons |
| `ChangeLog` | `songId`, `field`, `fromValue`, `toValue`, `reason` | "Log a change" form on Song Detail's "Rehearsal History" tab — **purely a manual, free-text journal entry**, see Section 4 |
| `PersonalNote` | `userId`, `songId?`, `teamMemberId?`, `content` | One private textarea per song on Song Detail's "Notes" tab, filtered `where userId = me` — already correctly private |
| `Song.notes` | team-visible free text | "Song Notes (whole team)" box, same tab |

This is a genuinely strong foundation. **Song Structure (SF-02/03), section-level role direction that doesn't force every role (SF-05/06), and private personal notes (MP-03) already exist and work.** The task should extend these, not replace them.

## 3. What the Task Asks For That Doesn't Exist Yet

Checked each one directly against the code (not assumed):

1. **Song Vision** (task §6) — no field anywhere captures "where are we taking this song" free-form leadership intent. `Song.notes` is the closest existing thing but is framed as generic team notes, not vision.
2. **Section repeat count as structured data** (task §7, SF-04) — `SongSection.label` is just a string; "Bridge ×4" today would have to be typed into the label text by hand. No `repeatCount` field exists.
3. **Custom section types beyond free-text label** — technically already unlimited (label is a plain string), but there's no "standard section" picker UI; every section is typed from scratch. Minor gap only.
4. **Role-note assignee / visibility** (task §9, §11) — `SongRoleNote` has no `teamMemberId` and no visibility enum. It's "role X does Y," visible to everyone implicitly, with no path to "this is for Sam specifically" or "private."
5. **Set-level team assignment** (task §4, SC-03/04) — **confirmed gap.** `SongAssignment` is keyed to `setSongId`, not `WorshipSet`. The current UI genuinely requires re-picking role+member on every single song card in a set — exactly the repeated-selection problem the task calls out. There is no "assign the team once for the whole service" concept in the schema at all.
6. **Anchor Song** (task §4, SC-09) — no boolean/marker anywhere. `SetSong.purpose` is a different, already-existing free-text concept (not required, but shown unconditionally on every card — not progressive disclosure).
7. **Leader's Note at the Set level, Key Words, Set-level Theme beyond what exists** (task §4) — `WorshipSet.theme` exists; `keywords` exists (comma-separated, used only by `ThemeSuggestions`); there is **no** Leader's Note field at the Set level. (There's a *different*, pre-existing per-song `purpose` field that is sometimes used similarly, but it's not what the task means by "Leader's Note.")
8. **"Fake AI" exposure** (task §4, §27, SC-06) — found one real instance: `ThemeSuggestions` (Set Detail page) is titled **"Suggested Songs"** with a ✨ Sparkles icon, which is a strong AI-coded visual convention even though it's 100% rule-based keyword matching (`lib/songs/theme-engine.ts`, no LLM call). The card's own copy already disclaims "not a recommendation of what God wants," but the sparkle icon + "Suggested" framing will still read as AI to a user. This is the concrete thing §4/§27/SC-06 are asking to fix — not a hypothetical. (Separately, `ThemeVerseSuggestion` and roster-image-import genuinely do call the Anthropic API and correctly degrade when `ANTHROPIC_API_KEY` is unset — those are real, disclosed AI features gated by a real key, out of scope for this task's "remove fake AI" instruction, which is specifically about the Set screen's song-suggestion card.)
9. **Experimental rehearsal change with Keep/Discard that mutates the real arrangement** (task §13/§14, RH-05/06/07) — **does not exist.** `ChangeLog` (via `recordChange`) is a manually-typed historical journal entry, completely disconnected from `SongRoleNote`. Logging "Drums: Hi-hat only → Kick + hi-hat" does **not** touch the actual `SongRoleNote.content` a drummer sees on My Part — a leader has to separately go edit the arrangement by hand. There's no "status: experiment" concept, and no action that applies or reverts a proposed change.
10. **Director Mode** (task §15) — Rehearsal Mode already has current/next section + per-role instructions + prev/next buttons, which is most of what Director Mode needs visually. But it's one shared view, not leader-only, and there's no "announce next section" or any leader-specific control surface.
11. **Team synchronization** (task §16) — **confirmed: zero realtime infrastructure anywhere in the codebase.** No WebSocket, no SSE, no polling interval, no Pusher/Ably/Supabase-realtime package, nothing beyond a local `setInterval` inside the metronome's own tempo clock (unrelated). This matches the Risk Register's Critical #1 finding from this session's earlier dashboard/MVP audit. A team member only sees a leader's change by navigating/reloading.
12. **Transitions as independent entities** (task §17) — `SetSong.transitionNotes` already exists and is *not* miscoupled to "the next song" (today's field describes the transition leaving *this* song, which is the correct direction) — so the literal bug described isn't present. But it is still a plain text field glued onto a song row rather than its own addressable thing, and the UI buries it in a textarea identical in style to `purpose`. Worth a lighter-touch fix (reposition/reframe in the UI) rather than a new table.
13. **Song Flow readiness indicator per song, Set-level readiness** (task §18/§19) — doesn't exist in any form today.
14. **PDF import → role directions** (task §26) — confirmed by reading `lib/actions/import.ts`: the parser extracts **sections and raw lyrics/chords text only**. It has no concept of per-role instructions and never writes to `SongRoleNote`. So "map imported PDF into Song Flow" is only partially possible today: section structure, yes; role-specific direction extraction, no — that would require new parsing logic this task does not have time/scope to build reliably (freeform PDFs rarely tag "Drums:" vs "Bass:" in a machine-parseable way). **Recommendation: do not attempt automatic role-direction extraction from PDF; document it as unsupported, consistent with task §26's "do not invent extraction capabilities."**

## 4. The Hard Architectural Constraint (carries over from this session's dashboard audit)

Every acceptance criterion under "SYNCHRONIZATION" and the My-Part "second/third user" testing in task §25/§39 assumes **multiple people can be independently logged in on the same team.** They cannot, today. `registerUser` always creates `Membership.role = OWNER`; `addTeamMember` (used by the Team page) never creates a `User` or `Membership` — roster entries have no login. `/my-part` already works around this with a member-*picker* dropdown rather than per-user identity.

This doesn't block building the feature — the data model and UI can be fully correct and ready — but it means:
- "Test with User A/B/C simultaneously" (task §25/§39) can only be honestly done by **one person driving multiple browser sessions/incognito windows logged in as the same account**, picking a different `TeamMember` in each tab's My Part / simulating role views, not by three distinct real logins. I will say so plainly in the final report rather than claiming a multi-login test that isn't possible.
- Any claim of "Team Member B received the update" will be evidence from simulated multi-tab testing under one account, not independent accounts — this is the honest ceiling of what's verifiable in the current architecture.

## 5. Real-Time Synchronization — Recommended Approach

No realtime service (Pusher/Ably/Supabase Realtime/etc.) is configured anywhere in this environment, and none of those services' API keys exist here (same category of constraint as "no AI key" in task §27 — I won't invent a credential or silently assume one exists). Vercel's serverless functions also don't support long-lived WebSocket connections without a separate service.

**Recommended, honestly-achievable target:** short-interval client polling (e.g., a Server Action or lightweight route handler polled every 3–4 seconds while Rehearsal Mode / My Part is open) against a single `currentSectionIndex` (+ a version/updatedAt stamp) stored on the `Rehearsal`/set record. This meets the task's own bar — "≤5 seconds without manual refresh" — without a new paid dependency, and it's something I can actually verify (start two tabs, change section in one, time how long the other takes to update). I will build this and call it exactly what it is — **polling-based near-real-time, not push/WebSocket** — per task §16's explicit instruction not to claim real-time unless verified. If a realtime provider key is added to the environment later, this can be swapped in without changing the data model.

## 6. Recommended Schema Changes (Phase 2 scope, not yet implemented)

Extending, not replacing:

- `Song.visionNote` (new nullable text field) — Song Vision (task §6).
- `SongSection.repeatCount` (new nullable int, default 1) — structured repeat count instead of typing "×4" into the label (task §7/SF-04).
- `SongRoleNote.teamMemberId` (new nullable FK) + `SongRoleNote.visibility` (new enum: `TEAM | ROLE | PERSON`) — assignee/visibility (task §9/§11). Default stays `TEAM` so every existing row keeps working unchanged.
- New `SetTeamMember` join model (`worshipSetId`, `teamMemberId`, `role`) — the set-level roster (task §4/SC-03/04). `SongAssignment` stays exactly as-is for the optional per-song override case.
- `WorshipSet.anchorSongId` (new nullable FK to `Song`) and `WorshipSet.leaderNote` (new nullable text) — Set Direction fields (task §4).
- New `ArrangementChange` model: `songId`, `sectionId`, `role`, `proposedContent`, `previousContent`, `status` (`PROPOSED | KEPT | DISCARDED`), `rehearsalId?`, `createdBy`. This is the real missing piece behind RH-05/06/07 — "Keep" applies `proposedContent` onto the live `SongRoleNote` and marks `KEPT`; "Discard" just marks `DISCARDED` and leaves the live note untouched. (`ChangeLog` stays as today's lightweight manual journal — it isn't replaced, just no longer asked to do a job it was never built for.)
- `Rehearsal.currentSectionId` + `updatedAt` (already exists) on the active rehearsal record — the field Director Mode writes to and My Part/Rehearsal Mode poll for (task §15/§16).

All additive (`ALTER TABLE ... ADD COLUMN`, new tables) — no destructive migration, no existing data at risk.

## 7. Risks

1. **Scope**: this task's full acceptance-criteria list (≈45 criteria across Set/Song Flow/My Part/Rehearsal/Sync/Security) is large. Recommend implementing and verifying it in the task's own phase order (schema → Set screen → Song Flow → My Part → Rehearsal → Director Mode → Sync → Mobile → QA) with a checkpoint after schema changes before building UI on top, rather than one unverified mega-commit.
2. **Single-login ceiling** (Section 4) caps how "real" the multi-user sync testing can be — documented above so it isn't silently overstated in the final report.
3. **No realtime provider key** — polling is the honest, buildable answer; if the user wants true push-based sync later, that's a provider/key decision for them to make, not something to fake.
4. **PDF→role-direction mapping is not realistically buildable** from unstructured PDFs in this pass — documented as unsupported rather than attempted and silently wrong.
5. **`ThemeSuggestions`** ("Suggested Songs" ✨) is the one existing feature that reads as fake-AI even though it's rule-based — needs a small, deliberate rename/re-icon (not a removal, since the underlying theme-matching logic is real and useful) when the Set screen is touched in Phase 3.

## 8. Recommended Implementation Approach

Proceed in the task's own phase order (§33), starting with Phase 2 (schema) once this audit is reviewed. Each phase will be verified against real local data (typecheck/lint/build + manual Playwright-against-localhost verification, the same method used for this session's dashboard work) before moving to the next, and the final report will mark every acceptance criterion PASS/FAIL/PARTIAL/NOT VERIFIED — no criterion will be marked PASS without direct evidence.

**This is a multi-phase, multi-hour build.** Given the size, I'd rather confirm the schema plan in Section 6 with you before generating migrations — in particular: the new `SetTeamMember` set-level roster, the `ArrangementChange` keep/discard model, and the polling-based sync approach are the three decisions with the most downstream impact. Say the word and I'll start Phase 2.
