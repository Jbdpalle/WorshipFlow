# WorshipFlow — P0 Trust Fix + Beta Readiness Pass (Follow-up Report)

This is the follow-up referenced by the "CORRECTION" note at the top of
`WORSHIPFLOW_BEGINNER_WALKTHROUGH_AUDIT.md`. It covers the fix pass against
that audit's four findings (DF-01 through DF-04), with the live
re-verification evidence and the resulting beta-readiness decision.

Source of truth for the original findings: `WORSHIPFLOW_BEGINNER_WALKTHROUGH_AUDIT.md`.
Branch: `fix/p0-trust-beta-readiness`.

---

## What was fixed

**DF-01 — Song Flow role directions not displaying (originally P0).**
Does not reproduce as a product defect. Deep investigation (server-side log
of the Prisma query, client-side log of both props and local state, and
finally `.inputValue()` on the actual `<textarea>` elements instead of
`.innerText()`) traced the original finding to a test-tooling blind spot:
Playwright's `innerText()`/`textContent` cannot read a live `<textarea>`
value — it reads rendered text nodes, and a textarea's value is form-control
state, not a text node. The direction was always being saved and rendered
correctly. Along the way, a real but unrelated hydration mismatch was found
and fixed (dnd-kit's auto-generated `aria-describedby` id drifted between
server and client render) by giving both `DndContext` instances a stable
`id`.

**DF-02 — Dynamics chip/dropdown ambiguity (P1).** Real bug, fixed. The
quick-intent chips (Build/Drop/Hold/Full) and the preset dropdown
(Intimate/Light/Building/Strong/Full/Custom…) intentionally share one
underlying `SongSection.dynamics: string | null` field — confirmed by
reading `lib/songs/dynamics.ts` and `dynamic-indicator.tsx`, which already
handle arbitrary custom text correctly. The bug was narrow: clicking a
non-preset chip (Build/Drop/Hold) always switched the panel into the preset
`<select>` view, where that value has no matching `<option>`, so it
rendered as blank/"Not set" even though the correct value was saved
server-side. Fixed by routing non-preset chip values into the existing
custom-value display path (same one the "type your own" field already
uses), so the UI never contradicts the data it just saved.

**DF-03 — Onboarding promise mismatch (P1).** Real bug, fixed. Signup
promised an example set that was never actually seeded. Added a shared
`LoadSampleDataButton` (wrapping the existing, already-correct
`loadSampleData()` server action) to the Dashboard, Sets, and Library empty
states, so "Explore a sample set" is available everywhere a brand-new
leader might land first, not only on Library. Rewrote the signup subtitle to
describe the actual choice ("Add your own songs, or explore a ready-made
sample set first — your choice") instead of promising automatic seeding.

**DF-04 — Set/Event/Service terminology drift (P2).** Copy-only fix.
Standardized user-facing labels for the saved worship-service object on
"Set" (New Set, Create Set, Create your first set) across Sets list, New
Set form, and the dashboard calendar's quick-create. "Sunday Service" and
similar event-type names/descriptive prose were deliberately left as-is, per
scope (no architecture change, no rename of `WorshipSet`/event types).

## What was explicitly not touched

Per the task's "DO NOT CHANGE" list: My Part role resolution, Account
Role vs. Musical Assignment separation, Director Mode's Current/Next
layout and Hold/Build/Go Next/Announce controls, role-specific direction
vocabulary, the `SetTeamMember`/`SongAssignment` architecture, tenant
isolation, server-side permission enforcement, mobile navigation, and the
visual design language. No new product features, AI features, billing,
marketplace, analytics, or church-management functionality were added.

## Automated quality gates (re-run after the fixes)

| Gate | Result |
|---|---|
| `tsc --noEmit` | Clean, 0 errors |
| `eslint .` | Clean, 0 errors/warnings |
| `vitest run` | 159/159 tests passing (19 files) |
| `next build` (production) | Clean, all 29 routes compiled |

No new automated regression test was added specifically "for DF-01" —
because DF-01 isn't a real defect, and the project has no
component-rendering test harness (its `tests/` directory is Vitest
integration/static-analysis tests only, no React Testing Library or wired-in
Playwright). Writing one dedicated test for a non-bug, in a harness that
doesn't exist yet, would have been disproportionate scaffolding for this
fix pass; flagging this honestly rather than claiming coverage that isn't
there.

## Live re-verification (Playwright against the running app)

**Full Song Flow regression scenario**, using a Bridge section with three
simultaneous role directions (Drums: Build, Keys: Swells, Bass: 8ths):

1. Leader adds all three directions on the Song Flow editor → textarea
   values visible immediately: `['Build', 'Swells', '8ths']`.
2. Full page reload, re-select the section → same three values, unchanged.
3. Musician's My Part (Bass player) → sees only `Bridge: 8ths`, with
   correct "No direction for you. Follow the flow." on sections that have
   no Bass direction (Intro, Chorus/Verse 2/Chorus, Final Chorus/Outro).
   Drums' "Build" and Keys' "Swells" are correctly not shown to the Bass
   player.
4. Leader's Director Mode, jumped straight to the Bridge section via the
   song-flow ribbon → `CURRENT: Bridge`, `DIRECTIONS FOR EVERY ROLE` shows
   `DRUMS: Build`, `KEYS: Swells`, `BASS: 8ths` — all three, no duplicates
   — and `NEXT: Final Chorus`.

Repeated at a 390px mobile viewport: identical values on both the Song Flow
editor and Director Mode, no horizontal overflow on either screen.

**Dynamics (DF-02), all 9 input paths, each followed by a full reload:**

| Input | Immediately after | After reload |
|---|---|---|
| Chip: Full | preset-select: Full | preset-select: Full |
| Chip: Build | custom: Build | custom: Build |
| Chip: Drop | custom: Drop | custom: Drop |
| Chip: Hold | custom: Hold | custom: Hold |
| Select: Intimate | preset-select: Intimate | preset-select: Intimate |
| Select: Light | preset-select: Light | preset-select: Light |
| Select: Building | preset-select: Building | preset-select: Building |
| Select: Strong | preset-select: Strong | preset-select: Strong |
| Custom typed "Driving" + Save | custom: Driving | custom: Driving |

No value ever displayed as "Not set" after being saved. The song-flow
ribbon's tooltip (an independent downstream consumer of the same field)
stayed consistent with the editor at every step (e.g. `"Intro · Driving"`).

**Onboarding choice (DF-03), fresh signup end-to-end:**
Signup copy no longer over-promises auto-seeding. A brand-new account's
Dashboard and Sets pages both show the real empty state ("No upcoming
service" / "No worship sets yet") with both "Explore a sample set" and the
manual-creation action. Clicking "Explore a sample set" from Sets loads the
seed data and the Sets page immediately shows a populated set — no reload
needed, and the choice is a one-time, reversible action rather than
something forced on every account.

**Tenant isolation (regression check):** A second, newly-signed-up team
hitting team 1's Song and Set URLs directly gets the app's normal
"We couldn't find that page" not-found screen — no data or directions
leak across tenants. Consistent with `tests/tenant-isolation.test.ts`
(part of the 159 passing automated tests).

**Terminology (DF-04):** grep for the old "New event" / "New service" /
"Create Service" / "Schedule service" strings across `app/` and
`components/` returns no matches post-fix.

---

## FINAL BETA GATE

**P0 remaining:** 0 (the one reported P0, DF-01, did not reproduce as a
real defect)
**P1 remaining:** 0 (DF-02 and DF-03 both fixed and re-verified live)
**P2 remaining:** 0 (DF-04 fixed; terminology sweep confirms no stragglers)

| Area | Score |
|---|---|
| Overall UX | 8/10 |
| Song Flow | 9/10 |
| My Part | 9/10 |
| Rehearsal | 8/10 |
| Director Mode | 8/10 |
| Set creation | 8/10 |
| Mobile | 8/10 |
| Reliability | 8/10 |

**Can I give this to 2–3 trusted worship team members?**
YES — Confidence: 8/10

**Can I give this to a wider team?**
NO — not yet. The audit itself flagged real coverage gaps that this fix
pass was explicitly scoped not to chase (calendar deep-use, the full
invitation-accept-to-active-member loop, and roster behavior at 13+
services were not stress-tested either in the original audit or this
pass). Those are worth a dedicated pass before a wider rollout, but they
are coverage gaps, not known defects — nothing found there is currently
blocking.

**Can this now be called a real MVP?**
YES, for its intended "2–3 trusted team members" scope. The core trust
loop this task targeted — a leader writes an arrangement, sees it, reloads
and still sees it, a musician sees only their part, and the leader's
Director Mode shows the right current/next directions — is now verified
to hold under reload, mobile viewport, role-filtering, and tenant
isolation. The reported P0 was a false alarm, not a hidden crack, and the
two real UX trust bugs found (Dynamics display, onboarding promise) are
fixed and re-verified rather than patched over.

**Biggest remaining blocker:**
None blocking a small pilot. The honest gap is coverage, not a known
defect: Calendar, the full invite→active-member loop, and large-roster
(13+) behavior haven't been exercised end-to-end since before this pass.

**Most important strength:**
The core Song Flow → My Part → Director Mode loop is not just functionally
correct but *trustworthy* under adversarial conditions (reload, mobile,
wrong tenant, simultaneous multi-role directions) — which is the one thing
a worship leader needs to believe before they'll use this without a
developer standing by.

**Most important thing NOT to change:**
The shared assignment resolver and role-resolution logic behind My Part,
Director Mode, and Rehearsal Mode (Account Role ≠ Musical Assignment, with
`SetTeamMember` defaults layered under per-song `SongAssignment`
overrides). It is the thing every verification in this pass depended on
being correct, and it already is.

**Recommended next step:**
Ship this to the 2–3 trusted team members now. In parallel, run a
dedicated coverage pass (not a fix pass) on Calendar, the invite-to-active
loop, and larger rosters, specifically because those were named gaps, not
because anything is known to be broken there.
