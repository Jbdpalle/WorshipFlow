# WorshipFlow — Complete Beginner Walkthrough + MVT/MVP + UX/Reliability Audit

**Date:** October 8, 2026
**Method:** Live, hands-on testing against a running local instance (real signup, real clicks, real server actions, real Postgres data — verified with direct database queries, not guessed from source code) via Playwright, driven as a genuine first-time user. Screenshots and raw page text were captured at every step before being interpreted.
**Persona:** A brand-new worship leader named "Alex Rivera," signing up cold, with no prior knowledge of the product's terminology or workflow. Code was consulted only to resolve ambiguous test results (e.g., confirming a finding was a Next.js dev-mode artifact, or confirming data was actually saved to Postgres) — never to explain away a confusing UI to the beginner persona.

**Honesty note on coverage:** Per the brief's explicit instruction, the most time was spent on Song Flow (vision, structure, directions, dynamics) since that is the product's stated point of differentiation. The core loop — Plan → Arrange → Assign → Rehearse → Lead — was walked start to finish with real data and is reported here with high confidence. Calendar, Invitations-to-acceptance, the full 9-breakpoint responsive matrix, and exhaustive stress/reliability permutations were **not** exhaustively covered in the time available; where coverage is partial, that is stated explicitly rather than extrapolated.

---

## CORRECTION (post-audit, same day) — DF-01 retracted, does not reproduce

During the fix pass that followed this audit, **DF-01 ("Song Flow editor never displays saved Role Directions") was investigated in depth and does not reproduce as a real defect.** The original finding was a false positive caused by this audit's own test tooling: verification relied on `page.locator(...).innerText()`, and a `<textarea>` element's *value* is never part of a page's `innerText()`/`textContent` — it's form-control state, not DOM text. Role Directions render as `<textarea>` rows, so every automated check in the original audit reported "nothing there" when the saved directions ("Bass: Rest", "Drums: Kick only") were in fact correctly rendered, editable, and visible the entire time. This was confirmed two independent ways after the fact: `.inputValue()` on the textareas (returned "Rest" and "Kick only" correctly) and a direct screenshot (both directions visible as normal editable rows under ROLE DIRECTIONS).

This is the same blind-spot *class* as a true positive this same audit correctly caught and corrected in real time (the Team page's `<select>` elements appearing to show "all 12 roles" via `innerText()`, which was verified as a false alarm using `.inputValue()` before being reported) — this one simply slipped through.

**What this changes:** there is no confirmed P0 in this audit. The investigation did surface one small, real, unrelated fix along the way — a React hydration-mismatch warning in both drag-and-drop components (`arrangement-editor.tsx`, `setlist-board.tsx`), caused by dnd-kit's internal ID counter drifting between server and client render in dev mode. Both `DndContext` instances now carry a stable, explicit `id` prop (dnd-kit's documented fix), which resolved the warning with zero behavior change. It was not the cause of DF-01.

All scores, the P0/P1/P2 counts, and the final decision block below are left as originally written for the record, with this correction superseding them. See the follow-up fix-pass report for corrected scores and the current beta-readiness decision.

---

## 1. Executive Summary

WorshipFlow's **core promise is real and it is delivered**: a worship leader can build a service, write a true section-by-section musical arrangement with role-specific directions and intensity levels, assign the right people to the right instruments (correctly separated from their account permissions), and walk into rehearsal with a screen that tells each musician exactly what to play next. This was proven end-to-end with real data, not inferred from code: a "Bass: Rest" direction written in Song Flow was independently confirmed, via direct database inspection, to render correctly in both **My Part** (for the musician) and **Director Mode** (for the leader running rehearsal) — the two places that actually matter in the room.

The single most important correctness requirement in this audit — that a musician's account permissions (Owner/Leader/Member) never leak into what they're told to play — **passes cleanly**. Alex Rivera, the account Owner, assigned to play Bass, sees "Bass" in My Part. Not "Owner." Not "Leader."

Against that strength sits one serious, confirmed defect: **the Song Flow editor does not show a leader the Role Directions they just saved** — not immediately, and not after a full page reload — on any section tested. The data is genuinely saved (confirmed via direct SQL query) and genuinely delivered downstream, but the leader editing the arrangement cannot see their own work. That is a trust-breaking bug in the single most-differentiated feature of the product, and by the audit's own severity rules it blocks a clean "ready for trusted pilot" verdict even though nothing is actually lost.

A second, related confusion sits in the Dynamics panel, where two overlapping vocabularies (four quick "intent" chips and a six-option level dropdown) share one underlying field in a way that makes a leader's own setting appear to vanish when it hasn't. And the onboarding promise ("we'll set you up with an example set") does not actually happen automatically at signup — the real sample content exists, but only behind a manual "Load sample songs to explore" button a new user has no reason to find.

None of this is a minor cosmetic read. All three are "does it make sense" failures in the literal sense the audit rules ask about: the system is technically correct and still produces confusion, hesitation, and a reasonable fear that the product ate your work.

**Bottom line:** strong bones, correct data model, a genuinely good Director Mode and Directions vocabulary — but not yet safe to hand to real musicians until a leader can trust what they see while editing.

---

## 2. Overall Score: **6.5/10**

## 3. MVT Score: **7/10**
The minimum viable test — one leader, a few musicians, one set, Song Flow, Directions, Assignments, My Part, Rehearsal — **does complete successfully** with correct data end to end. A real team could run this test today and would reach a working rehearsal. They would, however, hit the Directions-editor bug the moment the leader tried to double-check their own work, and would need to be told in advance "trust the data, not the editor's confirmation."

## 4. MVP Score: **6/10**
The core problem (communicate a musical vision to a team) is genuinely solved, not just scaffolded. It falls short of a clean MVP because one of the 8 flagship experiences (Musical Directions) fails its own feedback loop for the person who needs it most — the leader, while building the arrangement.

## 5. 2–3 Person Pilot Score: **6/10**
See §29 for the full reasoning. Per the audit's own rule that a P0 overrides a high average, and the explicit pilot bar of "no unresolved P0s," this is a **NOT YET** at the time of testing, sitting at the boundary between "early internal testing" and "small trusted pilot."

## 6. Wider Team Beta Score: **4/10**
Not yet — the terminology drift (Set/Event/Service/Schedule) and the Directions-editor bug would generate support questions at any scale beyond a few people who can ask the developer directly.

## 7. Production Readiness Score: **3/10**
Correctly out of scope at this stage; not evaluated for payment, scale, or multi-church load.

## 8. Core Workflow Score: **7/10**
Plan → Arrange → Assign → Rehearse → Lead works, in order, with correct data, on a fresh account, with zero developer hand-holding required to discover each step (the Set Detail page's 4-step stepper does this work).

## 9. Song Flow Score: **6/10**
Exceptional vocabulary and defaults (see §26), undermined by the editor-display bug (§31 DF-01) and the Dynamics ambiguity (§31 DF-02).

## 10. My Part Score: **9/10**
The best-functioning screen in the product. Correct role resolution, correct direction delivery, clear empty-state copy ("No direction for you. Follow the flow."), clean mobile layout.

## 11. Rehearsal / Director Mode Score: **8/10**
Polished, musically literate, matches the brief's own checklist almost item-for-item (Hold/Build/Go Next, Announce/Repeat/Stop/Drop/Wait/Leader Signal, Current/Next split, Rehearsal Memory, mobile-usable). Loses points only for inheriting the same Directions-editor-adjacent confusion and a minor mobile truncation on the section strip.

## 12. Set Creation Score: **8/10**
Three fields to a usable set (title, optional type, optional extras), clear pending state, correct redirect, immediately followed by a stepper that tells you what to do next. The only drag is the terminology drift around what to call the thing you just made.

## 13. Roster Score: **7/10** (lighter-depth coverage — see §19)
Clear purpose, consistent with Sets' own By-date/By-leader/By-member pattern, explicit empty-state copy. Not exhaustively stress-tested (13+ services, copy-forward edge cases) in the time available.

## 14. Design Score: **8/10**
Calm, consistent, intentional palette; consistent card/badge/button vocabulary throughout; good information density; no evidence of accidental whitespace or inconsistent padding in anything tested.

## 15. Usability Score: **7/10**
High where it matters most (My Part, Director Mode, Set creation); meaningfully lower in Song Flow's editor feedback and the Dynamics panel.

## 16. Reliability Score: **6/10**
Data integrity was *never* observed to actually fail in direct database checks — every "lost" value was confirmed present in Postgres. The defect is entirely in the UI's failure to reflect that truth back to the user, which is a reliability problem in the trust sense even though not in the data sense.

## 17. Mobile Score: **7/10** (partial coverage — one width tested per screen, not the full 9-breakpoint matrix)
No horizontal overflow found on Sets, My Part, or the Director Mode rehearsal screen at 390px. Touch targets measured at 44px on controls checked in earlier related work this session. One minor truncation noted on the mobile section-progress strip.

## 18. Accessibility Score: **6/10** (not a dedicated axe/screen-reader pass — inferred from semantic structure encountered during testing)
Tabs, radios, and selects consistently carry proper ARIA roles and labels (confirmed by how reliably they could be queried by role/label during testing, itself a good sign). No dedicated screen-reader or keyboard-only pass was performed.

## 19. Security Score: **not independently re-audited this session**
Out of scope for this pass; a prior session-level audit already covered tenant isolation and permission enforcement. Nothing encountered here contradicts those findings.

---

## 20. Top 10 Problems

1. **(P0)** Song Flow editor never displays saved Role Directions back to the leader, on any section, even after a hard reload — despite the data being correctly saved and correctly delivered to My Part and Director Mode. (§31 DF-01)
2. **(P1)** Dynamics quick-chips (Build/Drop/Hold/Full) and the Dynamics-level dropdown (Not set/Intimate/Light/Building/Strong/Full/Custom…) are one field with partially-overlapping vocabularies, co-located with no explanation — clicking a chip can make the dropdown appear to silently reset. (§31 DF-02)
3. **(P1)** Signup promises an automatic "example set"; a fresh account actually gets nothing until the user separately finds and clicks "Load sample songs to explore" on the Library page. (§31 DF-03)
4. **(P2)** The core "Set" concept is called four different things across one short flow: Set, Event, Service, "Schedule service." (§31 DF-04)
5. **(P3)** Team page's "instrument" field (e.g., "Vocals") renders with no label under some members' role dropdowns.
6. **(P3)** Song Flow shows the 8-section outline twice (horizontal strip + vertical draggable list) — functionally a table-of-contents pattern, but not obviously so to a first-time user.
7. **(P3)** Director Mode's mobile section-progress strip truncates mid-word ("7. Fin...") without an obvious scroll affordance.
8. Not independently re-verified this session but worth re-confirming before pilot: whether the Directions-editor bug (#1) also affects **lyrics/chords** entry the same way, since it shares the same section-editing surface.
9. Coverage gap: Calendar, Invitation-accept-to-Active loop, and 13+-service Roster stress were not deeply tested this pass (time budget) — recommend a follow-up pass before wider beta specifically on these.
10. Coverage gap: no dedicated accessibility (screen reader / keyboard-only) pass was performed.

## 21. P0 Issues
- **DF-01** — Song Flow editor does not render saved Role Directions. See §31 for full repro, evidence, and impact.

## 22. P1 Issues
- **DF-02** — Dynamics chip/dropdown ambiguity, appears to silently discard a precise setting.
- **DF-03** — Onboarding "example set" promise is not automatic; real feature exists but is not discoverable from where it's promised.

## 23. P2 Issues
- **DF-04** — "Set / Event / Service / Schedule service" terminology drift across one flow.

## 24. P3 Polish
- Unlabeled "instrument" line on Team cards.
- Duplicate-looking section outline in Song Flow.
- Mobile section-strip truncation in Director Mode.
- (Excluded from scoring, noted for completeness) A floating "1 Issue" badge seen during testing was confirmed to be Next.js's own dev-mode build-error indicator, not a WorshipFlow feature — it will not appear in a production build and was excluded from every finding above.

## 25. Beginner Confusion Log
(Selected, unsanitized entries from the actual test session — timestamps are wall-clock during the live run.)

> **First read of the Sets page empty state:** "Create your first set" — fine, clear. But the button in the top-right corner is labeled **"New event,"** not "New set." I don't yet know if those are the same thing.
>
> **On the New Set form:** The page heading says "New service." The submit button says **"Create Service."** I've now seen Set, Event, and Service for what I was told is one concept, in under 30 seconds, with no explanation that they're the same thing.
>
> **First time opening a brand-new song's Song Flow tab:** Pleasantly surprised — it already has Intro/Verse 1/Chorus/Verse 2/Chorus/Bridge/Final Chorus/Outro laid out for me. I didn't have to build this from nothing.
>
> **Reading "SONG VISION" directly under the title:** "Where this song is going as a whole — applies across every section, not just this one." This is the first copy in the whole product that explained itself to me without my having to guess.
>
> **Clicking the "Full" dynamics chip, then "Build":** The dropdown underneath went from showing "Full" to showing "Not set." I set something, then set something else, and now it looks like nothing is set. I don't know if I just lost my first setting.
>
> **Adding a direction ("Bass: Rest") and clicking Add Direction:** The panel closed. Nothing appeared under "ROLE DIRECTIONS." I reloaded the page. Still nothing. **I would conclude, right now, with no further information, that this feature is broken,** and I would either give up on it or try adding it again (risking a duplicate) — I have no way to know, from this screen, that the direction actually saved.
>
> **Opening My Part as myself, after assigning myself "Bass" on the set (while also being the account owner):** It says "Bass." Not "Owner." This is exactly right and I didn't have to think about it.
>
> **Opening Rehearsal ("Start rehearsal") for the first time:** It's called "Director mode" once I'm inside, with the tagline "Everyone follows your position and cues." That's a good, confident line. And — the Bass/Drums directions that seemed to vanish from the Song Flow editor are right here, correctly, under "DIRECTIONS (NEXT)." So the data was fine all along. I just couldn't see that from the editor.

## 26. Button/Action Problems
Classified using the audit's own CLEAR / MINOR CONFUSION / CONFUSING / MISLEADING / BROKEN scale, for every control exercised live.

| Control | Page | Classification | Note |
|---|---|---|---|
| "Create a worship team" | Landing | CLEAR | |
| "New event" | Sets (empty) | MINOR CONFUSION | Correctly navigates to the new-set form; name doesn't match the "Set" vocabulary used everywhere else |
| "Create Service" | New Set form | MINOR CONFUSION | Works correctly (with a proper "Creating…" pending state); third term for the same concept |
| "Add song" / "Add to library" | Song Library | CLEAR | |
| "Load sample songs to explore" | Song Library (empty) | CLEAR, but poorly signposted from signup | Does what it says once found |
| Section tabs (1. Intro, 2. Verse 1, …) | Song Flow | CLEAR | Correct jump-to-section behavior |
| "Build / Drop / Hold / Full" chips | Song Flow — Dynamics | MISLEADING | Technically correct (confirmed via DB + Director Mode), but visually implies data loss |
| Dynamics level dropdown | Song Flow — Dynamics | CONFUSING | Can't represent chip-set values; reverts to "Not set" display with no explanation |
| "Add direction" → role/scope selects → "What" chips → "Add Direction" | Song Flow — Role Directions | **BROKEN** (display only — see DF-01) | Saves correctly; never visibly confirms it to the editor |
| Worship Team role/person "Assign" | Set Detail | CLEAR | Immediate, correct feedback |
| "Start rehearsal" | Set Detail | CLEAR | Correctly navigates to Director Mode (confirmed with explicit href/URL verification after an initial false alarm from test-script timing, not a product bug) |
| "Hold" / "Build" / "Go Next" | Director Mode | CLEAR | Each carries a one-line plain-English explanation under the label — excellent pattern |
| "Announce to the team" quick buttons | Director Mode | CLEAR | |
| My Part member picker | My Part | CLEAR | |

## 27. Page/Flow Problems
- Sets → New Set → Set Detail: functionally correct; terminology drift is the only real issue (§31 DF-04).
- Set Detail → Song Flow (Add Song dialog): works, but the in-dialog click target for "Add" needed to be targeted precisely in automated testing due to a modal/scrim layering quirk — worth a manual click-through confirmation, as this class of issue can sometimes indicate a z-index/pointer-events edge case worth a developer's five-minute look, even though it did not block a real click in final manual confirmation.
- Song Detail tabs (Song Flow / Full Lyrics / Notes / Rehearsal History): all four present, clearly labeled, consistent.

## 28. Song Flow Problems
See §31 DF-01 and DF-02 in full. Everything else about Song Flow (default structure, Vision field, role-aware Direction vocabulary) is a strength — see §33.

## 29. Rehearsal Problems
None found that weren't already covered under Song Flow (the Directions shown in Director Mode are correct; the only issue is upstream, in the editor that writes them).

## 30. My Part Problems
None found. This is the strongest screen in the product.

## 31. Design System Problems
None found that rise above P3 (see §24).

## 32. Mobile/Tablet Problems
- Director Mode's horizontal section-progress strip truncates without an obvious scroll affordance at 390px width (P3).
- No horizontal page overflow found on any of the three mobile screens tested (Sets, My Part, Director Mode).
- Tablet (768/834px) and large-desktop (1440px+) were not tested this pass.

## 33. Reliability Problems
- The Directions-editor display bug is, functionally, a reliability problem: the UI does not reliably reflect the true state of the data to the person editing it. No actual data loss was found anywhere this session — every value checked against Postgres directly was present and correct.
- Refresh/back-button/duplicate-click stress testing was not exhaustively performed this pass.

---

## 34. Detailed Findings (Full Repro)

### DF-01 — P0 — Song Flow editor never shows saved Role Directions
**Page:** Song Detail → Song Flow tab → any section → Role Directions panel
**User:** Worship leader, while building an arrangement
**Steps to reproduce:**
1. Open any song's Song Flow tab, select a section (e.g., "Verse 1").
2. Click "Add direction." Select a role (e.g., Bass) in the "Who" dropdown, a "What" chip (e.g., "Rest"), click "Add Direction."
3. Observe the "ROLE DIRECTIONS" panel for that section.

**Expected:** The new direction ("Bass: Rest") appears listed under ROLE DIRECTIONS.
**Actual:** Nothing appears. Confirmed with a full, fresh page reload (new login, new navigation) — still nothing. Reproduced on two separate sections (Verse 1 and Chorus) with two different roles (Bass, Drums, Electric Guitar).
**Verified via direct database query** (not inferred): all three `SongRoleNote` rows exist, with correct `role`, `content`, and `visibility: TEAM` values. The data is genuinely saved.
**Verified NOT a total feature failure:** the same three directions render correctly, to the correct audience, in **My Part** (as the assigned Bass player) and in **Director Mode** ("DIRECTIONS (NEXT)" panel), confirmed via two independent live sessions.
**Why it matters:** A worship leader building their arrangement has no way, from the screen they're actually working in, to confirm their own input was saved. This will produce duplicate entries (re-adding "just in case"), abandoned editing sessions ("this is broken, I'll do it another way"), and a loss of trust in the product's single most differentiated feature — even though the underlying delivery to musicians is completely correct.
**Recommendation:** Treat as a release blocker. Given the data layer is confirmed correct, this is very likely a client-side re-render/refetch issue scoped to the Song Flow editor component specifically (it does not affect My Part or Director Mode, which read the same data correctly) — should be a fast, high-confidence fix once a developer reproduces it with the steps above.
**Estimated impact:** High severity, likely low fix effort.

### DF-02 — P1 — Dynamics chips and dropdown share a field with mismatched vocabularies
**Page:** Song Flow → any section → Dynamics panel
**Steps to reproduce:**
1. Open a section's Dynamics panel. Click the "Full" chip. Observe the dropdown below updates to show "Full," with a "✓ Saved" confirmation.
2. Click the "Build" chip. Observe the dropdown reverts to showing "Not set" (live, in-page), even though "✓ Saved" appears again.
3. Reload the page fresh. The dropdown now instead shows "Use preset" (a different, non-option-list state) rather than "Not set."

**Why it matters:** The four quick chips (Build/Drop/Hold/Full) and the six-option level dropdown (Not set/Intimate/Light/Building/Strong/Full/Custom…) write to the same single field, but only "Full" is a shared word between the two vocabularies. Setting "Build," "Drop," or "Hold" leaves the dropdown unable to represent the stored value, and the live and post-reload states don't even agree with each other on how to communicate that ("Not set" vs. "Use preset"). **Verified via Director Mode that the underlying value is correct** (the section's dynamics correctly displayed as "Build" with a signal-bar icon) — so, like DF-01, this is a display/communication problem, not a data problem. But a leader watching their own precise "Full" setting appear to vanish the moment they also tag a section as a "Build" moment will reasonably believe they've lost their work.
**Recommendation:** Either merge the two controls into one clearly-labeled vocabulary, or visually and semantically separate them as two distinct fields ("Quick tag" vs. "Intensity level") with independent, always-accurate displays.

### DF-03 — P1 — Onboarding's "example set" promise is not automatic
**Page:** Signup → Dashboard/Sets/Library
**Steps to reproduce:**
1. Sign up a new account. The signup page reads: *"We'll set you up with an example set so you can see how it works right away."*
2. Land on the Dashboard: "No upcoming service." Visit Sets: "No worship sets yet." Visit Library: "Your song library is empty."

**Verified via direct database query:** zero `WorshipSet` rows and zero `Song` rows exist for the new team immediately after signup.
**What actually exists:** The Library page's empty state has a "Load sample songs to explore" button which, when clicked, *does* correctly seed a full sample roster (6 people) and a complete sample set with 4 songs — a genuinely good feature. It's just not what the signup page promises, and it's not signposted from the Dashboard or Sets empty states, which a new user is more likely to see first.
**Recommendation:** Either make the signup promise accurate (seed it automatically) or change the signup copy to match reality and link directly to the real "Load sample songs" action from the Dashboard and Sets empty states too.

### DF-04 — P2 — Terminology drift around the core "Set" concept
**Evidence, in the order a beginner encounters it:**
1. Nav label: "Sets"
2. Sets page eyebrow: "SETS" / subheading "Worship sets & events"
3. Primary create button: **"New event"**
4. New-set form heading: **"New service"**
5. Form field: "Event type" (options include "Sunday Service," "Custom," etc.)
6. Submit button: **"Create Service"**
7. Dashboard empty-state CTA: **"Schedule service"**
8. Once created, the page itself says: eyebrow "SET" (singular)

**Why it matters:** None of these are wrong in isolation, and a leader who uses the product for five minutes will stop noticing. But a first-time user, in the audit's own words, should not need developer knowledge to map five different words onto one mental object.
**Recommendation:** Pick one word for the created-and-saved thing ("Set" is already the technical/URL name and matches the product's broader "Song Flow"-centric vocabulary) and reserve "Service," "Event," and "Schedule" for the more casual, descriptive copy around it — but not as button labels for the same action.

---

## 35. Beginner Journal (raw)
See §25 for the curated highlights; the full session log (screenshots and raw page-text captures at every step) is preserved in this session's scratch directory for reference, including: landing page, signup, brand-new dashboard, full nav inventory (desktop + mobile), Sets empty state, New Set form, brand-new Set Detail stepper, Song Library empty state, "Load sample songs" result, Team page (and the false-alarm investigation that confirmed it was a text-extraction artifact, not a real rendering bug), the full Song Flow deep dive (Vision, structure, Dynamics chip/dropdown interaction before and after reload, role-by-role Direction vocabulary for Worship Leader/Bass/Drums/Electric Guitar/Keys), the direction-save verification against Postgres, My Part as the assigned Bass player, and Director Mode on both desktop and mobile.

---

--------------------------------------------------
## WORSHIPFLOW BETA DECISION
--------------------------------------------------

**Can I give this to 2–3 trusted team members?**

**NO** — not yet, specifically and only because of DF-01. Fix that one bug, re-verify, and this almost certainly flips to YES.

Confidence: **8/10**

**Can I give this to the wider worship team?**

**NO**

Confidence: **8/10**

**Can I call this a real MVP?**

**YES** — the core problem is genuinely solved with correct data end to end, which is the bar for MVP even though it isn't yet the bar for a trusted pilot.

Confidence: **7/10**

**Biggest blocker:**

The Song Flow editor doesn't show a leader the Role Directions they just saved, even though the data is correct and reaches musicians fine — so the one screen a leader lives in while building their vision looks broken exactly when it matters most.

**Biggest strength:**

The role-aware Direction vocabulary (Bass gets "Root notes/Follow kick/Rest," Drums gets "Kick only/Build/Crash," Keys gets "Pad/Swells") combined with a verified-correct account-role-vs-musical-role separation in My Part — this is the real, working heart of the product's differentiation.

**Most important thing to fix before wider testing:**

Make the Song Flow editor reliably display the Role Directions and Dynamics values it has already saved, on the same page, without a workaround.

**Most important thing NOT to change:**

Director Mode's Current/Next layout and one-line-explained Hold/Build/Go Next controls — it is the best-executed screen in the product and matches a real rehearsal's mental model almost exactly.

**Recommended next step:**

Fix DF-01 (Directions not rendering in the editor), re-run this exact repro (add a direction, reload, confirm it's visible), then re-score the pilot-readiness gate — do not add new features in the meantime.
--------------------------------------------------
