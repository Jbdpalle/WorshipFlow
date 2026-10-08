import {
  LayoutDashboard,
  ListMusic,
  Library,
  Users,
  ClipboardList,
  UserCircle,
  Timer,
  Music4,
  MessageSquarePlus,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavLink = { href: string; label: string; icon: LucideIcon };

// One navigation model for every device. Groups are ordered by importance:
// the core workflow first (plan → my part), then the team side, then tools.
// Desktop/iPad sidebar shows all groups; the phone bottom bar shows the
// first group's essentials plus "More", which holds everything else.
export const NAV_GROUPS: NavLink[][] = [
  [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/sets", label: "Sets", icon: ListMusic },
    { href: "/songs", label: "Library", icon: Library },
    { href: "/my-part", label: "My Part", icon: UserCircle },
  ],
  [
    { href: "/team", label: "Team", icon: Users },
    { href: "/roster", label: "Roster", icon: ClipboardList },
  ],
  [
    { href: "/metronome", label: "Metronome", icon: Timer },
    // Placeholder — not built yet. Takes leaders to a simple "coming soon" page.
    { href: "/music-director", label: "Music Director", icon: Music4 },
    { href: "/feedback", label: "Feedback", icon: MessageSquarePlus },
  ],
];

export const SETTINGS_LINK: NavLink = { href: "/settings", label: "Settings", icon: Settings };

const byHref = (href: string) => NAV_GROUPS.flat().find((l) => l.href === href)!;

// Phone bottom bar: four destinations + a "More" button (rendered by
// BottomNav). My Part sits second because it is a core musician screen.
export const MOBILE_TAB_LINKS: NavLink[] = [
  byHref("/dashboard"),
  byHref("/my-part"),
  byHref("/sets"),
  byHref("/songs"),
];

// Everything not in the bar lives in the More sheet.
export const MOBILE_MORE_LINKS: NavLink[] = [
  byHref("/team"),
  byHref("/roster"),
  byHref("/metronome"),
  byHref("/music-director"),
  byHref("/feedback"),
  SETTINGS_LINK,
];

export function isActive(pathname: string | null, href: string) {
  return !!pathname && (pathname === href || pathname.startsWith(href + "/"));
}
