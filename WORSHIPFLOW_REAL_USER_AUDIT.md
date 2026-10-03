# WorshipFlow — Real User Audit

Scope: this audit picks up where `WORSHIPFLOW_FULL_PRODUCT_AUDIT.md` (prior session) and the 8-item `WORSHIPFLOW_NEXT_VERSION_PLAN.md` it produced left off. All 8 of that plan's items — invite flow, Dynamics, Free Worship, Transition Builder, the role-note ceiling fix, Director Mode Announce, the hydration-race fix, and automated tests — are already built and were **not** rebuilt here. This document is the result of actually *using* the app end-to-end as five real personas (Worship Leader, Lead Vocal, Backing Vocal, Drummer, Acoustic Guitar) through real browser sessions against a real Postgres database, not a second read of the source.

Evidence standard throughout: **PASS** requires a live action and a live result (a DB row, a UI state, a second real login seeing or not seeing something) — not "the component exists." **PARTIAL** and **NOT VERIFIED** both count as not-passing for release purposes, per the task's own rule.

---

## 1. What was actually done this session

A full real-team scenario was built and driven through the UI, with a second, completely independent Playwright browser context per team member (not one account switching hats):

- Signed up a Worship Leader, who got her own isolated church/team (confirmed empty — see §5).
- Added a 7-person roster (4 roles that would get real logins: Lead Vocal, Backing Vocal, Drums, Acoustic Guitar; 3 roster-only: Electric Guitar, Keys, Bass).
- Generated and accepted 4 real invite links in 4 separate browser contexts — 4 distinct `User` rows, each with their own `Membership` on the same church, confirmed via direct SQL (not just "the invite page loaded").
- Created a Sunday service, added three songs (**Here For You**, **Song B**, **Song C** — section labels and leader-authored text only, no copyrighted lyrics), and gave Song B a different key (G) from Here For You (E) specifically to test the key-change transition path.
- Wrote a full, realistic Song Vision on Here For You (the exact leader narrative from the task brief — soft keyboard intro, 8th/16th-note acoustic strum, toms every 4–8 beats, Verse 1 an octave lower, lift on "Let our shout," ~70% into the bridge, 100% full band on the final chorus) and confirmed it round-tripped through the DB intact.
- Built the Song Flow: 7 sections (Intro, Verse 1, Chorus 1, "Let our shout," Free Worship, Final Chorus, Ending), 7 role directions across Keys/Guitar/Drums/Lead Vocal, 3 Dynamics levels, and toggled the Free Worship section's freeform flag.
- Built a Transition from Here For You into Song B (type Pad, a real leader-style direction: "Hold the last chord. Keys continue pads, drums out, move toward G while I pray. Acoustic enters when I start singing Song B.").
- Assigned the 4 real team members to the set, and separately gave them per-song `SongAssignment` roles (the data My Part actually reads).
- Opened My Part as the Lead Vocal persona and confirmed she saw her own section-by-section direction and nothing belonging to another role; opened it as a persona with no assignment and confirmed the correct empty state instead of a leak.
- Ran Director Mode: leader on one screen, Drummer on a second, independent login — confirmed the follower's screen catches up to the leader's section within one poll cycle (~3.5s), confirmed via DB (`liveSectionId`) and the follower's own DOM, not just a screenshot. Confirmed the Announce broadcast reaches the follower the same way.
- Ran a rehearsal "Keep Change" experiment and confirmed the kept text actually mutates the live `SongRoleNote`.
- Tried to open the leader's own Set URL as a second, unrelated leader who had just signed up — got a real 404, not a UI-hidden link.
- Measured (not eyeballed) horizontal overflow at a 375px viewport on Song Detail, Team, and Settings.

Everything above is **evidence gathered**, not a claim; where it surfaced a real problem, the problem and the fix are in §5 and the four companion documents.

---

## 2. What works (confirmed live, this session)

| Area | Status |
|---|---|
| Signup → isolated church/team/membership | **PASS** |
| Invite → 4 genuinely independent second logins | **PASS** |
| Song Vision free-text capture + persistence | **PASS** |
| Song Flow: sections, repeat count, dynamics, Free Worship toggle | **PASS** |
| Role directions (Keys/Guitar/Drums/Lead Vocal) | **PASS** |
| Transition Builder save (type + free-text direction) | **PASS** |
| Per-song + per-set team assignment | **PASS** |
| My Part — correct role-scoped filtering, correct empty state | **PASS** |
| Director Mode — leader→follower poll sync | **PASS** (~3.5s latency, honestly polling, not push) |
| Director Mode — Announce broadcast | **PASS** |
| Rehearsal experiment Keep → mutates live `SongRoleNote` | **PASS** (also covered by the automated suite from the prior session) |
| Tenant isolation against a forged/guessed URL | **PASS** (real 404, confirmed as an outsider, not just code-read) |

This is a substantial, working core. Nothing in this list needed to be rebuilt.

## 3. What was confusing or broken (confirmed, fixed this session)

Three real, live-confirmed problems were found and fixed — see the companion documents for the detailed before/after and the full P0–Future backlog:

1. **Every real signup, not just the "Try the demo" button, silently seeded 6 fake band members and 5 fake songs into what was supposed to be the leader's own real team.** Confirmed by DB read: a brand-new `leader-***@trial.invalid` account's roster contained both the 4 real people just invited *and* "John," "David," "Sarah," "Mary," "Peter," "Grace," plus 5 songs credited to "WorshipFlow Demo Collective." This is the single most real-team-trial-breaking issue found this session — a leader's first real session would start by having to figure out which of 13 roster rows were real. **Fixed**: `registerUser` no longer seeds sample data; the "Try the demo" button still does, since that account only ever exists to explore. A real team that *wants* to explore first can now ask for it explicitly — the Song Library's true-empty state (which, before this fix, was never actually reachable by a real signup) now offers a one-click "Load sample songs to explore," gated so it can't double-seed a team that already has real content. Verified live: fresh signup → 0 songs, 1 roster member (the leader) → clicking the button → 5 songs appear.
2. **The Transition Builder carried no key context of its own**, confirmed by reading its live DOM: the collapsed control showed only a type label ("Pad") and the leader's free-text direction — nothing told a guitarist glancing at the setlist that the next song is in a different key unless they happened to read the whole sentence. This directly contradicts the brief's own repeated emphasis that transitions are a "MAJOR PRODUCT PRIORITY" and should show FROM/TO key. **Fixed**: the transition control now shows a small "E → G" badge whenever the two adjacent songs' effective keys (including any per-set key override) actually differ, in both its collapsed and expanded states — and correctly shows nothing when they're the same key, rather than noise. Verified live.
3. **Horizontal overflow at a 375px (iPhone-class) viewport** on Song Detail (the Song Flow section-header row: label input + repeat count + Dynamics select, all fixed-width, no wrap) and on Team (the Import Roster / Invite / Add Team Member button row, no wrap). Confirmed by measuring `scrollWidth > clientWidth`, not by eyeballing a screenshot — then confirmed visually too (a literal cut-off "+ Add Te…" button on Team). **Fixed**: both rows now wrap (`flex-wrap`) instead of forcing a fixed-width row past the viewport. Settings was already clean. Verified live, before/after, on both pages.

Full root-cause/impact/priority writeups: `WORSHIPFLOW_UX_FINDINGS.md`. Transition-specific detail and further (not-yet-built) recommendations: `WORSHIPFLOW_TRANSITION_RECOMMENDATIONS.md`. Song Vision → Flow duplication analysis: `WORSHIPFLOW_SONG_FLOW_RECOMMENDATIONS.md`.

## 4. Incomplete / not fully verified this session

- **Full offline PWA behavior** — not re-tested this session; carried forward as NOT VERIFIED from the prior audit.
- **Settings page on mobile** — measured clean (no overflow) but not exhaustively interacted with on a touch viewport.
- **The cosmetic `@dnd-kit` SSR `aria-describedby` hydration-id mismatch warning** (Song Detail, Setlist Board) — reconfirmed present, reconfirmed cosmetic (drag/reorder still works correctly; it's a dev-console warning, not a functional break). Not fixed this session — low value relative to the P0 items above; see the next-version plan.
- A handful of live-journey assertions (per-song assignment for a *second* role on the same card, immediately after a first assignment; a specific director-mode click-timing variant) were flaky in this session's own test scripts due to selector/timing bugs in the test harness itself, not reproduced as app bugs under isolated, cleanly-scoped re-tests (documented candidly in-session rather than glossed over). The underlying mechanisms they were exercising — per-song `SongAssignment`, Director Mode polling — were independently confirmed working by other passing live tests in the same session (My Part correctly showed Lead Vocal's assignment; an isolated single-persona director-mode test showed a 3.7s poll-sync latency). Not claimed as PASS on the strength of the flaky runs; not claimed as FAIL either, since the clean runs contradict that. Marked **NOT VERIFIED** for the specific multi-role-assignment-on-one-card interaction only.

## 5. Explicitly not touched

No rebuild of anything in §2. No new AI features (no `ANTHROPIC_API_KEY` is configured in this environment, and the brief explicitly says not to build AI or fake it). No click track / tempo map / MIDI. No full Transition flow-diagram visualization (see `WORSHIPFLOW_TRANSITION_RECOMMENDATIONS.md` for why that's recommended as P1, not done now — it's a real UI investment, not a two-line fix, and the brief's own rule is audit → recommend → prioritize → implement P0 → test, not scope-explode into every recommendation in one pass).
