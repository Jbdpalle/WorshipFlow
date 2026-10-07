"use client";

import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { groupMembersByName } from "@/lib/songs/member-name";

export function MyPartMemberPicker({
  members,
  activeId,
  isOwnView,
}: {
  members: { id: string; name: string; role: string }[];
  activeId?: string;
  isOwnView: boolean;
}) {
  const router = useRouter();
  // Two TeamMember rows can share one real person's name (see
  // lib/songs/member-name.ts) — list each name once, routing to whichever
  // id in the group the page resolves to (app/(app)/my-part/page.tsx
  // merges every id sharing that name, so it doesn't matter which one is
  // picked here).
  const groups = groupMembersByName(members);

  // A worship leader can look at any musician's part to check what they'll
  // see — clearly label that as a preview, never as "my part", so it's
  // never mistaken for the leader's own assignment. Just the name here —
  // the page below always resolves each person's actual, current
  // assignment, so showing a roster-default role next to their name in
  // this list would only suggest it's live when it isn't.
  return (
    <div className="flex items-center gap-2">
      {!isOwnView && (
        <Badge variant="accent" className="gap-1">
          <Eye className="h-3 w-3" /> Preview as
        </Badge>
      )}
      <Select
        value={groups.find((g) => g.ids.includes(activeId ?? ""))?.ids[0] ?? activeId}
        onChange={(e) => router.push(`/my-part?member=${e.target.value}`)}
        className="w-56"
        aria-label={isOwnView ? "Viewing your own part" : "Preview another musician's part"}
      >
        {groups.map((g) => (
          <option key={g.ids[0]} value={g.ids[0]}>
            {g.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
