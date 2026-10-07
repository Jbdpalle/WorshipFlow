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
  // never mistaken for the leader's own assignment. The role shown in the
  // list is each person's roster default (set on their Team card), not
  // necessarily what they're playing in any particular service — the page
  // below always resolves their actual, current assignment.
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
            {m.name} (usually {m.role})
          </option>
        ))}
      </Select>
    </div>
  );
}
