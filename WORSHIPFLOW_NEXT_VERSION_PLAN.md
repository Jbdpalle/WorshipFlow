# WorshipFlow — Next Version Plan

Supersedes the prior `WORSHIPFLOW_NEXT_VERSION_PLAN.md` (8 items, all shipped: invite flow, Dynamics, Free Worship, Transition Builder, the role-note ceiling fix, Director Mode Announce, the hydration-race fix, automated tests). This plan reflects the real-user audit in this round (`WORSHIPFLOW_REAL_USER_AUDIT.md`, `WORSHIPFLOW_UX_FINDINGS.md`, `WORSHIPFLOW_TRANSITION_RECOMMENDATIONS.md`, `WORSHIPFLOW_SONG_FLOW_RECOMMENDATIONS.md`).

Categories per the brief: **P0** (must fix before a real team trial), **P1** (important for the first MVP iteration), **P2** (useful enhancement), **FUTURE** (post-MVP). No overall score is given, per the brief's own instruction.

---

## P0 — must fix before a real team trial

All three shipped and verified live this session. Nothing else met the P0 bar (blocking a real trial) this round.

1. ~~Real signups silently pre-polluted with 6 fake people + 5 fake songs~~ — **DONE**. `registerUser` no longer auto-seeds; sample data is now an explicit opt-in from the Song Library's empty state.
2. ~~Transition Builder showed no FROM/TO key context~~ — **DONE**. Collapsed and expanded views now show `E → G` whenever adjacent songs' effective keys differ.
3. ~~Horizontal overflow at 375px on Song Detail and Team~~ — **DONE**. Both rows now wrap.

## P1 — important for the first MVP iteration

1. **Transition visual flow strip** (`WORSHIPFLOW_TRANSITION_RECOMMENDATIONS.md`) — present the existing type + direction + key data as a short vertical strip for non-Direct transitions, instead of one collapsed line. No schema change; a presentation change over data that already exists.
2. **Settings-page mobile pass** — measured clean for horizontal overflow this session, but not exhaustively interacted with on a touch viewport (tap targets, keyboard behavior). Finish the mobile sweep the prior audit started.
3. **Full offline PWA re-verification** — carried forward as NOT VERIFIED from the prior audit; still not independently re-tested this session. Needs a real airplane-mode pass against Rehearsal Mode and My Part specifically (the two screens most likely to be used without reliable venue wifi).

## P2 — useful enhancement

1. **Silence the `@dnd-kit` SSR `aria-describedby` hydration-id console warning** on Song Detail / Setlist Board. Cosmetic only — drag-and-drop itself works correctly, confirmed by reordering both sections and setlist songs live this session — but worth cleaning up so a future developer doesn't chase a phantom bug.
2. **Starter direction templates per transition type** — e.g. selecting "Prayer" pre-fills an editable "Leader prays. Band holds pads." Not AI; a static string lookup per type.
3. **Next-song key reminder inside Rehearsal Mode / Director Mode itself**, not only on the Setlist Board — the moment a musician actually needs the "next song is in G" reminder is mid-rehearsal, not while looking at the setlist screen.

## FUTURE — post-MVP

1. **Bulk "remove sample data"** once a leader has loaded it to explore and later wants it gone, beyond the existing one-at-a-time delete. Only worth building if the team trial's own feedback (question 5: "what took too long") shows it's actually needed.
2. **Quick-insert-from-Vision** convenience in the structured Song Flow editor (glance at the Vision text while typing a role note) — explicitly *not* an AI auto-transform; see `WORSHIPFLOW_SONG_FLOW_RECOMMENDATIONS.md` for why that's deliberately out of scope.
3. Everything already out of scope for the MVP per the product brief and unchanged this round: click track / tempo map / MIDI / count-in / in-ear monitoring, Ableton integration, AI-generated setlists or arrangements.

## What this plan does *not* include, on purpose

Per the brief's own implementation rule (§47): audit → recommend → prioritize → implement P0 → test → implement P1 only where justified. This plan lists P1/P2/FUTURE as recommendations, not as work done this round. Only the three P0 items above were implemented, tested (typecheck/lint/vitest/build all clean, plus live before/after verification for each), and are reflected in the git history for this session.
