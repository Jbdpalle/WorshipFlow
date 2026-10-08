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

## Migration plan

Phase 2 (this change) only retargets tokens, adds the font and fixes the danger-button text colour. Components and screens are migrated in later phases: shell and navigation, core components, Dashboard, Sets, Song Detail, My Part, Rehearsal, Director Mode, Roster, Team, Calendar, Settings, then a responsive and accessibility audit. Visual changes ship separately from business-logic changes.
