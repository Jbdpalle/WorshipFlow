# WorshipFlow — UX Findings (Friction Log)

Format per finding: FRICTION / WHY IT EXISTS / USER IMPACT / RECOMMENDATION / PRIORITY, per the task brief's own template. No overall score — findings are categorized WORKING WELL / NEEDS IMPROVEMENT / MISSING / BROKEN / CONFUSING / FUTURE / CRITICAL instead.

---

### Finding 1 — Real signups started pre-polluted with fake data — **CRITICAL, FIXED**

**FRICTION**: A worship leader's very first action after signing up — before entering a single real song or a single real person — was to be confronted with a roster and song library that already contained 6 fictional people and 5 fictional songs, indistinguishable from the real ones they were about to add.

**WHY IT EXISTS**: `registerUser` called the same `seedDemoDataForTeam` helper as the throwaway "Try the demo" button, apparently so a brand-new account always had something to look at.

**USER IMPACT**: Directly undermines the stated goal of this round ("prepare it for a real worship-team trial"). A real leader's first ten minutes would be spent figuring out which roster rows and songs to delete, not entering their own Sunday's plan.

**RECOMMENDATION**: Real signups start empty. Sample data remains available as an explicit, opt-in action from the Song Library's (newly reachable) true-empty state, gated so it can't duplicate into a team that already has real content.

**PRIORITY**: P0. **Implemented and verified this session** — see `WORSHIPFLOW_REAL_USER_AUDIT.md` §3.1.

---

### Finding 2 — Transition Builder carried no key context — **NEEDS IMPROVEMENT, FIXED**

**FRICTION**: Two adjacent songs in different keys produced a transition control that looked identical to two songs in the same key — a guitarist scanning the setlist for "where do I need to watch for a capo/key change" had to open and read every transition's free text to find out.

**WHY IT EXISTS**: `Transition` and `TransitionIndicator` were built, correctly by design, as "type + free-form direction" only — no chord-suggestion or auto-transition intelligence, matching the brief's own "do not fake AI" instruction. But that also meant no *structured* FROM/TO key display was ever wired in, even though both songs' keys were already sitting in the same query.

**USER IMPACT**: The brief calls transitions one of the most important capabilities in the product, specifically because key changes are a common real-team failure point. A silent one in the UI is exactly the failure the feature exists to prevent.

**RECOMMENDATION**: Show the two songs' effective keys (`overrideKey ?? song.key`) directly on the transition control, collapsed and expanded, only when they differ.

**PRIORITY**: P0. **Implemented and verified this session.**

---

### Finding 3 — Horizontal overflow on a phone viewport (Song Detail, Team) — **NEEDS IMPROVEMENT, FIXED**

**FRICTION**: At 375px, the Song Flow section-header row (label + repeat count + Dynamics select) and the Team page's toolbar (Import Roster / Invite / Add Team Member) both forced a fixed-width row wider than the viewport instead of wrapping, producing real horizontal scroll and, on Team, a literally cut-off button.

**WHY IT EXISTS**: Both rows used `flex` without `flex-wrap`, fine on desktop, broken once enough fixed-width children exceed 375px.

**USER IMPACT**: Rehearsal and Team are two of the five screens the brief explicitly says to prioritize for mobile. Horizontal scroll on a phone is the exact "distraction" the product is supposed to reduce, not add.

**RECOMMENDATION**: `flex-wrap` on both rows.

**PRIORITY**: P0. **Implemented and verified this session** (measured `scrollWidth`/`clientWidth`, not eyeballed).

---

### Finding 4 — Song Vision and Song Flow are, correctly, two separate steps — **WORKING AS INTENDED, not a gap**

**FRICTION** *(hypothesis going in, per the brief's explicit warning about duplicate data entry)*: would a leader have to re-type their Song Vision's content into every section's role directions?

**WHAT WAS ACTUALLY FOUND**: No. Song Vision is one free-text field, prominently placed directly above the Song Flow tabs with the exact framing the brief asks for ("Where are we taking this song?"), and the structured editor underneath it is already fast to use directly — inline text fields, no modal dialogs, no required fields, a role can be added with two clicks and typed directly. Nothing forces the leader to restate the vision verbatim in structured form; the structured editor is for *operationalizing* the parts of the vision that need a specific instruction at a specific section, which is a different (and necessary) activity, not a duplicate of the vision.

**RECOMMENDATION**: Do not build an auto-transform from vision text into structured sections (the brief explicitly forbids faking AI for this, and no `ANTHROPIC_API_KEY` is configured in this environment regardless). Keep the two as separate, fast, honestly-related steps. Full analysis in `WORSHIPFLOW_SONG_FLOW_RECOMMENDATIONS.md`.

**PRIORITY**: No action — recorded so the hypothesis isn't silently dropped.

---

### Finding 5 — No visual flow diagram for a transition — **MISSING, not fixed this session**

**FRICTION**: The brief asks for a transition to be visually "obvious" (§21: a vertical flow from Song A's key/ending through pads/prayer/key-move to Song B's start). What exists today is a single collapsed line (now with a key badge — Finding 2) that expands into a type selector + one free-text box. That is honest and usable, but it's a sentence, not a picture.

**WHY IT EXISTS**: The original Transition Builder work (prior session) deliberately scoped to "type + free-form direction... no chord-suggestion or auto-transition intelligence... per the product brief" — i.e., it was *intentionally* kept minimal the first time, and this session's job was to verify and do targeted fixes, not rebuild it into a full visualization in the same pass.

**USER IMPACT**: Medium. The key badge (Finding 2) closes the single highest-leverage gap (silent key changes). A full visual flow is a genuine improvement but not blocking a first real trial — a leader can still write and read the direction text today.

**RECOMMENDATION**: See `WORSHIPFLOW_TRANSITION_RECOMMENDATIONS.md` for a scoped P1 design (a compact vertical strip: ending state → direction → next start, still no new data model, just better presentation of what's already captured).

**PRIORITY**: P1, future iteration.

---

### Finding 6 — Cosmetic `@dnd-kit` hydration-id console warning — **CONFUSING, not fixed this session**

**FRICTION**: Song Detail and the Setlist Board produce a visible, scary-looking red console warning (`aria-describedby` id mismatch between server and client render) on load. Drag-and-drop still works correctly — confirmed by reordering sections/songs during this session's testing — so this is cosmetic, not functional.

**WHY IT EXISTS**: `@dnd-kit`'s internal SSR id generation isn't deterministic across server/client by default in this Next.js setup.

**USER IMPACT**: Low for end users (nobody using the app has devtools open), but real for any future developer who opens the console and assumes something is broken.

**RECOMMENDATION**: Investigate `@dnd-kit`'s documented SSR id option (a `useId`-based override) to silence it.

**PRIORITY**: P2.

---

### Finding 7 — No bulk "clear sample data" once a leader has entered real content — **FUTURE**

**FRICTION**: Finding 1's fix means sample data is now opt-in — but a leader who loads it to explore, then starts entering real songs alongside it, has no one-click way to remove just the 5 sample songs / 6 sample people later (only one-at-a-time delete, which already existed and still works).

**WHY IT EXISTS**: Out of scope for this session's fix, which only needed to stop *forced* seeding, not build sample-data lifecycle management.

**USER IMPACT**: Low — a leader who deliberately asked for sample data to explore is unlikely to then forget which rows were sample vs. real; the existing one-at-a-time delete (already in the product) remains available.

**RECOMMENDATION**: If this becomes a real friction point in the team trial (§46's feedback question 5, "what took too long"), add a visual "Sample" tag plus a bulk "Remove sample data" action.

**PRIORITY**: FUTURE.
