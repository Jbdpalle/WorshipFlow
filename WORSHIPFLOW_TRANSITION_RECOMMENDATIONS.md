# WorshipFlow — Transition Recommendations

The task brief treats transitions as one of the most important capabilities in the product (its own §19: "treat transitions as one of the most important capabilities in WorshipFlow"). This document covers what exists, what was fixed this session, and what's recommended next — scoped so it can be read on its own.

## What exists (confirmed working, live-tested this session)

A `Transition` is a first-class row (not a note bolted onto a song): `fromSetSong`, optional `toSetSong` (null for the last song in a set), a `type` enum (Direct, Instrumental, Pad, Spoken, Prayer, Free Worship, Count-in, Pause, Custom), and a free-text `direction`. The editor is inline between adjacent setlist cards — collapsed to one line showing the type + direction, expanding to a type select + textarea on click. Built and saved live this session: a Pad transition from "Here For You" (key E) into "Song B" (key G) with the direction "Hold the last chord. Keys continue pads, drums out, move toward G while I pray. Acoustic enters when I start singing Song B." — confirmed persisted via the UI re-reading it correctly.

This is honest, minimal, and matches the brief's own instruction not to fake chord-suggestion or auto-transition intelligence.

## What was fixed this session: key context (P0)

Before this session, the control showed only the type label and direction text — nothing told a team member glancing at the setlist that the two songs were in different keys unless they read the full sentence. Fixed: both the collapsed and expanded views now show a small `E → G` badge whenever the two songs' *effective* keys (the per-set `overrideKey`, falling back to the song's own key) differ, and show nothing when they match. Verified live: a fresh set with two sample songs (`Key E`, `Key C`) rendered `Direct` / `E → C` on first load, before any transition was even configured — i.e. it works independent of whether the leader has written a direction yet, which is exactly when a guitarist most needs the heads-up.

## Recommended next (P1): a compact visual flow, not a new data model

The brief's §21 asks for something closer to:

```
SONG A (E)
  ↓ WASH
  ↓ PADS CONTINUE
  ↓ PRAYER
  ↓ MOVE TO G
  ↓ ACOUSTIC ENTERS
SONG B (G)
```

Recommendation: **do not** add new structured fields (ending type, individual beat-by-beat steps) — that re-introduces the "forcing the leader to fill in fields they don't think in" problem the brief itself warns against (§10). Instead, improve *presentation* of the two fields that already exist:

- Render the existing `type` + `direction` + the two songs' keys as a short vertical strip instead of one collapsed line — song A's key/title → an arrow with the type label → the direction text, wrapped, with real line breaks preserved → song B's key/title. This is a CSS/layout change over existing data, not a schema change.
- Keep the one-line collapsed view as the default (most of a setlist's transitions will be `Direct`, and those shouldn't take up vertical space) — expand the richer strip only for a transition that isn't `Direct`, or on explicit open.

Estimated cost: one component, no migration, no new Server Action. Scoped deliberately to NOT be done in this pass — this session's rule was audit → recommend → prioritize → implement P0 only, and the key-badge fix above already closes the single highest-risk gap (a silent key change).

## Recommended future (P2/Future)

- A small set of **starter direction templates** per transition type (e.g. selecting "Prayer" pre-fills "Leader prays. Band holds pads." as an editable starting point) — reduces typing without inventing intelligence, since it's a static string per type, not a generated one.
- Surfacing the **next song's key** inside Director Mode / Rehearsal Mode itself when a transition is coming up next, not just on the Setlist Board — this is the moment a musician actually needs the reminder, mid-rehearsal or mid-service.
- If Nashville Number System mode (already in the product — see the prior audit) is in use, consider showing the transition's key change in Nashville terms too, since a capo-based guitarist thinks in relative numbers, not absolute letters.

None of the above is implemented this session; all are explicitly deferred, not forgotten.
