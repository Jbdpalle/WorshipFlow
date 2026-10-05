# WorshipFlow — Usability Scorecard

All numbers below are **actual observations from this session's walkthrough** — real browser automation against a real local build, real Server Action round-trips, real timestamps (`Date.now()` deltas around each step). None are invented or estimated. The walkthrough used the real upcoming-set songs given for this round (God My Rock, Tu Hai, Jesus Have It All, Make Room, Offering) — titles only, no lyrics copied from anywhere.

**Important caveat, stated plainly**: these are timings from an automated script acting out a leader's and a drummer's tasks, not a real human with a phone in their hand, thinking out loud. They tell you the *floor* — how fast the mechanics can go with zero hesitation — not how a real person actually experiences it. Treat them as a baseline to compare a real trial's numbers against, not as the final answer.

## 1–10: the ten requested metrics

| # | Metric | Observed |
|---|---|---|
| 1 | Time to create first set | **1.7s** (second measurement; a first, cold run measured 3.7s — see note below) |
| 2 | Time to add first song (search-or-create dialog, one song) | Not isolated separately — see #3 (all 5 songs timed together, since that's how a real leader would actually do it) |
| 3 | Time to add all 5 real songs to the set | **5.2s** for 5 songs (~1s/song), via the same dialog for every song, no mode-switching between "search" and "create new" |
| 4 | Time from adding a song to a *usable* arrangement (vision + 6 sections + 8 role/vocal directions + 2 dynamics levels, on "God My Rock") | **9.4–9.8s** of pure interaction time for that much structured detail |
| 5 | Number of manual duplicate entries | **Zero** — confirmed directly (see `WORSHIPFLOW_PRODUCT_READINESS.md`'s Song Library section): a song's sections/lyrics/chords are shared data, not re-entered per set |
| 6 | Time for a team member to find My Part | **1.0s** — "My Part" is a labeled, always-visible item in the main navigation; the drummer persona reached it on the first click with no exploration |
| 7 | Time for a member to understand their first song via My Part alone | Content was present and correct on arrival (role, section, dynamics all answered — see North Star results below) — "understanding" beyond that is a human judgment this script can't measure, flagged as NOT VERIFIED rather than guessed |
| 8 | Number of help questions | N/A — no real human present to ask any (see Human Validation note) |
| 9 | Number of abandoned workflows | 1, in the *script*, not the product: this session's first walkthrough attempt hit a navigation bug in the *test script itself* (tried to click "Add Team Member" from the wrong page) — fixed and the real app flow completed cleanly on the next run. Recorded for transparency, not hidden. |
| 10 | Number of repeated navigation steps | None observed in the recorded flow — each task (set → songs → arrangement → transition → team → invite) was reachable in a direct path from where the previous task left off |

## Additional timings captured

| Step | Time |
|---|---|
| Signup → dashboard | 2.0s |
| Invite a drummer (after roster entry exists) | 0.3s |
| Drummer: accept invite → dashboard (a genuinely independent second login) | 2.2s |
| Build a real key-change transition (type + direction text) | 2.3s |

## North Star questions (brief §12) — answered from My Part alone, drummer persona

| Question | Answerable from My Part? |
|---|---|
| What song are we on? | **Yes** |
| What section are we in? | **Yes** |
| What am I supposed to play? | **Yes** ("Stay out completely" on Verse 1, "Full kit now, but stay under the vocal" on Chorus — the actual directions entered, verbatim) |
| How intense should it be? | **Yes** (Dynamics badge showed) |
| What happens next? | Partially — My Part lists all assigned songs, but doesn't show "next section" without opening Rehearsal Mode specifically |
| What is the transition? | **No — confirmed gap.** The key-change transition direction entered by the leader does not appear anywhere on My Part. A musician following only "check My Part" would never see it. This is a new, real P1 finding from this session, not previously documented. |

## Honest framing on "time to usable arrangement"

9.4–9.8 seconds for 6 sections + 8 directions + 2 dynamics levels is fast for a script with no hesitation and pre-decided text. It is evidence the *mechanics* don't force slowness (no required fields blocking progress, no page reloads between steps, saves on blur) — it is not evidence that a real worship leader, composing the actual words of a direction while thinking about the song, would move this fast. That distinction matters and is not glossed over here.
