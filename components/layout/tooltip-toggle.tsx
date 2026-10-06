"use client";

import { useTooltipsEnabled, setTooltipsEnabled } from "@/lib/tooltips/use-tooltips-enabled";
import { Switch } from "@/components/ui/switch";

export function TooltipToggle() {
  const enabled = useTooltipsEnabled();

  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-foreground">Hover tips</p>
        <p className="text-xs text-muted-foreground">
          Show a brief explanation when you hover or tab onto a button or icon.
        </p>
      </div>
      <Switch checked={enabled} onChange={setTooltipsEnabled} label="Hover tips" />
    </div>
  );
}
