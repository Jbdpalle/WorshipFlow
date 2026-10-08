import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

// Shown inside the app shell when a set, song or page does not exist (or
// belongs to another team).
export default function AppNotFound() {
  return (
    <EmptyState
      as="h1"
      icon={SearchX}
      title="We couldn't find that page"
      description="It may have been deleted, or the link may be out of date. Your sets and songs are safe."
      action={
        <div className="flex flex-wrap justify-center gap-2">
          <ButtonLink href="/dashboard">Go to dashboard</ButtonLink>
          <ButtonLink href="/sets" variant="outline">View sets</ButtonLink>
        </div>
      }
      className="mx-auto max-w-lg py-14"
    />
  );
}
