import { CardGridSkeleton, HeaderSkeleton, PageSkeleton } from "@/components/ui/page-skeletons";

export default function TeamLoading() {
  return (
    <PageSkeleton>
      <HeaderSkeleton />
      <CardGridSkeleton count={6} lines={3} className="xl:grid-cols-3" />
    </PageSkeleton>
  );
}
