"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SaveStatus } from "@/components/ui/save-status";
import { updateMyName, updateChurchName } from "@/lib/actions/profile";

export function SettingsForm({
  field,
  initialValue,
  disabled,
}: {
  field: "name" | "church";
  initialValue: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (value.trim() === initialValue.trim()) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    const action = field === "name" ? updateMyName : updateChurchName;
    const result = await action(value);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1 space-y-1">
        <Input
          aria-label={field === "name" ? "Your name" : "Church or team name"}
          aria-invalid={error ? true : undefined}
          value={value}
          disabled={disabled || saving}
          onChange={(e) => {
            setValue(e.target.value);
            setSaved(false);
          }}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
        <SaveStatus state={error ? "error" : saving ? "saving" : saved ? "saved" : "idle"} errorMessage={error ?? undefined} />
      </div>
      <Button loading={saving} type="button" variant="secondary" disabled={disabled || saving} onClick={save}>
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
