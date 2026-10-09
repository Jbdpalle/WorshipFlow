import type { Stage } from "@/components/ui/stage-icon";
import {
  LayoutDashboard,
  ListMusic,
  Library,
  Users,
  ClipboardList,
  UserCircle,
  Timer,
  Megaphone,
  BookOpen,
  MessageSquarePlus,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavLink = { href: string; label: string; icon: LucideIcon; stage: Stage };

// Each link carries its workflow stage; that sets its icon colour.
// One navigation model for every device. Groups are ordered by importance:
// the core workflow first (plan → my part), then the team side, then tools.
// Desktop/iPad sidebar shows all groups; the phone bottom bar shows the
// first group's essentials plus "More", which holds everything else.
export const NAV_GROUPS: NavLink[][] = [
  [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, stage: "plan" },
    { href: "/sets", label: "Sets", icon: ListMusic, stage: "plan" },
    { href: "/songs", label: "Library", icon: Library, stage: "arrange" },
    { href: "/my-part", label: "My Part", icon: UserCircle, stage: "mypart" },
  ],
  [
    { href: "/team", label: "Team", icon: Users, stage: "assign" },
    { href: "/roster", label: "Roster", icon: ClipboardList, stage: "assign" },
  ],
  [
    { href: "/metronome", label: "Metronome", icon: Timer, stage: "rehearse" },
    // Placeholder — not built yet. Takes leaders to a simple "coming soon" page.
    { href: "/music-director", label: "Music Director", icon: Megaphone, stage: "lead" },
    // Placeholder — not built yet. Takes everyone to a "coming soon" page.
    { href: "/team-devotions", label: "Team Devotions", icon: BookOpen, stage: "support" },
    { href: "/feedback", label: "Feedback", icon: MessageSquarePlus, stage: "support" },
  ],
];

export const SETTINGS_LINK: NavLink = { href: "/settings", label: "Settings", icon: Settings, stage: "support" };

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
  byHref("/team-devotions"),
  byHref("/feedback"),
  SETTINGS_LINK,
];

export function isActive(pathname: string | null, href: string) {
  return !!pathname && (pathname === href || pathname.startsWith(href + "/"));
}
