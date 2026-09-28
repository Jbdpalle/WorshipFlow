"use client";

import { useEffect, useState } from "react";
import { X, Share, SquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "worshipflow-install-prompt-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
    } catch {
      // ignore
    }

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    // These read browser-only APIs (matchMedia, UA, localStorage) that
    // aren't available during SSR, so the "dismissed"/"show" decision can
    // only be made after mount — the recommended render-time-sync pattern
    // doesn't apply since there's no prop driving this, just a one-time
    // environment check.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(false);

    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
      setShowIosHint(true);
    }

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  }

  if (dismissed || (!deferredPrompt && !showIosHint)) return null;

  return (
    <div className="fixed inset-x-3 bottom-20 z-50 flex items-center justify-between gap-2 rounded-xl border border-border bg-surface p-3 shadow-lg md:bottom-4 md:left-auto md:right-4 md:w-80">
      {deferredPrompt ? (
        <>
          <p className="text-sm">Install WorshipFlow for quick, full-screen access.</p>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              size="sm"
              onClick={async () => {
                await deferredPrompt.prompt();
                await deferredPrompt.userChoice;
                dismiss();
              }}
            >
              Install
            </Button>
            <button
              onClick={dismiss}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-muted"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="flex flex-wrap items-center gap-1 text-sm">
            Add to Home Screen: tap <Share className="h-3.5 w-3.5" /> then{" "}
            <SquarePlus className="h-3.5 w-3.5" /> &quot;Add to Home Screen.&quot;
          </p>
          <button
            onClick={dismiss}
            className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-surface-muted"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}
