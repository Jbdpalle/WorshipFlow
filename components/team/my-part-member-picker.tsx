"use client";

import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

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
        value={activeId}
        onChange={(e) => router.push(`/my-part?member=${e.target.value}`)}
        className="w-56"
        aria-label={isOwnView ? "Viewing your own part" : "Preview another musician's part"}
      >
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
