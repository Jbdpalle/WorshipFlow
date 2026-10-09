import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { Stage } from "@/components/ui/stage-icon";
import { cn } from "@/lib/utils/cn";

// Big, round, colourful tiles for the things people do most. The colour is the
// workflow stage (see stage-icon.tsx), the glyph sits top-left, the label and
// an optional one-line detail bottom-left. Pass `href` for a link; without it
// the tile is a plain block (used for the landing page's six steps).
// Gradient stops are tokens, and every stop holds white text at AA.
export function ActionTile({
  href,
  icon: Icon,
  stage,
  label,
  detail,
  className,
}: {
  href?: string;
  icon: LucideIcon;
  stage: Stage;
  label: string;
  detail?: string;
  className?: string;
}) {
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
