# WorshipFlow Design System

Direction: **Warm Instrumental**, with a designed dark theme called **Stage**.
Exploration and rationale: the "WorshipFlow Design Exploration" canvas (boards A, B, C and Compare).

Feel: a worship binder on a music stand. Calm, warm, clear. Not a SaaS dashboard.

**Source of truth:** `app/globals.css`. Do not hard-code colours, radii or shadows in components. `tests/design-tokens.test.ts` enforces light/dark parity and WCAG AA contrast for every text/background pairing.

## Themes

| | Light ("Warm") | Dark ("Stage") |
|---|---|---|
| Ground | warm stone `#f3f0ea` | graphite `#16181a` |
| Primary | forest `#2c4a3e` | brass `#d2a85a` |
| Musical | brass `#8a5a12` | signal blue `#86b2c8` |

Stage is authored, not inverted. It is a **manual toggle only** (sidebar/More menu and Settings → Appearance); the OS dark-mode setting is ignored and Light is always the default. A later phase may add a Stage shortcut inside Rehearsal and Director Mode.

## Colour roles

| Token | Use | Do not use for |
|---|---|---|
| `primary` / `primary-foreground` | the one important action on a screen, active navigation | decoration, every button |
| `musical` / `musical-soft` | keys, tempo, dynamics, "where we are now" | actions |
| `success` | confirmed, complete | |
| `warning` | needs attention (always with an icon and a word) | |
| `danger` / `danger-foreground` | destructive actions, errors | |
| `info` | neutral notices | |
| `secondary` | quiet filled controls | |
| `background`, `surface`, `surface-elevated`, `surface-muted`, `border` | grounds and separation | |
| `foreground`, `muted-foreground` | text | |

Rules: neutral surfaces by default, colour only where it carries meaning. Never colour alone: status is icon + word + colour. Past or inactive items use `surface-muted` and `muted-foreground`.

**Legacy:** `accent` / `accent-foreground` still work and currently follow `primary`. They exist so unmigrated screens keep their meaning. New code must use `primary` or `musical`. Each screen's phase migrates its own usages, and the aliases are removed in the final audit phase.

## Icons: colour = workflow stage

Icons are Lucide. Their colour says where you are in the workflow, like coloured tabs in a binder. One source of truth: the `--stage-*` tokens (`app/globals.css`), the `StageIcon` component and the `stage` field on each nav link (`components/ui/stage-icon.tsx`, `components/layout/nav-links.ts`).

| Stage | Light | Stage (dark) | Used for |
|---|---|---|---|
| Plan | forest `#2c4a3e` | `#8fbf9f` | Dashboard, Sets, calendar |
| Arrange | brass `#8a5a12` | `#d2a85a` | Library, songs, dynamics |
| Assign | indigo `#4a4a8a` | `#a9a9e0` | Team, Roster, coverage |
| Rehearse | plum `#6b3a5b` | `#d9a0c6` | Metronome, rehearsal |
| My part | blue `#2f5476` | `#86b2c8` | My Part |
| Lead | teal `#1f6b6b` | `#7ccbc4` | Music Director, Director mode |
| Support | slate `#46525a` | `#a39d90` | Settings, Feedback, More |

Rules:
- `StageIcon` has three looks: `plain` (glyph only: navigation, inline), `tile` (glyph on its soft tint: page headers, empty states), `solid` (one call-out).
- Colour never carries meaning alone: every icon sits beside a label and is `aria-hidden`.
- Stage colours stay separate from status colours (success, warning, danger, info). A test fails if any stage colour equals a status colour.
- Never put a stage colour on a solid `primary` fill (for example the Director announce bar); keep those icons in `primary-foreground`.
- Every glyph/tint pairing is held to AA (4.5:1) in both themes by `tests/design-tokens.test.ts`.
- Applied in: sidebar and rail, phone bottom bar and More sheet, page headers (`SectionHeader icon stage`), empty states (`EmptyState stage`), role coverage, the worship calendar.

## Typography

One family: **Figtree** (self-hosted by `next/font`, variable `--font-figtree`). Chord charts keep the system monospace because alignment depends on it.

| Role | Size / weight |
|---|---|
| Display | `text-display` 56/1.05, 800 |
| H1 | `text-3xl` (30), 700 |
| H2 | `text-2xl` (24), 700 |
| H3 | `text-xl` (20), 600 |
| Body | `text-base` (16), 400 |
| Body small | `text-sm` (14) |
| Caption | `text-xs` (12) |
| Label | `label-caps` utility (12, caps, tracked, 700) |
| Button | `text-sm`/`text-base`, 600 |
| Musical data | `tnum` utility (tabular figures) so keys, tempo and bars align |

## Spacing, radius, shadow, motion

- **Spacing:** Tailwind's 4px scale, used as 4, 8, 12, 16, 24, 32, 48, 64 (`1,2,3,4,6,8,12,16`). Page padding 16 phone / 24 tablet / 32 desktop. Panel padding 16–20. Content max width about 1120px.
- **Radius:** `rounded-md` 6, `rounded-lg` 8 (controls), `rounded-xl` 12 (panels), `rounded-2xl` 14 (large sheets), `rounded-full` only for status pills and avatars.
- **Shadow:** none on content; separation comes from surface and border. `shadow-lg`/`shadow-xl` are reserved for floating layers (menus, sheets, dialogs).
- **Motion:** `--duration-fast` 120ms, `--duration-base` 200ms, `--ease-standard`. Animate only to explain (expanding sections, state changes). Reduced-motion is honoured globally.
- **Touch:** 44px minimum (`tap-target`). Visible keyboard focus everywhere (`:focus-visible` ring).

## Breakpoints

Tailwind defaults are kept so existing layouts do not shift: `sm` 640, `md` 768 (iPad portrait: icon rail), `lg` 1024 (iPad landscape / laptop: full sidebar), `xl` 1280, `2xl` 1536. Phone below 768: bottom navigation plus More.

## Overlay rules

- **Modal:** one focused decision.
- **Drawer:** contextual editing on desktop and iPad.
- **Bottom sheet:** the phone version of a drawer.
- **Inline:** quick repeated edits (dynamics, assignments).

## Components

All in `components/ui` unless noted. Do not create one-off versions of these.

| Need | Use |
|---|---|
| Action | `Button` (primary / secondary / outline / ghost / danger; `loading`), `IconButton` (needs a `label`), `TextLink` |
| Label vs state | `Badge` (a label), `Status` (state: always icon + word + colour) |
| Surfaces | `Card` (`muted` for past items), `SectionHeader`, `EmptyState`, `Skeleton`, `Avatar` |
| Choosing | `Tabs`, `SegmentedControl`, `FilterChip`, `Select`, `Checkbox`, `Switch` |
| Overlays | `Dialog` (one decision), `Sheet` (drawer on iPad/desktop, bottom sheet on phone) |
| Feedback | `SaveStatus` (inline), `Status`; avoid toasts |
| Musical | `DynamicIndicator`, `SongFlowRibbon` (`components/songs`), `LogoMark` / `Logo` (`components/brand`) |

## Screen patterns

- **Dashboard:** next service first, then Set / Who's serving / Needs attention (or Your part for a musician), then Coming up and the calendar.
- **Sets / Roster:** date first; upcoming prominent, past muted; status as icon + word.
- **Song Detail:** vision, then the flow ribbon, then the section editor; metadata edits live in a `Sheet`.
- **My Part:** when am I serving, what do I play in each song (sections in order, with dynamics), what changed.
- **Rehearsal / Director:** Now, My part, Next on one screen. Director adds Signal and Announce.
- **Team:** person, musical role ("Plays"), account status and invitation status are separate labelled parts. Account permission lives in Church access.

## States: loading, empty, error, success

Every screen has all four. They use shared pieces so they look and behave the same everywhere.

| State | What the person sees | Built with |
|---|---|---|
| **Page loading** | A skeleton shaped like the real page, announced once as "Loading" | `loading.tsx` per route, composed from `PageSkeleton`, `HeaderSkeleton`, `CardSkeleton`, `RowListSkeleton` |
| **Card / section loading** | A `Skeleton` in the shape of the content | `Skeleton`, `SkeletonLines` |
| **Action in flight** | The button shows a spinner and its "Saving…" text, and is disabled | `Button loading` |
| **Inline loading** | "Saving…" then "Saved", or a spinner with a label | `SaveStatus`, `Spinner` |
| **Empty** | What is missing, why it matters, one next action | `EmptyState` |
| **Error (a page)** | Plain words, "Try again", a way home, a short reference. The sidebar stays | `app/(app)/error.tsx` + `ErrorState`; public pages use `app/error.tsx`; the root layout uses `app/global-error.tsx` |
| **Error (an action)** | The reason, next to what failed, announced to screen readers | inline `role="alert"` text, or the error line inside `ConfirmDialog` |
| **Not found** | "We couldn't find that page" with two ways out | `app/(app)/not-found.tsx`, `app/not-found.tsx` |
| **Success** | Quiet and visible: "Saved", a status chip, or the new thing appearing. No toasts | `SaveStatus`, `Status` |
| **Confirm a destructive action** | An in-app dialog naming what will be lost | `ConfirmDialog` (never the browser's built-in popup) |

Rehearsal loading mirrors the real layout (set order, title, Now and Next) so the screen does not jump when the song arrives.

## Guard rails (enforced by tests)

`tests/route-states.test.ts` fails if a route loses its loading, error or not-found coverage, or a loading screen stops using the shared skeletons. `tests/design-guard.test.ts` also fails on native browser dialogs and on a `<Button>` nested inside a `<Link>` (use `ButtonLink`).

`tests/design-tokens.test.ts` checks light/dark parity and WCAG AA contrast for every pairing. `tests/design-guard.test.ts` fails the build if UI source uses the retired `accent` colour, raw Tailwind palette colours, hard-coded hex colours, pure white/black, or text under 12px.

## Responsive and accessibility audit (Phase 15)

Run with Playwright + axe-core against Dashboard, Sets, a Set, Songs, a Song, My Part, Rehearsal, Roster, Team and Settings, in Light and Stage, at 320, 390, 834 and 1280px, with demo data. After fixes: **0 axe violations, 0 pages with sideways overflow, 0 interactive controls under 36px.** Found and fixed along the way: overflow at 320px (My Part, Settings, a Set), 16 unlabeled selects, an unnamed icon button, a low-contrast label, skipped heading levels, mismatched accessible names, and many small controls.

Not covered by the automated pass, so worth a human check on real devices: Android system font scaling, real iPad/Pencil use, screen-reader walkthroughs, and the musician (non-leader) Rehearsal view live-following a leader on a second device.

### Consistency matrix

| | Dashboard | Roster | Sets | Team | Songs | Song Detail | My Part | Rehearsal | Director | Calendar | Settings |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Tokens (no legacy colours) | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes |
| Typography roles | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes |
| Cards (border, no shadow) | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes |
| Buttons (shared `Button`) | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes |
| Status = icon + word + colour | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | n/a |
| Navigation (shell) | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes |
| Empty states | yes | yes | yes | n/a | existing | existing | yes | n/a | n/a | n/a | n/a |
| Phone / iPad / desktop checked | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes |

"existing" means the screen still uses its original wording for that state and has not been rewritten into the EmptyState pattern.

## Flow verification

A scripted walk-through (Playwright) signs up as a brand-new team and goes through: empty dashboard, empty library, add a song, add sections and dynamics, edit song details in the drawer, cancel a delete confirmation, add a team member, create an invite link, create a set, add a song to it, assign the team, open Rehearsal and move through it, send a Director announcement, My Part, Roster, change a setting and switch theme, the phone More sheet, and log out. It runs on a phone-sized and a desktop-sized screen against a production build, watching for console errors, failed requests and accessibility violations at each step. Result: every step passes, with zero issues.

## Known follow-ups

- The import dialogs (PDF, theme data, roster) are on the new tokens but keep their original layouts inside the shared `Dialog`.
- The "Rehearse" tab in the phone bar is not added because rehearsal opens from a specific set.
