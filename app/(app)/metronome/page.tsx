import { Metronome } from "@/components/metronome/metronome";
import { Card, CardContent } from "@/components/ui/card";

export default async function MetronomePage({
  searchParams,
}: {
  searchParams: Promise<{ bpm?: string }>;
}) {
  const { bpm } = await searchParams;
  const initialBpm = bpm ? Number(bpm) : 80;

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-2xl font-semibold">Metronome</h1>
      <Card>
        <CardContent className="py-8">
          <Metronome initialBpm={Number.isFinite(initialBpm) ? initialBpm : 80} />
        </CardContent>
      </Card>
    </div>
  );
}
