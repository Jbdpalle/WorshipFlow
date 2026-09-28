import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
      <WifiOff className="h-8 w-8 text-muted-foreground" />
      <h1 className="text-lg font-semibold">You&apos;re offline</h1>
      <p className="max-w-xs text-sm text-muted-foreground">
        WorshipFlow needs a connection to load your songs and sets. Reconnect and try again.
      </p>
    </div>
  );
}
