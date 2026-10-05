"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ROLES } from "@/lib/songs/constants";
import { assignMemberToSet, removeSetMember } from "@/lib/actions/sets";

type SetMemberRow = { id: string; role: string; teamMember: { id: string; name: string } };
type TeamMemberOption = { id: string; name: string; role: string };

export function SetTeam({
  setId,
  members,
  teamMembers,
}: {
  setId: string;
  members: SetMemberRow[];
  teamMembers: TeamMemberOption[];
}) {
  const [assignRole, setAssignRole] = useState<string>("");
  const [assignMember, setAssignMember] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="space-y-3">
      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No one assigned to this service yet — assign the team once below and every song in this
          set will show who&apos;s playing.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {members.map((m) => (
            <Badge key={m.id} variant="outline" className="gap-1 pr-1">
              {m.teamMember.name} — {m.role}
              <button
                onClick={async () => {
                  const result = await removeSetMember(m.id);
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  router.refresh();
                }}
                className="ml-1 rounded-full hover:bg-danger/20"
                aria-label={`Remove ${m.teamMember.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {teamMembers.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Select
            value={assignRole}
            onChange={(e) => setAssignRole(e.target.value)}
            className="h-8 w-40 text-xs"
          >
            <option value="" disabled>
              Select a role
            </option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
          <Select
            value={assignMember}
            onChange={(e) => setAssignMember(e.target.value)}
            className="h-8 w-36 text-xs"
          >
            <option value="" disabled>
              Select a person
            </option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={!assignRole || !assignMember}
            onClick={async () => {
              if (!assignRole || !assignMember) return;
              setError(null);
              const result = await assignMemberToSet(setId, assignMember, assignRole);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setAssignRole("");
              setAssignMember("");
              router.refresh();
            }}
          >
            Assign
          </Button>
        </div>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
