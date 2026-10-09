import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { StageIcon, type Stage } from "@/components/ui/stage-icon";
import { cn } from "@/lib/utils/cn";

// Tiles for the things people do most. The colour is the workflow stage (see
// stage-icon.tsx).
// - "bold" (default): big, round, colourful gradient block with the glyph
//   top-left and label bottom-left. For first impressions (landing page); too
//   loud for daily screens. Gradient stops are tokens that hold white text at AA.
// - "quiet": a normal card (surface, 1px border, 12px corners) with the stage
//   colour only in a small tinted icon tile. For daily screens like the
//   Dashboard, where the primary action must stay the loudest thing.
// Pass `href` for a link; without it the tile is a plain block.
export function ActionTile({
  href,
  icon: Icon,
  stage,
  label,
  detail,
  variant = "bold",
  className,
}: {
  href?: string;
  icon: LucideIcon;
  stage: Stage;
  label: string;
  detail?: string;
  variant?: "bold" | "quiet";
  className?: string;
}) {
  if (variant === "quiet") {
    const quiet = cn(
      "flex min-h-16 items-center gap-3 rounded-xl border border-border bg-surface p-3",
      href && "transition-colors duration-[var(--duration-fast)] hover:bg-surface-muted",
      className,
    );
    const quietBody = (
      <>
        <StageIcon icon={Icon} stage={stage} size="md" />
        <span className="block min-w-0">
          <span className="block font-bold leading-tight text-foreground">{label}</span>
          {detail && <span className="mt-0.5 block text-sm leading-snug text-muted-foreground">{detail}</span>}
        </span>
      </>
    );
    return href ? (
      <Link href={href} className={quiet}>
        {quietBody}
      </Link>
    ) : (
      <div className={quiet}>{quietBody}</div>
    );
  }

  const classes = cn(
    "flex min-h-28 flex-col justify-between gap-6 rounded-3xl p-4 text-left text-tile-foreground shadow-[inset_0_1px_0_rgb(255_255_255_/_0.22)] sm:p-5",
    href && "transition duration-[var(--duration-fast)] hover:brightness-110 active:brightness-90",
    className,
  );
  const style = {
    backgroundImage: `linear-gradient(145deg, var(--tile-${stage}), var(--tile-${stage}-deep))`,
  };
  const body = (
    <>
      <Icon className="h-7 w-7 shrink-0" strokeWidth={1.9} aria-hidden />
      <span className="block min-w-0">
        <span className="block text-lg font-extrabold leading-tight tracking-tight">{label}</span>
        {detail && <span className="mt-0.5 block text-sm font-semibold leading-snug">{detail}</span>}
      </span>
    </>
  );
  return href ? (
    <Link href={href} className={classes} style={style}>
      {body}
    </Link>
  ) : (
    <div className={classes} style={style}>
      {body}
    </div>
  );
}
