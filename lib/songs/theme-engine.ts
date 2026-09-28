import { THEME_CATEGORIES } from "@/lib/songs/constants";

export type ThemeInput = {
  theme: string;
  keywords: string[];
  verses: string[];
};

export type ThemeAnalysis = {
  biblicalThemes: string[];
  matchedCategories: (typeof THEME_CATEGORIES)[number][];
  suggestedFlow: string[];
};

/**
 * Rule-based theme engine. This is intentionally NOT an AI song-selection
 * oracle — it groups the leader's own inputs into recognizable worship
 * categories and proposes a flow. The leader decides what actually fits.
 */
export function analyzeTheme(input: ThemeInput): ThemeAnalysis {
  const haystack = [input.theme, ...input.keywords]
    .join(" ")
    .toLowerCase();

  const matchedCategories = THEME_CATEGORIES.filter((category) =>
    category.keywords.some((kw) => haystack.includes(kw)),
  );

  const finalCategories = matchedCategories.length
    ? matchedCategories
    : THEME_CATEGORIES.filter((c) =>
        ["worship-adoration", "our-response"].includes(c.key),
      );

  const biblicalThemes = finalCategories.map((c) => c.label);

  // A simple, sensible emotional-progression default: open with praise,
  // build, land on the theme's core, close in response/surrender.
  const flowOrder = [
    "high-praise",
    "worship-adoration",
    "gods-love",
    "grace-mercy",
    "cross-sacrifice",
    "our-response",
    "surrender",
  ];
  const suggestedFlow = flowOrder
    .filter((key) => finalCategories.some((c) => c.key === key))
    .map((key) => THEME_CATEGORIES.find((c) => c.key === key)!.label);

  if (suggestedFlow.length === 0) {
    suggestedFlow.push("Worship / Adoration", "Our Response to God's Love");
  }

  return { biblicalThemes, matchedCategories: finalCategories, suggestedFlow };
}

export type SongForMatching = {
  id: string;
  title: string;
  themeCategory: string | null;
  biblicalConnection: string | null;
  tags: { label: string }[];
};

export type SongMatch<T extends SongForMatching> = {
  song: T;
  category: string;
  score: number;
};

/**
 * Groups the team's song library into the matched theme categories using
 * simple tag/label overlap. Never assumes a song fits just because its
 * title contains a keyword (e.g. "love") — it scores on tags and the
 * leader-entered theme category / biblical connection fields instead.
 */
export function matchSongsToTheme<T extends SongForMatching>(
  songs: T[],
  analysis: ThemeAnalysis,
): SongMatch<T>[] {
  const matches: SongMatch<T>[] = [];

  for (const song of songs) {
    const songTags = song.tags.map((t) => t.label.toLowerCase());
    const songText = [
      song.themeCategory ?? "",
      song.biblicalConnection ?? "",
      ...songTags,
    ]
      .join(" ")
      .toLowerCase();

    for (const category of analysis.matchedCategories) {
      const overlap = category.keywords.filter((kw) =>
        songText.includes(kw),
      ).length;
      const categoryLabelMatch = songText.includes(category.label.toLowerCase());

      if (overlap > 0 || categoryLabelMatch) {
        matches.push({
          song,
          category: category.label,
          score: overlap + (categoryLabelMatch ? 2 : 0),
        });
      }
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}
