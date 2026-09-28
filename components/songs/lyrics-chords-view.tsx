import { isChordLine } from "@/lib/songs/chord-line";
import { transposeLineToNashville } from "@/lib/songs/nashville-numbers";
import { cn } from "@/lib/utils/cn";

export type LyricsChordsMode = "all" | "lyrics" | "chords" | "numbers";

export function LyricsChordsView({
  content,
  size = "md",
  mode = "all",
  songKey,
}: {
  content: string;
  size?: "sm" | "md" | "lg";
  mode?: LyricsChordsMode;
  songKey?: string | null;
}) {
  const allLines = content.split("\n");
  const lines =
    mode === "lyrics"
      ? allLines.filter((l) => !isChordLine(l))
      : mode === "chords" || mode === "numbers"
        ? allLines.filter((l) => isChordLine(l) || !l.trim())
        : allLines;
  const displayLines =
    mode === "numbers" && songKey
      ? lines.map((l) => transposeLineToNashville(l, songKey))
      : lines;
  const sizeClass = { sm: "text-sm", md: "text-base", lg: "text-xl" }[size];

  return (
    <div className={cn("font-mono leading-relaxed whitespace-pre-wrap", sizeClass)}>
      {displayLines.map((line, i) =>
        isChordLine(lines[i]) ? (
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
