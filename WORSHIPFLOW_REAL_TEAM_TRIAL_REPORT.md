# WorshipFlow — Real Team Trial Report

## A note on what this document is, before anything else

**No real worship team used WorshipFlow this session.** I (Claude) do not have access to real human participants, and I want to say that plainly rather than let a document titled "Real Team Trial Report" imply otherwise. What follows is a **structured cognitive walkthrough**: I drove the product through real browser sessions, acting out each role (leader, drummer, vocalist) using only what was visible on screen to decide each next action, and logging friction the way the brief's own observation framework asks for (expected vs. actual, severity, suggested improvement). This is a legitimate and common usability-evaluation technique, and every specific claim in it is backed by an actual UI interaction or measurement in this session — but it is **not a substitute for a real worship team's experience**, and I have not represented it as one anywhere in this document. One more honesty note: I already know this product deeply from auditing it in prior sessions, so I cannot claim the "never seen it before" naivety a genuinely new user would bring — where that matters, I've said so inline.

Where this document says "the leader," "the drummer," etc., it means "Claude, acting out that role's stated goal, using only the on-screen labels." Nowhere does it mean a real person.

---

## 1. Trial objective

Determine whether a worship leader could prepare a real Sunday set and communicate musical direction to a team using WorshipFlow, and whether musicians could find and understand their own part, without a developer explaining the software — evaluated here via simulation, with the explicit caveat above.

## 2. Participants / roles (simulated)

- Worship Leader (Claude, acting the role) — created the set, wrote the vision, built the arrangement.
- Drummer (Claude, in a second, genuinely independent browser login via a real invite acceptance) — looked only at what the app surfaced for this role.
- A third, unrelated account (Claude) — used only to confirm tenant isolation, not as a "team" persona.

## 3. Environment

Local production build (`next build && next start`, NODE_ENV=production — the same build process Vercel runs), matching the exact commit (`924969d`) confirmed live on `https://worship-flow-murex.vercel.app` per `WORSHIPFLOW_TRIAL_READINESS.md`. Mobile passes used real viewport emulation at 375px and 390px, not a resized desktop window.

## 4. Workflow tested

Create Sunday set → service details → add songs → order → keys → set-level direction → Song Vision → arrange sections → section directions → role-specific directions → vocal directions → dynamics → a free-worship moment → a key-change transition → team assignment → rehearsal → Director Mode → My Part, run across two prior sessions and this one — see `WORSHIPFLOW_REAL_USER_AUDIT.md` for the first pass and §5 below for what's new or re-confirmed this round.

## 5. What worked

Acting as the leader, with no documentation open and only the on-screen labels to go on: "Song Vision" sits directly above the arrangement editor with a leading question ("Where are we taking this song?") that correctly primed what to type there — no hesitation about what belonged in that field versus the structured one below it. Typing a real, multi-instrument direction ("Open on just a keyboard pad... keep drums completely out until the chorus... build gradually through the bridge... hold the last chord and drop to just keys for the transition") worked exactly as a free-text field should: no formatting fights, no character limit encountered, saved on blur with no separate save button to hunt for.

Building the structured arrangement: "Add section" → type a label → Add was a fast enough loop that six sections went in in well under a minute. "Add direction" → pick a role from a dropdown → type → it saved on blur. Nothing forced re-typing the vision — the structured entries were short, role-specific fragments ("Enter with slow fingerpick, no strum yet"), which is the right shape for a drummer or guitarist glancing at their own line, not a paragraph.

The Free Worship moment: toggling the Wind icon visibly changed the section's visual treatment (dashed border instead of the normal solid accent border), and the direction I wrote ("Linger here. Leave space for prayer or spontaneous singing. If it builds, bring drums and bass back in gradually. Move to final chorus on my signal.") is exactly the register the brief asked for — not over-structured, not generic.

The key-change transition: clicking the collapsed "Direct" control, switching its type to "Pad," and writing a real direction produced, after this session's fix, a visible key-change badge next to it — acting as the drummer glancing at the setlist, the badge alone (not having to read the sentence) was enough to know something was changing between these two songs.

As the Drummer, after accepting a real invite (a second, independent login, not the leader switching hats): My Part showed only this role's own lines, with no scrolling through anyone else's. In the prior session's deeper pass (re-confirmed, not re-run, this round — see `WORSHIPFLOW_REAL_USER_AUDIT.md` §1), the same held for a Lead Vocal persona with octave/intensity-specific direction, and an unassigned persona correctly saw an empty state rather than a leak.

Director Mode, as the leader: Prev/Next moved my own view; as the Drummer on a second screen, that same move arrived within one polling cycle (~3.5s, confirmed in isolated timing, not claimed as faster than it is). The product never calls this real-time anywhere in its own UI copy — confirmed correct, not just assumed.

## 6. What confused users (simulated)

Acting as a non-leader team member: the Invite button is shown on the Team page to every member, not just the leader. Expecting to be able to invite a bandmate (a reasonable thing for any team member to try), the attempt produced a clear rejection message ("Only the worship leader can invite people.") rather than silently failing or crashing — so the *security* is right, but the *experience* is a dead end a leader-only UI would have avoided entirely.

## 7. What users expected (simulated) vs. actual

| Expected | Actual | Friction | Severity | Suggested improvement |
|---|---|---|---|---|
| As a non-leader, not seeing an "Invite" button I can't actually use | Button is shown to everyone; using it produces a rejection | A real dead-end tap, not a crash | P1 | Hide the button client-side for non-leader roles (the server check already exists and is correct) |
| Losing signal mid-rehearsal would show *something* usable (even read-only) for the song already open | The app shell (nav) stays up; the actual rehearsal content depends on a live connection, by the service worker's own explicit design | Could matter in a venue with bad wifi/cell signal | P1 (documented, not silently assumed) | None proposed this session — out of scope for "fix," in scope for "tell the trial team honestly" |
| Tapping a small icon (duplicate/delete a section, remove a team member) would be comfortably sized one-handed | Several of these measure under the common ~44px touch-target guideline | Minor mis-taps possible, especially one-handed while holding an instrument | P1 | Increase tap-target padding on these specific icon buttons |

## 8. Major friction points

In order of real-world impact: (1) the Invite-button dead-end for non-leaders, (2) no offline rehearsal fallback for actual content, (3) small touch targets on secondary section/roster actions. None of the three prevented completing the core workflow in this session's walkthrough.

## 9. Mobile findings

Re-swept this round at both 375px and 390px (the brief's two named widths) across all 8 requested screens — zero horizontal overflow anywhere, confirming last round's fix generalizes to both widths, not just the one originally measured. New finding this round: the sub-32px icon-button sizing noted above (§7), found by measuring every visible button/link's bounding box, not by eyeballing screenshots.

## 10. Rehearsal findings

Re-confirmed (prior session, this round's security/mobile passes didn't need to re-exercise this): current/next section both legible on a 375px screen without zooming; Prev/Next large enough to tap confidently; the propose → keep experiment flow correctly left the underlying direction untouched until explicitly kept, then mutated it (DB-verified in the prior session, see `WORSHIPFLOW_REAL_USER_AUDIT.md` §1).

## 11. Transition findings

See §5. The one structural gap named by the brief (no FROM/TO key context) is fixed and reconfirmed working this round. The richer visual flow strip the brief sketches (§21 of the original audit brief) remains P1, undone, by design — see `WORSHIPFLOW_TRANSITION_RECOMMENDATIONS.md` for the reasoning.

## 12. Song Vision findings

See `WORSHIPFLOW_SONG_FLOW_RECOMMENDATIONS.md` for the full analysis (unchanged this round, re-exercised with a different, equally realistic vision text this session with the same result: no duplicate-entry friction, no forced structure).

## 13. Free Worship findings

See §5. Worked as intended on first use with no instruction beyond the on-screen Wind-icon tooltip ("Spontaneous / freeform section (e.g. Free Worship) — fewer required fields").

## 14. My Part findings

Re-confirmed this round for the Drummer persona (a fresh, independent invite acceptance, not a reused account): correct role-scoped content, no leakage. Prior session additionally confirmed this for a Lead Vocal persona with PERSON-visibility notes and an unassigned persona's empty state — not re-run this round since nothing in this round's changes touched that code path.

## 15. Director Mode findings

See §5. Polling-based, ~3.5s observed latency, never described as real-time anywhere in the product — all re-confirmed, not newly discovered, this round.

## 16. User feedback

**None collected** — there were no real users. Do not read this section as survey results; it's intentionally empty, because filling it with simulated "feedback" would misrepresent what happened.

## 17. P0

None. See `WORSHIPFLOW_TRIAL_READINESS.md` §2.

## 18. P1

1. Hide the Invite button from non-leader team members (server-side check is already correct; this is a UI-only fix).
2. Enlarge the handful of sub-32px icon-only secondary action buttons.
3. Tell trial participants explicitly that WorshipFlow needs a live connection — do not let anyone assume offline rehearsal works.

Full list, including carried-over items: `WORSHIPFLOW_TRIAL_READINESS.md` §3.

## 19. P2

Unchanged from `WORSHIPFLOW_NEXT_VERSION_PLAN.md`.

## 20. Recommended MVP changes

Of the three P1 items above, only #1 (hiding the Invite button) is small enough to be a same-session fix without risking scope creep — but per this round's explicit instruction ("only implement changes necessary to safely and meaningfully conduct the trial"), it is not a trial blocker (the server correctly rejects the attempt; nothing breaks or leaks), so it was **documented, not implemented**, this session. Recommend it as the first item in the next work session specifically because it's small, isolated, and directly reduces a real dead-end a real team member would hit.

## 21. Deferred features

Everything in `WORSHIPFLOW_NEXT_VERSION_PLAN.md` P1/P2/FUTURE, unchanged.

## 22. Final readiness state

See the end of this session's summary response for the single chosen gate state and why.
