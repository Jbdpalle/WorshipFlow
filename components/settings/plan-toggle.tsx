"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { setTeamPlan } from "@/lib/actions/plan";

// Honest about what this is: there's no payment flow behind it. It's a
// manual switch a church owner/admin can flip on their own team, meant for
// a trial/test phase where the Free plan's 3-set / 6-member ceiling gets
// in the way before there's anything to actually charge for.
export function PlanToggle({ plan, canChange }: { plan: "FREE" | "PRO"; canChange: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function change(next: "FREE" | "PRO") {
    setBusy(true);
    setError(null);
    const result = await setTeamPlan(next);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge variant={plan === "PRO" ? "accent" : "outline"}>{plan}</Badge>
        <p className="text-sm text-muted-foreground">
          {plan === "PRO"
            ? "No set or team-member limits on this team."
            : "Free plan: 3 active sets, 6 team members."}
        </p>
      </div>
      {canChange ? (
        <Button
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => change(plan === "PRO" ? "FREE" : "PRO")}
        >
          {busy ? "Saving…" : plan === "PRO" ? "Switch back to Free" : "Remove limits (manual PRO)"}
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">Only a church owner or admin can change this.</p>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
