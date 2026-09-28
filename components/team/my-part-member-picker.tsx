"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";

export function MyPartMemberPicker({
  members,
  activeId,
}: {
  members: { id: string; name: string; role: string }[];
  activeId?: string;
}) {
  const router = useRouter();

  return (
    <Select
      value={activeId}
      onChange={(e) => router.push(`/my-part?member=${e.target.value}`)}
      className="w-56"
    >
      {members.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name} — {m.role}
        </option>
      ))}
    </Select>
  );
}
