import { Skeleton } from "@/components/ui/skeleton";
import { PageSkeleton, PillsSkeleton } from "@/components/ui/page-skeletons";

// Rehearsal loading mirrors the real layout (set order, song title, Now and
// Next) so the screen does not jump when the song arrives.
export default function RehearsalLoading() {
  return (
    <PageSkeleton className="mx-auto w-full max-w-6xl space-y-5">
      <PillsSkeleton count={4} />
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-72 max-w-full" />
      </div>
      <div className="flex gap-1">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-10 flex-1 rounded-t-md" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-5">
        <Skeleton className="h-56 rounded-2xl lg:col-span-3" />
        <Skeleton className="h-56 rounded-2xl lg:col-span-2" />
      </div>
    </PageSkeleton>
  );
}
