import { Metronome } from "@/components/metronome/metronome";
import { Timer } from "lucide-react";
import { SectionHeader } from "@/components/ui/section-header";
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
      <SectionHeader level={1} icon={Timer} stage="rehearse" label="Tools" title="Metronome" description="Set a tempo, or tap it in." />
      <Card>
        <CardContent className="py-8">
          <Metronome initialBpm={Number.isFinite(initialBpm) ? initialBpm : 80} />
        </CardContent>
      </Card>
    </div>
  );
}
