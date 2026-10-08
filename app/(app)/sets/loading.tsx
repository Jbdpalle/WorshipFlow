import { Skeleton } from "@/components/ui/skeleton";
import { HeaderSkeleton, PageSkeleton, PillsSkeleton } from "@/components/ui/page-skeletons";

function SetCardSkeleton() {
  return (
    <div className="flex gap-4 rounded-xl border border-border bg-surface p-4">
      <Skeleton className="h-24 w-16 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export default function SetsLoading() {
  return (
    <PageSkeleton>
      <HeaderSkeleton action description={false} />
      <PillsSkeleton count={3} />
      <Skeleton className="h-12 w-72 max-w-full rounded-lg" />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <SetCardSkeleton key={i} />
        ))}
      </div>
    </PageSkeleton>
  );
}
