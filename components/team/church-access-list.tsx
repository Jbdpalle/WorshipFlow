"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/icon-button";
import { Tooltip } from "@/components/ui/tooltip";
import { revokeChurchAccess, setMembershipRole, type ChurchAccessRow } from "@/lib/actions/team";

const GRANTABLE_ROLES = ["MEMBER", "LEADER", "ADMIN"] as const;

// Separate from the roster above: this is everyone who can actually log
// into this church, regardless of whether they have a roster card — the
// only place "remove this person for real" exists, since removing a
// roster card alone doesn't touch their login access. Leaders can see this
// list; only Admin/Owner can actually revoke access or change a role.
export function ChurchAccessList({ rows, isAdmin }: { rows: ChurchAccessRow[]; isAdmin: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  if (rows.length === 0) return null;

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-bold">Church access</h2>
      <p className="text-sm text-muted-foreground">
        Account permission: who can log into this church and what they may change. This is separate from the
        musical role on the roster above.
      </p>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <Card key={row.membershipId}>
            <CardContent className="flex items-center justify-between gap-2 pt-4">
              <div className="min-w-0">
                <p className="truncate text-base font-bold">{row.name}</p>
                <p className="truncate text-sm text-muted-foreground">{row.email}</p>
                {isAdmin && row.role !== "OWNER" ? (
                  <Tooltip content={`Change ${row.name}'s role on this church`}>
                    <select
                      value={row.role}
                      disabled={pendingId === row.membershipId}
                      aria-label={`Change ${row.name}'s role`}
                      className="tap-target -ml-1 mt-1 rounded-md bg-transparent px-1 text-sm font-semibold text-foreground hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40"
                      onChange={async (e) => {
                        const newRole = e.target.value as (typeof GRANTABLE_ROLES)[number];
                        if (newRole === row.role) return;
                        setError(null);
                        setPendingId(row.membershipId);
                        const result = await setMembershipRole(row.membershipId, newRole);
                        setPendingId(null);
                        if (!result.ok) {
                          setError(result.error);
                          return;
                        }
                        router.refresh();
                      }}
                    >
                      {GRANTABLE_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </Tooltip>
                ) : (
                  <Badge variant="outline" className="mt-1">
                    {row.role}
                  </Badge>
                )}
              </div>
              {!isAdmin || row.isSelf || row.role === "OWNER" ? null : (
                <Tooltip content={`Revoke ${row.name}'s access to this church — they'll no longer be able to log in`}>
                  <IconButton
                    label={`Revoke ${row.name}'s access`}
                    tone="danger"
                    disabled={pendingId === row.membershipId}
                    onClick={async () => {
                      if (!confirm(`Revoke ${row.name}'s access to this church? They won't be able to see it anymore.`)) {
                        return;
                      }
                      setError(null);
                      setPendingId(row.membershipId);
                      const result = await revokeChurchAccess(row.membershipId);
                      setPendingId(null);
                      if (!result.ok) {
                        setError(result.error);
                        return;
                      }
                      router.refresh();
                    }}
                  >
                    <ShieldX className="h-4 w-4" />
                  </IconButton>
                </Tooltip>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
