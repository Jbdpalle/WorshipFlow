import { Skeleton } from "@/components/ui/skeleton";
import { CardGridSkeleton, CardSkeleton, HeaderSkeleton, PageSkeleton } from "@/components/ui/page-skeletons";

export default function DashboardLoading() {
  return (
    <PageSkeleton className="space-y-8">
      <HeaderSkeleton description={false} />
      <div className="space-y-4 rounded-xl border border-border bg-surface p-6 sm:p-8">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-10 w-72 max-w-full" />
        <Skeleton className="h-4 w-56" />
        <div className="flex gap-4 pt-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-9 w-9 shrink-0 rounded-full" />
          ))}
        </div>
      </div>
      <CardGridSkeleton count={3} lines={4} className="lg:grid-cols-3" />
      <div className="grid gap-4 lg:grid-cols-5">
        <CardSkeleton className="lg:col-span-2" lines={2} />
        <CardSkeleton className="lg:col-span-3" lines={6} />
      </div>
    </PageSkeleton>
  );
}
