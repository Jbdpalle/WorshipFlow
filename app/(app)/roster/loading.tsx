import { Skeleton } from "@/components/ui/skeleton";
import { CardGridSkeleton, HeaderSkeleton, PageSkeleton } from "@/components/ui/page-skeletons";

export default function RosterLoading() {
  return (
    <PageSkeleton>
      <HeaderSkeleton action />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-11 w-36 rounded-lg" />
        <Skeleton className="h-12 w-72 max-w-full rounded-lg" />
      </div>
      <CardGridSkeleton count={3} lines={4} className="xl:grid-cols-3" />
    </PageSkeleton>
  );
}
