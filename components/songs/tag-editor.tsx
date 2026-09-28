"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((tag) => (
          <Badge key={tag.id} variant="outline" className="gap-1 pr-1">
            {tag.label}
            <button
              onClick={async () => {
                setError(null);
                const result = await removeSongTag(tag.id);
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                router.refresh();
              }}
              className="rounded-full hover:bg-danger/20"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
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
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Add tag"
            className="h-7 w-24 text-xs"
          />
          <button type="submit" className="rounded-md p-1 text-muted-foreground hover:bg-surface-muted">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
