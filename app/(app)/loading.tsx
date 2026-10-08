import { CardGridSkeleton, HeaderSkeleton, PageSkeleton } from "@/components/ui/page-skeletons";

// Fallback for any signed-in route that does not define its own loading
// screen, so no page ever shows a blank frame while its data loads.
export default function AppLoading() {
  return (
    <PageSkeleton>
      <HeaderSkeleton />
      <CardGridSkeleton count={4} />
    </PageSkeleton>
  );
}
