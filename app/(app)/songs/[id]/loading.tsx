import { Skeleton } from "@/components/ui/skeleton";
import { CardSkeleton, HeaderSkeleton, PageSkeleton } from "@/components/ui/page-skeletons";

export default function SongDetailLoading() {
  return (
    <PageSkeleton>
      <HeaderSkeleton action />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
      <div className="flex gap-2 border-b border-border pb-0">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="mb-2 h-6 w-28" />
        ))}
      </div>
      <CardSkeleton lines={2} />
      <div className="flex gap-1">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-10 flex-1 rounded-t-md" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
        <CardSkeleton lines={6} />
      </div>
    </PageSkeleton>
  );
}
