import { cn } from "@/lib/utils/cn";

// The Baton W: one continuous stroke forming a W, like a conductor's baton
// tracing a beat, ending in the downbeat dot. The stroke follows the text
// colour (forest on Warm, brass on Stage); the dot uses the musical accent.
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden className={cn("h-8 w-8", className)}>
      <path
        d="M9 18 L21 47 L32 25 L43 47 L55 18"
        stroke="currentColor"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="55" cy="18" r="4.5" fill="var(--musical)" />
    </svg>
  );
}

// Mark + wordmark. The wordmark is Figtree 800, one weight, one colour.
export function Logo({
  showWordmark = true,
  className,
}: {
  showWordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-primary", className)}>
      <LogoMark />
      {showWordmark && (
        <span className="text-lg font-extrabold tracking-tight text-foreground">WorshipFlow</span>
      )}
    </span>
  );
}
