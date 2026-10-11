import { analyzeTheme } from "@/lib/songs/theme-engine";

// Contextual placeholder copy for the Set Vision ("Leader's Note") and
// Opening/Exaltation fields — never saved content, just guidance shown via
// the textarea's native placeholder attribute until the leader types
// something. Deterministic and template-based (reuses analyzeTheme's
// existing keyword/category matching) rather than an AI call, per the
// build spec's "prefer existing theme metadata and simple contextual
// templates unless an AI integration is already established."

const GENERIC_VISION_PLACEHOLDER =
  "Describe the overall purpose of this worship set. What should the congregation be invited to reflect on, celebrate, or respond to? Explain how the songs should flow together and how you want the set to conclude.";

const GENERIC_OPENING_PLACEHOLDER =
  "Describe how the set should begin. Consider the opening song's purpose, initial musical energy, instrumentation, vocal entrance, and how it should lead into the rest of the set.";

function parseKeywords(keywords: string): string[] {
  return keywords
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

function themeFocus(theme: string, keywords: string): string | null {
  if (!theme.trim() && !keywords.trim()) return null;
  const analysis = analyzeTheme({ theme, keywords: parseKeywords(keywords), verses: [] });
  const label = analysis.biblicalThemes[0] ?? theme.trim();
  return label ? label.toLowerCase() : null;
}

export function getVisionPlaceholder(theme: string, keywords: string): string {
  const focus = themeFocus(theme, keywords);
  if (!focus) return GENERIC_VISION_PLACEHOLDER;

  const analysis = analyzeTheme({ theme, keywords: parseKeywords(keywords), verses: [] });
  const flow = analysis.suggestedFlow.join(" → ");
  return `Set vision: How should this set lead the congregation through ${focus}? Describe the spiritual progression (e.g. ${flow}), how the songs connect, and the response you hope to encourage.`;
}

export function getOpeningPlaceholder(theme: string, keywords: string): string {
  const focus = themeFocus(theme, keywords);
  if (!focus) return GENERIC_OPENING_PLACEHOLDER;

  return `Opening direction: How should the opening invite the congregation into ${focus}? Consider the opening song's message, initial instrumentation, vocal entrance, and the musical energy needed to establish the direction of the set.`;
}
