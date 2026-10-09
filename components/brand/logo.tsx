import { cn } from "@/lib/utils/cn";

// The Baton W with its staff: one continuous stroke forming a W, like a
// conductor's baton tracing a beat, ending in the downbeat dot. Beneath it a
// staff rises to the right: one bold line in the musical accent, one soft line
// above. The W and lines follow the text colour (forest on Warm, brass on
// Stage); the dot and bold line use the musical accent.
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden className={cn("h-8 w-8", className)}>
      <path
        d="M5 60 L59 49"
        stroke="var(--musical)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M5 54 L40 47"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.45"
      />
      <path
        d="M9 11 L21 37 L32 18 L43 37 L55 11"
        stroke="currentColor"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="55" cy="11" r="4.5" fill="var(--musical)" />
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
