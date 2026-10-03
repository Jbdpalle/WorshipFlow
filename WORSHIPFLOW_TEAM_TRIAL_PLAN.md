# WorshipFlow — Team Trial Plan

The immediate objective after this round of fixes is to use WorshipFlow with a real worship team, not just simulated personas. This document is the trial plan and the feedback process for it.

## Pre-trial checklist (all confirmed in this session)

- [x] A real signup starts with an empty library and roster (no sample-data confusion) — fixed and verified.
- [x] A leader can invite real team members and each gets a genuinely independent login — verified with 4 separate logins.
- [x] Song Vision, Song Flow, Dynamics, Free Worship, role directions, and Transitions all persist correctly — verified live.
- [x] My Part correctly filters to only the signed-in person's own role — verified for an assigned and an unassigned persona.
- [x] Director Mode's leader→follower sync and Announce both work — verified with two independent logins.
- [x] Tenant isolation holds against a forged URL from an unrelated account — verified (real 404).
- [x] `typecheck`, `lint`, `vitest`, and `next build` are all clean.
- [ ] Deployment to the team's actual environment — see `WORSHIPFLOW_FINAL_VERIFICATION.md` for exactly what is and isn't confirmed about the current production deployment from this session.

## Trial flow

1. **Create Service** — a real leader creates next Sunday's service under their own account (not a shared/demo one).
2. **Assign Team** — invite the real team members who will be in the trial (start small: the leader + 2–3 others is enough to prove the second-login and My Part paths without a large rollout).
3. **Add Songs** — add the actual songs being played that week.
4. **Define Song Vision** — the leader writes their vision in their own words for at least one song, the way they'd actually describe it to the band verbally.
5. **Arrange Songs** — build out the Song Flow for that song: sections, role directions, dynamics.
6. **Define Transitions** — if the set has a key change or a planned prayer/pad moment between two songs, build that transition and check that the key badge (if relevant) actually appears.
7. **Rehearse** — run an actual rehearsal through Rehearsal Mode / Director Mode, on real phones, in the real room.
8. **Change** — when something changes in rehearsal (it will), use the propose/keep experiment flow instead of just saying it out loud and hoping everyone remembers.
9. **Save** — confirm the kept change shows up correctly next time the song is opened.
10. **My Part** — have each musician actually open My Part on their own phone during or just before the rehearsal, not as a screenshot demo.
11. **Use it live** — if there's a chance to use it during an actual rehearsal before a live service, that's the real test; a sandbox walkthrough is not a substitute.

The most important thing to watch for during the trial is not whether each feature technically works — that's what this audit already checked — but: **"what did we still have to say out loud, that we expected the app to carry?"** That question, answered honestly by the team, is worth more than any further code-level verification.

## Feedback questions (ask every participant after the trial)

1. What was useful?
2. What was confusing?
3. What did you still need to ask the leader, that you expected the app to tell you?
4. What information was missing?
5. What took too long?
6. What did you ignore?
7. What would you want on your phone during rehearsal that isn't there?
8. What would make you use this every week?
9. What was better than your team's old method (paper, group chat, a shared doc, memory)?
10. What was worse?

## How to collect it

The product already has an in-app feedback mechanism (bug / feature / general, visible to whoever's account is in `ADMIN_EMAIL`) — use it during the trial for anything that comes up in the moment, so it's captured with the page context automatically rather than relying on someone remembering to mention it afterward. Follow up with the ten questions above as a structured conversation once the trial is over; don't treat the in-app feedback stream as a substitute for actually asking.

## What happens with the results

Feed real trial feedback back into a future `WORSHIPFLOW_NEXT_VERSION_PLAN.md` revision, prioritized the same way this one was: audit → recommend → prioritize → implement only what's justified. Do not pre-build speculative fixes for problems the trial hasn't actually surfaced yet.
