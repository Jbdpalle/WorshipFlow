import { Skeleton } from "@/components/ui/skeleton";
import { HeaderSkeleton, PageSkeleton, RowListSkeleton } from "@/components/ui/page-skeletons";

export default function SongsLoading() {
  return (
    <PageSkeleton>
      <HeaderSkeleton action />
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-11 w-full max-w-sm rounded-lg" />
        <Skeleton className="h-11 w-32 rounded-lg" />
      </div>
      <RowListSkeleton rows={8} />
    </PageSkeleton>
  );
}
