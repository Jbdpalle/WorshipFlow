# WorshipFlow — Song Flow Recommendations

The task brief's biggest stated worry (§9–10) is that the product might force a leader to "fight the software" to express a vision, and that it might make them re-enter the same information multiple times (vision → structure → directions). This document is the direct, live-tested answer to that worry for WorshipFlow specifically.

## The test

Using the exact leader narrative from the brief (§11, Here For You): *"Start this song with a soft keyboard intro. Then acoustic guitar comes in with an 8th or 16th-note strum. Drums play just the tom every 4th or 8th beat. For vocals, sing the first verse an octave lower so the next verse can go higher. Keep the first chorus lower. During the 'Let our shout' moment, lift the vocal higher and sing louder. Bring the whole band in strongly but not at maximum — approximately 70%. Then final chorus is full band, all vocals, parts and harmonies at 100%."*

This was typed, verbatim, into the Song Vision field on a real song, in a real browser session, and confirmed to round-trip through Postgres unmodified.

## Finding: the two-step model already matches the brief's own ask

**Step 1 — Song Vision** (`Song.visionNote`): one free-text field, headed "Song Vision" / "Where are we taking this song?", sitting directly above the structured editor. No structure is imposed on it. The leader can write exactly what's in their head, in their own words, in one pass — confirmed by typing the full narrative above into it with no friction, no required sub-fields, no validation beyond "it's text."

**Step 2 — Song Flow** (sections → role directions → dynamics): a separate, structured layer underneath, for the parts of the vision that need to become an operational instruction a specific person reads during rehearsal. This session built it out live: 7 sections (Intro, Verse 1, Chorus 1, "Let our shout," Free Worship, Final Chorus, Ending), 7 role-specific directions (e.g. Lead Vocal/Verse 1: "Low octave — leave room to lift later"; Drums/Verse 1: "Toms only, every 4th beat"), and 3 Dynamics levels (Intimate on Intro, Strong on "Let our shout," Full on Final Chorus).

Critically: **nothing required re-typing the vision's content.** The structured entries are shorter, role-specific operational fragments derived *from* the vision by the leader's own judgment — which is correct, because a drummer doesn't need "sing it an octave lower," they need "toms only, every 4th beat." Collapsing these into one field would either lose the vocal-specific detail or force every role to read the whole paragraph to extract their one line. The two-step model is the right shape, not duplicate entry.

## Why not auto-transform vision → structure (and why that's correct per the brief itself)

The brief explicitly says (§10, §36): if the product can't *intelligently* transform a vision into structure, don't fake it — make the structured editor fast instead. Two independent facts confirm this is the right call here, not an excuse:

1. **No AI is configured in this environment** — `ANTHROPIC_API_KEY` is unset, and the three existing AI-backed actions (theme/verse suggestion, Prepare Me summaries, roster-image import) all already degrade honestly with a clear error rather than faking a result when it's missing. Building a fourth AI-dependent feature (vision → structure) would either require a key that doesn't exist here or fake the transformation — both explicitly forbidden.
2. **The structured editor is already fast.** Confirmed live: adding a role direction is "Add direction" → pick a role from a dropdown → type → the field saves on blur, no dialog, no page navigation, no required fields beyond the one being typed. Seven role directions across six sections were entered in well under a minute of real interaction in this session's test. The friction the brief worries about (being forced to fill in fields you don't know yet) doesn't reproduce — every direction is optional per section, and an empty role simply isn't shown.

## Recommendation

No change to the Vision/Flow split. If this becomes a genuine pain point once a real team has used it for a few weeks (the team trial, `WORSHIPFLOW_TEAM_TRIAL_PLAN.md`, is the right place to find out — ask feedback question 5, "what took too long"), the lowest-risk future improvement is **not** an AI auto-transform but a small set of **quick-insert phrases** per role (e.g. a "copy from Vision" button that opens the vision text next to the role-note field purely as a reference to glance at while typing the short version) — a UI convenience, not a generated transformation, and worth building only if real usage shows it's actually needed.

**Priority: no P0 action. Documented as FUTURE, contingent on team-trial feedback.**
