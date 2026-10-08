import { CardSkeleton, HeaderSkeleton, PageSkeleton } from "@/components/ui/page-skeletons";

export default function SettingsLoading() {
  return (
    <PageSkeleton className="mx-auto max-w-2xl space-y-6">
      <HeaderSkeleton />
      <CardSkeleton lines={2} />
      <CardSkeleton lines={1} />
      <CardSkeleton lines={1} />
    </PageSkeleton>
  );
}
