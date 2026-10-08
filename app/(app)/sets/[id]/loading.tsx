import { Skeleton } from "@/components/ui/skeleton";
import { CardSkeleton, HeaderSkeleton, PageSkeleton } from "@/components/ui/page-skeletons";

export default function SetDetailLoading() {
  return (
    <PageSkeleton>
      <HeaderSkeleton action />
      <CardSkeleton lines={2} />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-20 w-36 shrink-0 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:col-span-2">
          <CardSkeleton lines={3} />
          <CardSkeleton lines={5} />
        </div>
        <div className="min-w-0 space-y-4">
          <CardSkeleton lines={4} />
          <CardSkeleton lines={2} />
        </div>
      </div>
    </PageSkeleton>
  );
}
