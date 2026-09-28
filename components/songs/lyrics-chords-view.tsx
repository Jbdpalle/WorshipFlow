import { isChordLine } from "@/lib/songs/chord-line";
import { cn } from "@/lib/utils/cn";

export type LyricsChordsMode = "all" | "lyrics" | "chords";

export function LyricsChordsView({
  content,
  size = "md",
  mode = "all",
}: {
  content: string;
  size?: "sm" | "md" | "lg";
  mode?: LyricsChordsMode;
}) {
  const allLines = content.split("\n");
  const lines =
    mode === "lyrics"
      ? allLines.filter((l) => !isChordLine(l))
      : mode === "chords"
        ? allLines.filter((l) => isChordLine(l) || !l.trim())
        : allLines;
  const sizeClass = { sm: "text-sm", md: "text-base", lg: "text-xl" }[size];

  return (
    <div className={cn("font-mono leading-relaxed whitespace-pre-wrap", sizeClass)}>
      {lines.map((line, i) =>
        isChordLine(line) ? (
          <div key={i} className="font-bold text-accent">
            {line || " "}
          </div>
        ) : (
          <div key={i} className="text-foreground">
            {line || " "}
          </div>
        ),
      )}
    </div>
  );
}
