# WorshipFlow — Demo Mode, Onboarding & Rehearsal UX Report

**Scope of this round:** landing page cleanup, a real interactive guided demo
walkthrough, demo limits + 14-day expiration + Free-account conversion, a
Free/Pro plan foundation, Rehearsal Mode restructuring, Announce quick
presets, member-experience re-verification, and usability instrumentation.
Commit `b135fee`.

---

## 1. Landing page changes

Removed the `01`–`05` numbered badges from the workflow illustrations on the
public landing page (`app/page.tsx`). The five step labels — **Plan, Arrange,
Assign, Rehearse, Lead** — already matched the spec's preferred narrative
exactly, so only the numbering was removed; icons and copy are unchanged.
Verified at 375px, 390px, and desktop with no horizontal overflow and no
numbered badges present.

## 2. Demo experience

**Before:** "Try the demo" seeded a five-song library with a pre-built
4-song set — closer to a populated showroom than something to actually *do*
anything with, and nothing guided the visitor through it.

**Now:**
- A new, deliberately minimal seed (`lib/songs/seed-demo-walkthrough.ts`)
  creates exactly **one original song**, "Still Before You" (not scraped —
  written for this demo), with real sections, dynamics, lyrics/chords on two
  sections, and role directions including the new "Rest of the Band"/"Rest
  of the Vocals" group directions — enough to demonstrate every Song Flow
  feature on one song. `seedDemoDataForTeam` (the old 5-song seed) is
  untouched; it still powers the "load sample data" action for real accounts
  and the local dev seed script.
- Immediately after demo signup, a banner offers **Start Demo** / **Skip
  Tour**, always with a dismiss (×). Skipping leaves the demo fully usable
  with no further prompting.
- **Start Demo** launches a 12-step guided walkthrough (Library → build a
  set → open the song → Song Vision → Song Flow → Directions → Dynamics →
  Transition → Rehearsal → My Part → Director Mode → Announce). Each step
  only advances when the corresponding **Server Action actually succeeds**
  — there is no client-side "Next" button anywhere in the tour. The banner
  is always dismissible (**Exit Tour**), and restartable later from
  **Settings → Restart guided tour**.

**Deliberate scoping decision, stated up front and still accurate:** the
tour is a persistent progress banner with step copy, not a DOM-targeting
spotlight/tooltip overlay that visually points at specific page elements.
State-driven step advancement is what makes "the user actually performs the
action" true or false; a generic overlay positioning engine across eight+
differently-laid-out pages would have been the single largest source of
bugs and polish time for a UI improvement, not a functional one. This
tradeoff should be revisited first if a future round wants the tour to feel
more "guided" visually (see §11).

**Known display nuance:** a handful of steps (Library, opening the song, My
Part) advance from a page server component, which races its own parent
layout's data read — the very first paint of that page can show the banner
one step behind for well under a second. A client-side poll (shared with
the mechanism below) self-corrects this on an immediate re-check. This was
caught and fixed during verification, not left as a known gap.

## 3. Demo limits

`lib/plans/limits.ts` enforces, independent of the Free plan limits below:

- **1 song** — gated in `createSong`, `importSongFromText`, and
  `importSongsFromPdfs` (every song-creation path, not just one).
- **1 active set** — gated in `createSet`.
- **1 invited teammate** — gated in `createInvite`. Roster-only ("no login")
  team members are *not* limited, since the limited resource is logins, not
  roster entries.
- **14 days** — `User.demoExpiresAt`, set at account creation.

Each limit returns a clear, specific message (e.g. *"The WorshipFlow demo is
limited to 1 song so you can focus on trying the full workflow — create a
free account for more."*) rather than a generic failure. All three limits
and the message text were verified live.

**Expiration:** `requireUser()` (the single gate every `(app)` route already
passes through) redirects an expired demo account to `/demo-expired`
instead of silently deleting anything. That page shows *"Your WorshipFlow
demo has ended"* and a **Create Free Account** form (name, real email, a
real password). Converting flips `isDemo` off and swaps the throwaway demo
credentials for real ones on the *same* `User` row — the Church, Team, song,
set, and any other data are untouched. Verified live: an expired account is
gated on every route tried, the message shows, conversion succeeds, the
demo song is still present afterward, and `isDemo` is confirmed `false` in
the database post-conversion.

## 4. Free plan

`Team.plan` (`FREE` | `PRO`, default `FREE`) is new in the schema. Free
limits, enforced server-side in `createSet` and `addTeamMember`:

- **3 active sets**
- **6 team members**

`PRO` lifts both entirely — the check is a single `if (plan === "PRO")
return { ok: true }` short-circuit in each limit function, so upgrading a
team later needs no further plumbing. No billing integration exists yet (not
asked for this round); a team only reaches `PRO` by a manual/future
assignment to that field.

## 5. Rehearsal experience

`components/rehearsal/rehearsal-mode.tsx` now shows, for every section:

- **Current Section** (unchanged) — the big centered card with Prev/Next.
- **My Part** — new. For a non-leader viewer with a per-song role
  assignment, a highlighted card shows just their own part for the current
  section (falling back to "Rest of the Band"/"Rest of the Vocals" when they
  have no individual note — same resolution logic as the `/my-part` page).
  Leaders don't see this block; they already see every role's instructions.
- **Current Directions** — the renamed "Team Instructions" block (same
  content, clearer name alongside the new Next Directions block).
- **Next Directions** — new. A de-emphasized preview card showing the next
  section's label and its resolved directions, not just a bare "Next:
  {label}" line as before.
- **Rehearsal Notes** (unchanged).

**What I verified live vs. by code review:** the leader's view (Current
Section, Current Directions, Next Directions, Announce, Mark Rehearsal,
Notes) was screenshotted at 375px with no overflow and reads cleanly. The
non-leader view was verified for the parts that don't depend on a specific
role assignment (no leader controls visible, Current Directions shown
correctly). The **My Part card specifically**, for an invited member with a
real per-song role assignment, was *not* independently re-screenshotted
inside Rehearsal Mode — my own test script's invite-and-assign setup proved
flaky in a way traced to the test's own selectors, not the app. I'm
reporting this honestly rather than claiming a screenshot I don't have: the
underlying logic (`selectRoleNoteForViewer`, including the group-direction
fallback) is exhaustively verified on the `/my-part` page (12/12 checks),
and `rehearsal-mode.tsx` reads the exact same function over the exact same
data shape, type-checked end to end. I'd call this low-risk, not zero-risk —
worth a two-minute manual click-through before relying on it for a real
team's rehearsal.

## 6. Announce experience

Labeled and built as **leader → team immediate direction**, not chat (matches
the spec's framing exactly — the backend already stored a single
`liveAnnouncement` string per set, polling-based, no realtime infrastructure
claimed). Added 8 one-tap presets — **Repeat, Hold, Stop, Build, Drop, Wait,
Go Next, Leader Signal** — alongside the existing custom-message input,
which now lives behind a "Custom…" toggle. Verified the presets render and
are tappable at 375px with no overflow.

## 7. Member experience

Re-verified (not rebuilt — this was already correct from a prior round):
non-leader members cannot invite, manage the team, change roles, or see
admin controls; `isLeaderRole()` gates these server-side, independent of
what the UI hides. 18/18 checks in the existing regression suite for this
area still pass.

## 8. Usability instrumentation

Nine events added to `lib/usability/track.ts` and wired into their real
action call sites: `vision_created`, `section_edited`, `direction_added`,
`free_signup_started`, `demo_started`, `demo_skipped`, `demo_step_completed`,
`demo_exited`, `demo_completed`. `announce_sent` replaces
`director_announce_used`, which was defined but never actually fired from
anywhere — same call site, clearer name, no behavior change. `director_
mode_started` was previously fired on every leader page-view of Rehearsal
Mode (too broad — "viewing the page" isn't "directing"); it now fires once,
from the leader's first live section move, which is also what the tour's
Director Mode step gates on.

## 9. Tests

- `npm run typecheck`, `npm run lint`, `npm run test` (vitest, 4/4): clean
  on the final changeset.
- `npx next build`: clean, 31 routes including the new `/demo-expired`.
- Live Playwright verification against the production build:
  - Full 12-step guided tour, start to completion: **30/30** checks.
  - Skip Tour + demo expiration + Free-account conversion: **10/10**.
  - Pre-existing regression suites for invite-gating, back/home nav,
    archive/delete, team-assign defaults, and the group-direction fallback:
    **74/74**, confirming nothing in this round broke prior work.
  - Landing page at 375px/390px/desktop: no numbered badges, no overflow.
  - Mobile (375px) screenshots of the tour prompt, active tour banner,
    Rehearsal Mode, and the Announce presets panel: no overflow in any of
    them.

## 10. Deployment

Committed as `b135fee`. Push and Vercel deployment verification happen
immediately after this report is written — see the chat reply for the
commit SHA that's actually live and the evidence for it (GitHub's Vercel
status check plus a direct production response check), not asserted here in
advance.

## 11. Remaining P1/P2

- **P1 — My Part inside Rehearsal Mode, independently re-verified.** See §5.
  Low risk given the shared, already-proven resolution function, but not
  independently screenshotted live with a real per-song-assigned member.
- **P2 — The tour overlay is informational, not spatial.** It tells the user
  what to do next in plain text; it doesn't point at the specific button or
  field. For a first-time user who doesn't immediately spot the right
  control on a busy page (e.g., "Add direction" among several buttons on a
  section card), this could mean a few extra seconds of looking, not a
  dead end — every step still has a working, real action behind it.
- **P2 — Demo tour step boundaries are a reasonable but not literal 1:1 map**
  to the spec's 12-step list in a couple of places (e.g., "Explain the
  Library" and "Open the song" collapse around the same click-through
  rather than being two fully separate gated actions) — documented in code
  comments at each `advanceTourIfNeeded` call site.
- **P2 — No billing UI for PRO.** The schema and limit-check short-circuit
  are in place; there's no self-serve upgrade flow, by design (explicitly
  out of scope this round).
- **P2 — Demo invite email isn't actually sent.** Invites generate a
  shareable link (pre-existing behavior, unchanged) rather than emailing
  one — fine for a demo account exploring solo, worth flagging if "invite 1
  teammate" is meant to be tested with a second real person during the
  trial window.

## 12. Recommended next step

Put a real first-time user (not a developer) in front of **Try the demo**
with no instructions beyond that button, and watch where they pause longer
than ~10 seconds or ask a question out loud. That single session will tell
you more about whether the tour's plain-text step copy is sufficient (vs.
needing the spatial pointer in P2 above) than any further automated
verification can — the acceptance criterion below is explicitly about a
human, not a test script.

---

## Final question: can a brand-new worship leader get through this alone?

**Yes, as far as automated verification can confirm it.** A scripted
first-time user — demo signup, guided tour accepted, all 12 steps completed
using only the real UI (no shortcuts, no direct DB access), demo limits hit
and understood from their error messages, Rehearsal Mode and Announce used
— reaches a complete song/rehearsal/announce experience without any
step requiring outside explanation. Every step's instruction names the
specific real action to take, and every one of those actions is backed by a
working feature, not a stub.

**Where I'd expect a real human to actually get stuck, that a script
wouldn't show me:** not functionally stuck, but momentarily unsure — the
tour tells you *what* to do ("Add a direction for a role") without
highlighting *where* the button is, so on the Song Flow tab specifically
(several buttons: Add section, Add direction, Add lyrics & chords, per-role
Settings/Remove icons) a first-timer might pause and scan before finding the
right one. That's the P2 spatial-pointer gap above, not a blocker.
