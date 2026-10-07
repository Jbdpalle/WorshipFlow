"use server";

import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/guard";
import { isChordLine } from "@/lib/songs/chord-line";
import { runAction, type ActionResultData } from "@/lib/actions/action-result";

export type ThemeVerseSuggestion = {
  theme: string;
  verseReference: string;
  verseText: string;
};

// Sends only the lyric lines (chord lines stripped, same heuristic the
// chart's "Lyrics" view already uses) so the model reads clean lyrics
// rather than chord symbols mixed into the prompt.
function lyricsOnly(content: string | null): string {
  if (!content) return "";
  return content
    .split("\n")
    .filter((line) => !isChordLine(line))
    .join("\n")
    .trim();
}

export async function suggestThemeAndVerse(songId: string): Promise<ActionResultData<ThemeVerseSuggestion>> {
  return runAction(async () => {
    const { team } = await requireUser();
    const song = await prisma.song.findUnique({
      where: { id: songId },
      include: { sections: { orderBy: { order: "asc" } } },
    });
    if (!song || song.teamId !== team.id) return { ok: false, error: "Song not found." };

    if (!process.env.ANTHROPIC_API_KEY) {
      return {
        ok: false,
        error: "AI suggestions are coming in a future update — stay tuned!",
      };
    }

    const lyrics = song.sections
      .map((s) => lyricsOnly(s.lyricsChords))
      .filter(Boolean)
      .join("\n\n");

    if (!lyrics.trim()) {
      return {
        ok: false,
        error: "Add lyrics to this song's sections first — there's nothing to read yet.",
      };
    }

    try {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      const message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: `Read these worship song lyrics${song.title ? ` for "${song.title}"` : ""} and suggest: (1) a short theme category (2-4 words, e.g. "Grace & Redemption", "Trust in Hardship"), and (2) ONE Bible verse that most directly connects to the song's central idea — a real, verifiable verse, not a paraphrase invented to fit.

Lyrics:
${lyrics}

Respond with ONLY JSON in this exact shape, no other text:
{"theme": "...", "verseReference": "Book Chapter:Verse", "verseText": "the verse text"}`,
          },
        ],
      });

      const block = message.content.find((b) => b.type === "text");
      if (!block || block.type !== "text") {
        return { ok: false, error: "Couldn't generate a suggestion — please try again." };
      }

      const jsonMatch = block.text.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : block.text);
      if (!parsed.theme || !parsed.verseReference) {
        return { ok: false, error: "Couldn't generate a suggestion — please try again." };
      }

      return {
        ok: true,
        data: {
          theme: String(parsed.theme),
          verseReference: String(parsed.verseReference),
          verseText: String(parsed.verseText ?? ""),
        },
      };
    } catch {
      return { ok: false, error: "The AI suggestion service is unavailable right now — please try again." };
    }
  });
}
