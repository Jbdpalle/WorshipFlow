"use client";

import { useState } from "react";
import { Tags } from "lucide-react";
import { Label } from "@/components/ui/label";
import { THEME_CATEGORIES } from "@/lib/songs/constants";
import { setSongThemeCategories } from "@/lib/actions/songs";
import { cn } from "@/lib/utils/cn";

export function ThemeCategoryPicker({
  songId,
  initialLabels,
}: {
  songId: string;
  initialLabels: string[];
}) {
  const [selected, setSelected] = useState(initialLabels);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle(label: string) {
    const next = selected.includes(label)
      ? selected.filter((l) => l !== label)
      : selected.length >= 5
        ? selected
        : [...selected, label];
    if (next === selected) return;
    setSelected(next);
    setSaving(true);
    setError(null);
    const result = await setSongThemeCategories(songId, next);
    if (!result.ok) {
      setError(result.error);
      setSelected(selected);
    }
    setSaving(false);
  }

  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1 text-xs text-muted-foreground">
        <Tags className="h-3.5 w-3.5" /> Theme categories (2-5 recommended)
      </Label>
      <div className="flex flex-wrap gap-1.5">
        {THEME_CATEGORIES.map((category) => {
          const active = selected.includes(category.label);
          return (
            <button
              key={category.key}
              type="button"
              title={category.description}
              onClick={() => toggle(category.label)}
              disabled={saving}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                active
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border bg-surface text-muted-foreground hover:bg-surface-muted",
              )}
            >
              {category.label}
            </button>
          );
        })}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
