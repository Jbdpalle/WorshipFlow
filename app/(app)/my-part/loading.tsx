import { CardSkeleton, HeaderSkeleton, PageSkeleton } from "@/components/ui/page-skeletons";

export default function MyPartLoading() {
  return (
    <PageSkeleton className="space-y-8">
      <HeaderSkeleton action />
      <CardSkeleton lines={2} />
      <div className="space-y-4">
        <CardSkeleton lines={5} />
        <CardSkeleton lines={4} />
      </div>
    </PageSkeleton>
  );
}
