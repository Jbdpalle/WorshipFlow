"use client";

import { ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function MediaLinkField({
  id,
  label,
  icon,
  value,
  onChange,
  onBlur,
  placeholder,
  disabled,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const canOpen = /^https?:\/\//i.test(value.trim());
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="flex items-center gap-1 text-xs text-muted-foreground">
        {icon} {label}
      </Label>
      <div className="flex items-center gap-1.5">
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
        />
        {canOpen && (
          <a
            href={value.trim()}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
            aria-label={`Open ${label}`}
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  );
}
