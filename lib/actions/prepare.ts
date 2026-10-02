"use server";

import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db/prisma";
import { runAction } from "@/lib/actions/action-result";
import { selectRoleNoteForViewer } from "@/lib/songs/role-notes";

export type PrepareMeResult = { ok: true; summary: string } | { ok: false; error: string };

// The structured prep view (songs, role notes, recent changes) is built
// straight from the database and always works. This is a purely optional
// layer on top: turning those same facts into a short natural-language
// note. It never invents anything not already in the facts it's given.
//
// Returns a result object instead of throwing: Next.js strips the message
// off anything a Server Action throws once it reaches a production build
// (only an opaque "Minified React error #441" digest crosses the wire —
// confirmed by reproducing it against this exact build, dev vs. prod, and
// tracing it to React Flight's client-side resolveErrorProd() fallback in
// next/dist/compiled/react-server-dom-turbopack/.../*.production.js, which
// fires whenever a production RSC error chunk carries no message). A normal
// return value has no such restriction, so callers get the real text.
export async function generatePrepareMeSummary(memberId: string, setId: string): Promise<PrepareMeResult> {
  return runAction(async () => {
    const { team } = await requireUser();

    const member = await prisma.teamMember.findUnique({ where: { id: memberId } });
    if (!member || member.teamId !== team.id) return { ok: false, error: "Team member not found." };

    if (!process.env.ANTHROPIC_API_KEY) {
      return { ok: false, error: "AI summaries need an ANTHROPIC_API_KEY set in your environment variables." };
    }

    const set = await prisma.worshipSet.findUnique({ where: { id: setId } });
    if (!set || set.teamId !== team.id) return { ok: false, error: "Event not found." };

    const assignments = await prisma.songAssignment.findMany({
      where: { teamMemberId: memberId, setSong: { setId } },
      include: {
        setSong: {
          include: {
            song: {
              include: {
                sections: { orderBy: { order: "asc" }, include: { roleNotes: true } },
                changeLogs: { orderBy: { createdAt: "desc" }, take: 2 },
              },
            },
          },
        },
      },
    });
    if (assignments.length === 0) return { ok: false, error: "No songs assigned to this person for this event yet." };

    const facts = assignments
      .map((a) => {
        const song = a.setSong.song;
        const notes = song.sections
          .map((s) => {
            // A note aimed at one specific person (visibility: PERSON) must
            // never be fed into another member's AI summary, even if they
            // share the same role string.
            const note = selectRoleNoteForViewer(s.roleNotes, a.role, memberId);
            return note ? `${s.label}: ${note.content}` : null;
          })
          .filter(Boolean)
          .join("; ");
        const changes = song.changeLogs
          .map((c) => `${c.field} ${c.fromValue ?? "—"} -> ${c.toValue ?? "—"}`)
          .join("; ");
        return `- "${song.title}" (Key ${song.key ?? "unset"}, ${song.bpm ?? "unset"} BPM) as ${a.role}. Instructions: ${notes || "none"}. Recent changes: ${changes || "none"}.`;
      })
      .join("\n");

    try {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      const message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        messages: [
          {
            role: "user",
            content: `You are helping ${member.name}, a worship team member, prepare for "${set.title}"${set.serviceDate ? ` on ${set.serviceDate.toDateString()}` : ""}. Write a short (3-5 sentence), warm, practical prep note covering what to review and anything that changed recently they should know about. Use ONLY the facts below — never invent a detail, instruction, or change that isn't stated.

${facts}`,
          },
        ],
      });

      const textBlock = message.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        return { ok: false, error: "Couldn't generate a summary — please try again." };
      }
      return { ok: true, summary: textBlock.text.trim() };
    } catch {
      return { ok: false, error: "The AI summary service is unavailable right now — please try again." };
    }
  });
}
