"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

// Real offline detection (navigator.onLine + the online/offline events),
// not inferred from the PWA manifest. WorshipFlow doesn't work offline for
// real data — see public/sw.js's own comment — so this tells people that
// plainly, in the moment it happens, instead of letting a save silently
// fail mid-rehearsal with no explanation.
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    // navigator.onLine is only readable client-side — this mirrors the
    // existing useMounted() pattern in this codebase for exactly this case.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOffline(!navigator.onLine);
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-danger/15 px-4 py-2 text-center text-sm font-medium text-danger">
      <WifiOff className="h-4 w-4 shrink-0" />
      You&apos;re offline — changes won&apos;t save until you&apos;re back online.
    </div>
  );
}
