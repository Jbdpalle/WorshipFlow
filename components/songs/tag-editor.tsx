"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { IconButton } from "@/components/ui/icon-button";
import { addSongTag, removeSongTag } from "@/lib/actions/songs";

export function TagEditor({
  songId,
  tags,
}: {
  songId: string;
  tags: { id: string; label: string }[];
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="space-y-2">
      <p className="label-caps">Tags</p>
      <div className="flex flex-wrap items-center gap-2">
        {tags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-surface pl-3 text-sm font-semibold"
          >
            {tag.label}
            <button
              type="button"
              aria-label={`Remove tag ${tag.label}`}
              onClick={async () => {
                setError(null);
                const result = await removeSongTag(tag.id);
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                router.refresh();
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-danger/15 hover:text-danger"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </span>
        ))}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!value.trim()) return;
            setError(null);
            const result = await addSongTag(songId, value.trim());
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setValue("");
            router.refresh();
          }}
          className="flex items-center gap-1"
        >
          <Input
            aria-label="New tag"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Add tag"
            className="w-32"
          />
          <IconButton type="submit" label="Add tag">
            <Plus className="h-4 w-4" />
          </IconButton>
        </form>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
