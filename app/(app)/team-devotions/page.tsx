import { BookOpen } from "lucide-react";
import { SectionHeader } from "@/components/ui/section-header";
import { Card, CardContent } from "@/components/ui/card";
import { Status } from "@/components/ui/status";
import { StageIcon } from "@/components/ui/stage-icon";

export default function TeamDevotionsPage() {
  return (
    <div className="space-y-6">
      <SectionHeader level={1} icon={BookOpen} stage="support" label="Grow together" title="Team Devotions" />
      <Card>
        <CardContent className="flex flex-col items-center gap-4 px-6 py-12 text-center">
          <StageIcon icon={BookOpen} stage="support" size="lg" />
          <Status tone="muted">Coming Soon</Status>
          <p className="max-w-md text-lg font-semibold text-foreground">
            We&apos;re preparing a space for your worship team to grow together in God&apos;s Word — not just in
            music.
          </p>
          <p className="max-w-md text-sm text-muted-foreground">
            Coming soon: weekly devotionals, Scripture, and meaningful reflections to help your team grow
            spiritually as you serve together.
          </p>
          <p className="max-w-md text-sm italic text-muted-foreground">
            Because worship begins long before we step onto the platform.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
