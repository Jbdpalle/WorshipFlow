"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Merge } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { IconButton } from "@/components/ui/icon-button";
import { Tooltip } from "@/components/ui/tooltip";
import { mergeTeamMembers } from "@/lib/actions/team";

type MemberOption = { id: string; name: string };

// For a confirmed duplicate roster card ("kk" and "Karthik" are the same
// person) — moves every assignment, direction, and note from the
// duplicate onto whoever you keep, then removes the now-empty card.
// Never touches login access; see mergeTeamMembers for why.
export function MergeMemberDialog({
  member,
  otherMembers,
}: {
  member: MemberOption;
  otherMembers: MemberOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [keepId, setKeepId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (otherMembers.length === 0) return null;

  return (
    <>
      <Tooltip content={`Merge ${member.name} into another roster card — for a duplicate person, not a real removal`}>
        <IconButton
          label={`Merge ${member.name} into another team member`}
          onClick={() => {
            setKeepId("");
            setError(null);
            setOpen(true);
          }}
        >
          <Merge className="h-4 w-4" />
        </IconButton>
      </Tooltip>

      <Dialog open={open} onClose={() => setOpen(false)} title={`Merge ${member.name}`}>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Use this when <strong>{member.name}</strong> is a duplicate of someone else already on the
            roster — not for removing someone who actually left the team. Every assignment, direction, and
            note currently on {member.name}&apos;s card moves onto whoever you pick below, and{" "}
            {member.name}&apos;s card is then removed. This can&apos;t be undone.
          </p>
          <Select
            value={keepId}
            onChange={(e) => setKeepId(e.target.value)}
            aria-label="Merge into"
          >
            <option value="" disabled>
              Select who to keep…
            </option>
            {otherMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              loading={saving}
              disabled={saving || !keepId}
              onClick={async () => {
                if (!keepId) return;
                setSaving(true);
                setError(null);
                const result = await mergeTeamMembers(keepId, member.id);
                setSaving(false);
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                setOpen(false);
                router.refresh();
              }}
            >
              {saving ? "Merging…" : `Merge into ${otherMembers.find((m) => m.id === keepId)?.name ?? "…"}`}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
