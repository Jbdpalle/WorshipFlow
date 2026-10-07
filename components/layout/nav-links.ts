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

// Shown in the desktop sidebar, in order.
export const SIDEBAR_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sets", label: "Sets", icon: ListMusic },
  { href: "/songs", label: "Library", icon: Library },
  { href: "/team", label: "Team", icon: Users },
  { href: "/roster", label: "Roster", icon: ClipboardList },
  { href: "/my-part", label: "My Part", icon: UserCircle },
  { href: "/metronome", label: "Metronome", icon: Timer },
  // Placeholder — not built yet. Takes leaders to a simple "coming soon" page.
  { href: "/music-director", label: "Music Director", icon: Music4 },
];

// Shown in the mobile bottom tab bar. Kept to 5 so labels stay legible at
// phone width; everything else lives in the mobile "More" menu instead.
export const MOBILE_TAB_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sets", label: "Sets", icon: ListMusic },
  { href: "/songs", label: "Library", icon: Library },
  { href: "/team", label: "Team", icon: Users },
  { href: "/my-part", label: "My Part", icon: UserCircle },
];

export const MOBILE_MORE_LINKS: NavLink[] = [
  { href: "/roster", label: "Roster", icon: ClipboardList },
  { href: "/metronome", label: "Metronome", icon: Timer },
  // Placeholder — not built yet. Takes leaders to a simple "coming soon" page.
  { href: "/music-director", label: "Music Director", icon: Music4 },
  { href: "/feedback", label: "Feedback", icon: MessageSquarePlus },
  { href: "/settings", label: "Settings", icon: Settings },
];
