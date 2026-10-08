"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { SaveStatus, type SaveState } from "@/components/ui/save-status";
import { ROLES } from "@/lib/songs/constants";
import { assignMemberToSet, removeSetMember } from "@/lib/actions/sets";

type SetMemberRow = { id: string; role: string; teamMember: { id: string; name: string } };
type TeamMemberOption = { id: string; name: string; role: string };

// "Who's serving, and what are they doing" by default — a plain list, no
// persistent edit controls. A leader opens one row at a time to change it;
// everyone else just reads the list. Mirrors the inline-edit pattern
// MemberNameEditor already uses on the Team page (click to open, save,
// collapse back), applied to a whole row instead of just a name.
function MemberRow({
  setId,
  member,
  isLeader,
  isOpen,
  onOpen,
  onClose,
}: {
  setId: string;
  member: SetMemberRow;
  isLeader: boolean;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);

  if (!isLeader) {
    return (
      <div className="flex items-center justify-between gap-3 py-2.5">
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">{member.teamMember.name}</p>
          <p className="truncate text-sm text-muted-foreground">{member.role}</p>
        </div>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="tap-target flex w-full items-center justify-between gap-3 rounded-lg py-2.5 text-left hover:bg-surface-muted"
        aria-label={`Change ${member.teamMember.name}'s assignment — currently ${member.role}`}
      >
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">{member.teamMember.name}</p>
          <p className="truncate text-sm text-muted-foreground">{member.role}</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" aria-hidden />
      </button>
    );
  }

  // A role is part of this assignment's identity, not just a label — move
  // it by creating the new one first, then dropping the old, so a failed
  // create never loses the existing assignment.
  async function changeRole(newRole: string) {
    if (newRole === member.role) {
      onClose();
      return;
    }
    setSaveState("saving");
    setError(null);
    const created = await assignMemberToSet(setId, member.teamMember.id, newRole);
    if (!created.ok) {
      setSaveState("error");
      setError(created.error);
      return;
    }
    const removed = await removeSetMember(member.id);
    if (!removed.ok) {
      setSaveState("error");
      setError(removed.error);
      return;
    }
    setSaveState("saved");
    router.refresh();
    setTimeout(onClose, 700);
  }

  async function remove() {
    setSaveState("saving");
    setError(null);
    const result = await removeSetMember(member.id);
    if (!result.ok) {
      setSaveState("error");
      setError(result.error);
      return;
    }
    router.refresh();
    onClose();
  }

  return (
    <div className="space-y-2.5 rounded-lg bg-surface-muted p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-foreground">{member.teamMember.name}</p>
        <button
          type="button"
          onClick={onClose}
          className="tap-target text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          Done
        </button>
      </div>
      <div className="space-y-1.5">
        <label className="label-caps" htmlFor={`role-${member.id}`}>
          Musical assignment
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            id={`role-${member.id}`}
            autoFocus
            defaultValue={member.role}
            disabled={saveState === "saving"}
            aria-label={`Musical assignment for ${member.teamMember.name}`}
            className="h-11 w-full max-w-[220px]"
            onChange={(e) => changeRole(e.target.value)}
          >
            {!ROLES.includes(member.role as (typeof ROLES)[number]) && (
              <option value={member.role}>{member.role}</option>
            )}
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
          <SaveStatus state={saveState} errorMessage={error ?? undefined} />
        </div>
      </div>
      <button
        type="button"
        onClick={remove}
        disabled={saveState === "saving"}
        className="tap-target text-xs font-semibold text-danger hover:underline disabled:opacity-50"
      >
        Remove from this set
      </button>
    </div>
  );
}

export function SetTeam({
  setId,
  members,
  teamMembers,
  isLeader,
}: {
  setId: string;
  members: SetMemberRow[];
  teamMembers: TeamMemberOption[];
  isLeader: boolean;
}) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [assignRole, setAssignRole] = useState("");
  const [assignMember, setAssignMember] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  return (
    <div className="space-y-1">
      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No one assigned to this service yet
          {isLeader && " — add the team below and every song in this set will show who's playing."}
        </p>
      ) : (
        <div className="divide-y divide-border">
          {members.map((m) => (
            <MemberRow
              key={m.id}
              setId={setId}
              member={m}
              isLeader={isLeader}
              isOpen={openId === m.id}
              onOpen={() => setOpenId(m.id)}
              onClose={() => setOpenId(null)}
            />
          ))}
        </div>
      )}

      {isLeader && teamMembers.length > 0 && (
        <div className={members.length > 0 ? "pt-2" : undefined}>
          {adding ? (
            <div className="space-y-2 rounded-lg bg-surface-muted p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={assignRole}
                  onChange={(e) => setAssignRole(e.target.value)}
                  aria-label="Role to assign"
                  className="h-11 flex-1 min-w-[140px]"
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
                  aria-label="Person to assign"
                  className="h-11 flex-1 min-w-[140px]"
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
              </div>
              {addError && (
                <p role="alert" className="text-sm text-danger">
                  {addError}
                </p>
              )}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  loading={assigning}
                  disabled={!assignRole || !assignMember || assigning}
                  onClick={async () => {
                    if (!assignRole || !assignMember) return;
                    setAssigning(true);
                    setAddError(null);
                    const result = await assignMemberToSet(setId, assignMember, assignRole);
                    setAssigning(false);
                    if (!result.ok) {
                      setAddError(result.error);
                      return;
                    }
                    setAssignRole("");
                    setAssignMember("");
                    setAdding(false);
                    router.refresh();
                  }}
                >
                  Assign
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setAdding(false);
                    setAssignRole("");
                    setAssignMember("");
                    setAddError(null);
                  }}
                  className="tap-target text-sm font-semibold text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="tap-target flex items-center gap-1.5 text-sm font-semibold text-primary"
            >
              <Plus className="h-4 w-4" aria-hidden /> Add member
            </button>
          )}
        </div>
      )}
    </div>
  );
}
