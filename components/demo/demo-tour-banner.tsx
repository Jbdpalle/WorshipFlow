"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Compass, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startTour, skipTour, exitTour, restartTour, getTourState } from "@/lib/actions/demo-tour";
import { TOUR_STEPS, TOUR_TOTAL_STEPS } from "@/lib/demo-tour/steps";

const POLL_MS = 2500;

export function DemoTourBanner({
  isDemo,
  tourStatus: initialTourStatus,
  tourStep: initialTourStep,
}: {
  isDemo: boolean;
  tourStatus: string | null;
  tourStep: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const [tourStatus, setTourStatus] = useState(initialTourStatus);
  const [tourStep, setTourStep] = useState(initialTourStep);
  // Dismissing the "not started yet" prompt for this page view only — it
  // comes back on the next page until the user picks Start or Skip, since
  // closing the X here isn't the same as choosing Skip Tour.
  const [promptDismissed, setPromptDismissed] = useState(false);

  // useState's initial value only applies on mount — on a soft navigation
  // the Shell (and this component) persists while the server passes fresh
  // props, so without this the local state would keep showing whatever it
  // had at first mount instead of picking those up.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing local state to fresh server props on navigation, not a derived-from-render value
    setTourStatus(initialTourStatus);
    setTourStep(initialTourStep);
  }, [initialTourStatus, initialTourStep]);

  // A step that advances purely from visiting a page (Library, the song,
  // My Part) races its own layout: requireUser() there reads tourStep
  // before that page's own body runs advanceTourIfNeeded, so the props
  // this component mounts with can be one step stale. An immediate poll
  // right after syncing from props corrects that within a beat instead of
  // waiting for the first interval tick. Actions that advance a step but
  // deliberately skip router.refresh() (a role-note textarea's onBlur, a
  // dynamics <select>'s onChange, so they don't disrupt whatever else is
  // mid-edit) rely on the interval the rest of the time — same polling
  // pattern already used for live rehearsal position elsewhere in this app.
  useEffect(() => {
    if (!isDemo || initialTourStatus !== "active") return;
    let cancelled = false;
    async function poll() {
      const result = await getTourState();
      if (!cancelled && result.ok) {
        setTourStatus(result.data.tourStatus);
        setTourStep(result.data.tourStep);
      }
    }
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // pathname is included only to force an immediate poll on every
    // navigation, not just when tourStatus itself flips to "active" — see
    // comment above.
  }, [isDemo, initialTourStatus, pathname]);

  if (!isDemo) return null;

  async function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true);
    await action();
    setBusy(false);
    router.refresh();
  }

  // Never started — offer the choice once per page until they decide.
  if (!tourStatus && !promptDismissed) {
    return (
      <div className="flex flex-wrap items-center gap-3 border-b border-border bg-info/10 px-4 py-2.5 text-sm">
        <Compass className="h-4 w-4 shrink-0 text-info" />
        <span className="font-medium">Take the guided tour?</span>
        <span className="text-muted-foreground">
          We&apos;ll walk you through building a set, directing rehearsal, and more — hands-on.
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" disabled={busy} onClick={() => run(startTour)}>
            Start Demo
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => run(skipTour)}>
            Skip Tour
          </Button>
          <button
            type="button"
            onClick={() => setPromptDismissed(true)}
            className="rounded-md p-1 text-muted-foreground hover:bg-surface-muted"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  if (tourStatus === "active") {
    const current = TOUR_STEPS.find((s) => s.step === tourStep) ?? TOUR_STEPS[0];
    return (
      <div className="flex flex-wrap items-center gap-3 border-b border-border bg-info/10 px-4 py-2.5 text-sm">
        <Compass className="h-4 w-4 shrink-0 text-info" />
        <span className="font-medium">
          Step {current.step} of {TOUR_TOTAL_STEPS}: {current.title}
        </span>
        <span className="text-muted-foreground">{current.body}</span>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => run(exitTour)}>
            Exit Tour
          </Button>
        </div>
      </div>
    );
  }

  // "completed" or "skipped" — no persistent banner (that would just be
  // nagging); restarting from here is available in Settings instead.
  return null;
}

export function RestartTourButton({ tourStatus }: { tourStatus: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  if (!tourStatus) return null;

  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await restartTour();
        setBusy(false);
        router.push("/dashboard");
        router.refresh();
      }}
    >
      Restart guided tour
    </Button>
  );
}
