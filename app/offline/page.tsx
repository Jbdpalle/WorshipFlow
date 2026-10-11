import { WifiOff } from "lucide-react";

// The service worker's last-resort fallback — reached only when a
// navigation fails offline AND nothing is cached for that exact page (see
// public/sw.js). Rehearsal Mode, Song Chart, My Part and a Set's own page
// stay usable offline once you've opened them at least once on wifi; this
// page means specifically this one hasn't been, not that nothing works.
export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
      <WifiOff className="h-8 w-8 text-muted-foreground" />
      <h1 className="text-lg font-semibold">You&apos;re offline</h1>
      <p className="max-w-xs text-sm text-muted-foreground">
        This page hasn&apos;t been opened yet while you had a connection, so there&apos;s nothing saved on this
        device for it. Rehearsal Mode, Song Chart, My Part and a service&apos;s own page keep working offline
        once you&apos;ve visited them at least once.
      </p>
    </div>
  );
}
