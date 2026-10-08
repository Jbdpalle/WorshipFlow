import { Megaphone } from "lucide-react";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";

export default function MusicDirectorPage() {
  return (
    <div className="space-y-6">
      <SectionHeader level={1} icon={Megaphone} stage="lead" label="Music Director" title="Music Director" />
      <EmptyState
        icon={Megaphone} stage="lead"
        title="Coming soon"
        description="Tools for directing the band and vocals in real time during rehearsal and service. For now, use Director mode inside a set's rehearsal."
      />
    </div>
  );
}
