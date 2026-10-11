# Workflow simplification — what changed and what was verified

Scope: set-level vision, Song Flow editing, rehearsal capture/triage, one-tap
Sunday practice, live following, mobile layout. No new song/arrangement/
session/live-state models: one table column set was extended
(`RehearsalNote`: `category`, `sectionId`, `status`, `createdAt`, `resolvedAt`).

## Measured before → after (375px viewport, seeded 4-song set, real browser)

Page height in screens of 800px; "after" is the final run.

| Page | Before | After |
|---|---|---|
| Set (leader) | 4.6 | 3.4 |
| Director/Live (leader) | 3.0 | 2.8 |
| Director/Live (musician) | 2.7 | 1.9 |
| Song detail (leader) | 2.2 | 3.4 (worse: the arrangement overview now fits the phone instead of scrolling sideways) |

Horizontal overflow: the Set page overflowed at 320px (331px wide) before;
none of the audited pages overflow at 320/375/390/430/768/834/1280 now.

## Verification run
- `npx tsc --noEmit`, `npx eslint .`: clean.
- `npx vitest run`: 389 tests pass (324 existing + 65 new).
- `npm run build`: succeeds.
- `tests/e2e/workflows.cjs` (manual, not part of `npm test`; needs the app
  running and Playwright): 15/15 checks pass — one-tap practice start,
  musician auto-follows the leader without tapping, a musician reading
  another section is not pulled away, scroll position kept, "Back to live",
  in-place quick note, leader converts a note into a direction, no
  horizontal overflow at seven widths.
- Not done: physical-device testing (iOS Safari / Android Chrome), keyboard
  overlay behaviour on a real phone, and the Screen Wake Lock behaviour on
  real hardware.
