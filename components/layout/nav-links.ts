import {
  LayoutDashboard,
  ListMusic,
  Library,
  Users,
  UserCircle,
  Timer,
  MessageSquarePlus,
  type LucideIcon,
} from "lucide-react";

export type NavLink = { href: string; label: string; icon: LucideIcon };

// Shown in the desktop sidebar, in order.
export const SIDEBAR_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sets", label: "Sets", icon: ListMusic },
  { href: "/songs", label: "Library", icon: Library },
  { href: "/team", label: "Team", icon: Users },
  { href: "/my-part", label: "My Part", icon: UserCircle },
  { href: "/metronome", label: "Metronome", icon: Timer },
];

// Shown in the mobile bottom tab bar. Kept to 5 so labels stay legible at
// phone width; Metronome and Feedback live in the mobile "More" menu instead.
export const MOBILE_TAB_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sets", label: "Sets", icon: ListMusic },
  { href: "/songs", label: "Library", icon: Library },
  { href: "/team", label: "Team", icon: Users },
  { href: "/my-part", label: "My Part", icon: UserCircle },
];

export const MOBILE_MORE_LINKS: NavLink[] = [
  { href: "/metronome", label: "Metronome", icon: Timer },
  { href: "/feedback", label: "Feedback", icon: MessageSquarePlus },
];
