"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import { revokeChurchAccess, type ChurchAccessRow } from "@/lib/actions/team";

// Separate from the roster above: this is everyone who can actually log
// into this church, regardless of whether they have a roster card — the
// only place "remove this person for real" exists, since removing a
// roster card alone doesn't touch their login access.
export function ChurchAccessList({ rows }: { rows: ChurchAccessRow[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  if (rows.length === 0) return null;

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-muted-foreground">Church access</h2>
      <p className="text-xs text-muted-foreground">
        Everyone who can log into this church, separate from the roster above.
      </p>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => (
          <Card key={row.membershipId}>
            <CardContent className="flex items-center justify-between gap-2 pt-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{row.name}</p>
                <p className="truncate text-xs text-muted-foreground">{row.email}</p>
                <Badge variant="outline" className="mt-1 text-[10px]">
                  {row.role}
                </Badge>
              </div>
              {row.isSelf || row.role === "OWNER" ? null : (
                <Tooltip content={`Revoke ${row.name}'s access to this church — they'll no longer be able to log in`}>
                  <button
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
                    className="shrink-0 rounded-md p-2.5 text-muted-foreground hover:bg-danger/10 hover:text-danger disabled:opacity-40"
                    aria-label={`Revoke ${row.name}'s access`}
                  >
                    <ShieldX className="h-4 w-4" />
                  </button>
                </Tooltip>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
