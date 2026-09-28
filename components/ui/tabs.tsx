"use client";

import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils/cn";

export function Tabs({
  tabs,
  defaultTab,
}: {
  tabs: { key: string; label: string; content: ReactNode }[];
  defaultTab?: string;
}) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.key);
  const activeTab = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <div>
      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={cn(
              "whitespace-nowrap px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              active === tab.key
                ? "border-accent text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="pt-4">{activeTab?.content}</div>
    </div>
  );
}
