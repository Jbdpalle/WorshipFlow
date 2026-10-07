import { Mic, Guitar, Keyboard, Drum, type LucideIcon } from "lucide-react";
import type { RoleCategoryKey } from "@/lib/songs/constants";

export const ROLE_CATEGORY_ICONS: Record<RoleCategoryKey, LucideIcon> = {
  vocals: Mic,
  guitar: Guitar,
  keys: Keyboard,
  drums: Drum,
};
