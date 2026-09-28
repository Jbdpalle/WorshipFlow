import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { registerSchema, registerUser } from "@/lib/auth/actions";
import { createSession } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = registerSchema.parse(body);
    const user = await registerUser(input);
    await createSession({ userId: user.id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }
    const message = err instanceof Error ? err.message : "Unable to register";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
