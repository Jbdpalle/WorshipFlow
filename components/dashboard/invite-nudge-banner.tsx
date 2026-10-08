import { UserPlus } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

// Shown to leaders at the top of the Dashboard — the invite flow already
// gives roster members their own login at the right role, but it sits
// unused behind the Team page unless something actually points at it.
export function InviteNudgeBanner({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-info/30 bg-info/10 p-4">
      <div className="flex items-center gap-3">
        <UserPlus className="h-5 w-5 shrink-0 text-info" aria-hidden />
        <p className="text-sm text-foreground">
          <span className="font-semibold">
            {count} team member{count === 1 ? "" : "s"}
          </span>{" "}
          {count === 1 ? "doesn't" : "don't"} have their own login yet. Invite them so they can
          check My Part and Rehearsal Mode on their own phone.
        </p>
      </div>
      <ButtonLink href="/team" variant="outline" className="shrink-0">
          Invite team
        </ButtonLink>
    </section>
  );
}
