import Link from "next/link";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

// Shown to leaders at the top of the Dashboard — the invite flow already
// gives roster members their own login at the right role, but it sits
// unused behind the Team page unless something actually points at it.
export function InviteNudgeBanner({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent/10 p-4">
      <div className="flex items-center gap-3">
        <UserPlus className="h-5 w-5 shrink-0 text-accent" aria-hidden />
        <p className="text-sm text-foreground">
          <span className="font-semibold">
            {count} team member{count === 1 ? "" : "s"}
          </span>{" "}
          {count === 1 ? "doesn't" : "don't"} have their own login yet — invite them so they can
          check My Part and Rehearsal Mode on their own phone.
        </p>
      </div>
      <Link href="/team">
        <Button size="sm" variant="secondary" className="shrink-0">
          Invite Team
        </Button>
      </Link>
    </section>
  );
}
