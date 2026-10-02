# WorshipFlow — Next Version Plan

**Companion to:** `WORSHIPFLOW_FULL_PRODUCT_AUDIT.md` (read first — every CURRENT claim below cites a section of it).
**Purpose:** what to build next, in what order, and how — before any of it is implemented. Per the brief: "do not implement all recommendations immediately."
**Explicit constraints carried over from the brief:** no AI features in this pass, no click track/tempo map in this pass, no overbuilding — minimal schema/UI change to close each real gap, nothing speculative.

Each item: **CURRENT** (what exists today, audit-cited) → **TARGET** (what the brief actually asks for) → **GAP** (the real, specific difference) → **PRIORITY** → **IMPLEMENTATION APPROACH** (concrete, minimal).

---

## Priority order

This follows the brief's own Part 46 ordering, adjusted only where the audit found an item already done (moved to "already satisfied," not re-built) or found a prerequisite that has to come first (invite flow, because it's load-bearing for testing everything else honestly).

1. **Invite / second-login flow** — not in the brief's original Part 46 list, but promoted to #1 here because it's the one dependency every other "second person" claim in the brief rests on, and it's currently built around a workaround (member-picker) everywhere else.
2. Dynamics model
3. Free Worship as a distinct section mode
4. Transition Builder
5. `SongRoleNote` per-person-per-role ceiling
6. Director Mode "Announce" control
7. Defensive fix for the pre-hydration input-reset race
8. Minimal automated test coverage

Already satisfied by the prior session's work, re-verified live this audit, **not rebuilt**: Song Vision, Song Flow (sections/repeat-count/role-notes/assignee/visibility), Set simplification (progressive disclosure), My Part, Rehearsal Mode, Rehearsal Change Capture (propose/keep/discard), Team synchronization (polling), mobile usability on the 4 checked screens. See audit §9–§13 for evidence.

---

## 1. Invite / Second-Login Flow

**CURRENT:** `registerUser` always creates a brand-new `Church`/`Team`/`Membership(OWNER)` (`lib/auth/actions.ts`). `addTeamMember` creates a roster row with `userId: null`. There is no action anywhere that links an existing or new `User` to an existing `Church`. Confirmed by `grep -rni "invite"` across the repo — the only hit is unlinked marketing copy on the signup page. Audit §7, §12.

**TARGET:** A worship leader can invite a real person by email; that person signs up (or logs in if they already have an account) and lands inside the *existing* team, with a `Membership` role the leader chose (default MEMBER) and ideally linked to a specific `TeamMember` roster row via `TeamMember.userId` (a field that already exists and is already read correctly everywhere — My Part's `members.find(m => m.userId === user.id)` fallback, `requireUser()`'s team resolution — so this is additive, not a rework).

**GAP:** The entire invite mechanism (generate + send + accept an invite) is missing. Schema is otherwise ready for it.

**PRIORITY:** Highest — nothing else in the brief can be honestly tested with real distinct people until this exists.

**IMPLEMENTATION APPROACH (minimal):**
- New model: `Invite { id, churchId, teamMemberId?, email, role: ChurchRole, token, createdAt, expiresAt, acceptedAt? }`. Additive migration only.
- New actions: `createInvite(email, role, teamMemberId?)` (leader-only, `isLeaderRole()`-gated like the existing rehearsal actions), `acceptInvite(token)` — if the email has no `User` yet, routes to a signup form pre-filled with the invited email that, on success, creates the `Membership` on the *existing* church (not a new one) and links `TeamMember.userId` if a `teamMemberId` was specified; if the email already has a `User`, just creates the `Membership` (+ link) and signs them in.
- Minimal UI: an "Invite" button on `/team` next to each roster row (or a standalone "Invite someone" action), and a `/invite/[token]` landing page reusing the existing signup form's fields minus team name (team is fixed by the invite).
- Do **not** build email delivery infrastructure in this pass if no email provider is configured — generate the invite link and let the leader copy/send it manually (same honesty principle the audit applied to AI features and sync: don't fake a capability that isn't really wired up). Document that as the MVP boundary.
- Re-verify, with this built: every "second person" claim in the audit (§9–§12) with two *actually separate signups* going through the real invite flow, not a direct-SQL second user.

---

## 2. Dynamics Model

**CURRENT:** No structured field. "Dynamics" appears only inside a placeholder hint string. Audit §10.

**TARGET:** Brief's own bar — simple, not a mixing console: a 1–5 scale or an Intimate/Light/Building/Strong/Full label set, settable per section (dynamics change within a song) and optionally at the song-Vision level as a default/starting point.

**GAP:** Entirely missing as structured data.

**PRIORITY:** 2 — small schema change, directly closes a named brief requirement, low risk.

**IMPLEMENTATION APPROACH (minimal):**
- `SongSection.dynamics String?` (nullable, free enum-like string — "Intimate" | "Light" | "Building" | "Strong" | "Full" — stored as a plain string the same way `role` is, for the same forward-compat reason the schema already documents for roles). Additive migration.
- UI: a small `<Select>` next to each `SectionCard`'s repeat-count input in `ArrangementEditor` (reuse the existing `RoleNoteRow`/`SectionCard` layout pattern — do not build a new editor surface).
- Surface it in Rehearsal Mode's Current Section display (`SongRehearsalPanel`) next to the repeat-count badge, since that's exactly where a leader needs it live.
- Do not build a visual meter/slider UI — a label is what the brief asks for ("not a mixing console").

---

## 3. Free Worship as a Distinct Section Mode

**CURRENT:** "Free Worship" is only ever a typed section label; once added it behaves identically to any structured section (lyrics/chords field, role notes, repeat count). Audit §10.

**TARGET:** Brief Part 12 — support spontaneous/unstructured moments without over-programming them. The key behavior difference from a normal section isn't new fields, it's *fewer* required fields and different framing — the leader should be able to mark a section "this is open/spontaneous" and have the UI stop implying it needs the usual structure.

**GAP:** No `isFreeform`/equivalent flag; no visual or behavioral difference from a structured section today.

**PRIORITY:** 3 — small, high-value, consistent with "don't over-program" instruction (i.e., the implementation should *reduce* UI, not add more of it).

**IMPLEMENTATION APPROACH (minimal):**
- `SongSection.isFreeform Boolean @default(false)`. Additive.
- When `isFreeform` is true: `ArrangementEditor`'s `SectionCard` hides the lyrics/chords prompt ("Add lyrics & chords") by default and instead shows a single lighter-weight prompt — reuse the existing role-note mechanism for direction (e.g. "Worship Leader: follow as led, no set length"), don't invent a new content model.
- A simple toggle/checkbox on section creation or in the section card header sets it — no new page, no new component tree.
- In Rehearsal Mode, a freeform section's display can skip the repeat-count badge (meaningless for it) and show a distinct, calmer visual treatment (e.g. no "×N" badge) rather than a new control surface.

---

## 4. Transition Builder

**CURRENT:** `SetSong.transitionNotes` — one free-text field per song, correctly oriented (describes leaving *this* song), repositioned behind "Details" disclosure. Audit §10.

**TARGET:** Brief Parts 13–16 — a dedicated object between two songs: FROM song+key, TO song+key, a `TransitionType` enum (Direct/Instrumental/Pad/Spoken/Prayer/Free Worship/Count-in/Pause/Custom), and free-form direction. Explicitly: no "fake intelligence" (no auto-suggested chord progressions) — document any such idea as FUTURE only, never build it this pass.

**GAP:** No `Transition` entity, no type enum, no FROM/TO key pairing — just the single free-text field.

**PRIORITY:** 4 — real gap, but the audit confirms the current field is not *wrong*, just less structured; this is the largest schema change in this plan, so it comes after the smaller wins above.

**IMPLEMENTATION APPROACH (minimal, explicitly not overbuilt):**
- New model: `Transition { id, setId, fromSetSongId, toSetSongId, type: TransitionType, direction: String? }`. One row per adjacent song pair in a set (not required for every pair — optional, same as today's `transitionNotes` is optional).
- `enum TransitionType { DIRECT INSTRUMENTAL PAD SPOKEN PRAYER FREE_WORSHIP COUNT_IN PAUSE CUSTOM }`.
- Migrate `SetSong.transitionNotes` data forward by creating one `Transition` row per existing non-empty `transitionNotes` value (type defaulted to `CUSTOM`, direction = the old text) in the migration itself, then deprecate (don't drop) the old column — keep it nullable/unused rather than a destructive drop, consistent with the "never destroy existing production data" constraint.
- UI: on the Set Detail page's `SetlistBoard`, render a small transition indicator *between* adjacent song cards (not inside either card) showing the type + a short direction preview, with a click-to-edit panel (type picker + direction textarea). This directly matches the brief's "first-class object between songs, not a note on a song."
- Explicitly do not add any chord-suggestion, key-relationship, or auto-transition-type logic. If that's ever wanted, it goes in a FUTURE section of this doc, not built now.

---

## 5. `SongRoleNote` Per-Person-Per-Role Ceiling

**CURRENT:** `@@unique([sectionId, role])` — one role-note row per section per role, so only one targeted person can have an individualized note per role per section. Audit §5.

**TARGET:** Two people sharing a role (e.g. two Lead Vocals) can each have their own individualized direction in the same section simultaneously.

**GAP:** Schema-level constraint blocks it outright today.

**PRIORITY:** 5 — real, but narrower impact than items 1–4 (most teams' role notes today are TEAM-visibility and don't hit this ceiling; it only bites when a leader wants two *different* PERSON-scoped notes for the same role in the same section).

**IMPLEMENTATION APPROACH (minimal):**
- Change the unique constraint to `@@unique([sectionId, role, teamMemberId])` (Postgres treats `NULL` as distinct in unique constraints, so this naturally keeps today's single TEAM/ROL-wide row working — `teamMemberId IS NULL` — while allowing multiple `PERSON`-scoped rows per role, one per assignee).
- Update `upsertRoleNote`'s `upsert where` clause to match the new composite key.
- Update `ArrangementEditor`'s `SectionCard` to allow adding a role direction more than once per role when targeting different people (today's `availableRoles = ROLES.filter(r => !usedRoles.has(r))` logic needs to allow re-adding a role if the new row would target a different `teamMemberId`).
- This is a backward-compatible, additive-in-spirit migration (no data loss — existing rows keep their current `teamMemberId: null` and keep matching today's unique key exactly).

---

## 6. Director Mode "Announce" Control

**CURRENT:** Director Mode has Prev/Next and the experiment panel; no distinct broadcast/announce action. Audit §11.

**TARGET:** Brief Part 20 lists a discrete "Announce" control alongside Next/Previous/Add Note/Add Change.

**GAP:** Missing.

**PRIORITY:** 6 — small, but lower-value than items 1–5 since the leader can already achieve the same practical effect via a rehearsal note or a role-note edit; this is closing a brief checklist item, not an operational gap.

**IMPLEMENTATION APPROACH (minimal):**
- Reuse the existing live-position polling channel: add an optional `WorshipSet.liveAnnouncement String?` + `liveAnnouncementAt DateTime?`, written by a new leader-only action `announceToTeam(setId, message)`, polled the same way `liveSectionId` already is.
- UI: one text input + "Announce" button in Director Mode; followers see it as a dismissible banner (same visual language as the existing "Leader moved to..." follow-banner in `RehearsalMode`).
- No new polling mechanism — piggyback on the existing one to avoid adding a second sync pathway.

---

## 7. Defensive Fix for the Pre-Hydration Input-Reset Race

**CURRENT:** Confirmed reproducible this audit (§15) — a controlled input filled before hydration completes can silently revert to empty.

**TARGET:** No silent data loss on any form, regardless of how fast it's interacted with.

**PRIORITY:** 7 — real but low-severity (unlikely to affect normal human typing speed; mainly a risk for autofill/password managers hitting a cold route).

**IMPLEMENTATION APPROACH (minimal):**
- Standard, well-known fix: track a `mounted` boolean (`useEffect(() => setMounted(true), [])`) in each top-level form component (`SignupPage`, `NewSetForm`, `NewSongDialog`, etc.) and disable the submit button (not the inputs — inputs should stay fillable) until `mounted` is true. This doesn't block typing, just prevents submitting a value that hasn't had a chance to hydration-settle.
- Apply only to the handful of top-level auth/creation forms where this was actually reproduced — not a blanket app-wide change.

---

## 8. Minimal Automated Test Coverage

**CURRENT:** No automated tests anywhere in the repo. Audit §18.

**TARGET:** Not full coverage — just enough to catch a regression in the highest-risk, already-fragile-by-nature paths: auth, team isolation, and the rehearsal-experiment keep/discard mutation (the one place a bug could silently corrupt a live arrangement).

**PRIORITY:** 8 — important long-term, but doesn't block any user-facing brief requirement, so it's last.

**IMPLEMENTATION APPROACH (minimal):**
- A handful of integration tests (Vitest, already a listed devDependency in similar projects in this account's other repo — check if WorshipFlow has it before adding a new test runner) directly against the Server Action functions (not browser-driven E2E — those are expensive to maintain and this codebase has none to build on): `registerUser` creates isolated tenants; a forged cross-team ID is rejected by every `findOwned*` check; `keepArrangementChange` actually mutates `SongRoleNote.content` and is rejected for a non-leader role.
- Do not attempt full Playwright E2E coverage in this pass — out of scope, and this audit's own experience shows dev-server timing makes browser-driven tests the most expensive and flaky kind to maintain here.

---

## What this plan deliberately does not include

Per the brief's explicit instructions, carried over unchanged from the audit:
- No AI features (source separation, YouTube analysis, or otherwise) — see audit §24.
- No click track / tempo map / MIDI.
- No chord-suggestion or auto-transition intelligence inside the Transition Builder (§4) — FUTURE only, if ever.
- No rebuild of anything the audit found already working (§"Already satisfied" above) — this plan only closes real, specific gaps.
