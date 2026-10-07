"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TeamPlan } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import type { AdminTeamRow } from "@/lib/actions/plan";
import { setTeamPlan } from "@/lib/actions/plan";

const PLAN_OPTIONS: TeamPlan[] = ["FREE", "INDIVIDUAL", "GROUP", "PRO"];

function PlanRow({ team }: { team: AdminTeamRow }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-4">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">
            {team.churchName} <span className="text-muted-foreground">/ {team.name}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Owner: {team.ownerEmail} · {team.memberCount} member{team.memberCount === 1 ? "" : "s"} ·{" "}
            {team.activeSetCount} active set{team.activeSetCount === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={team.plan === "FREE" ? "outline" : "accent"}>{team.plan}</Badge>
          <Select
            value={team.plan}
            disabled={saving}
            className="h-8 w-32 text-xs"
            onChange={async (e) => {
              setSaving(true);
              setError(null);
              const result = await setTeamPlan(team.id, e.target.value as TeamPlan);
              setSaving(false);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              router.refresh();
            }}
          >
            {PLAN_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </div>
        {error && <p className="w-full text-xs text-danger">{error}</p>}
      </CardContent>
    </Card>
  );
}

export function AdminTeamPlanTable({ teams }: { teams: AdminTeamRow[] }) {
  if (teams.length === 0) {
    return <p className="text-sm text-muted-foreground">No teams yet.</p>;
  }
  return (
    <div className="space-y-2">
      {teams.map((team) => (
        <PlanRow key={team.id} team={team} />
      ))}
    </div>
  );
}
