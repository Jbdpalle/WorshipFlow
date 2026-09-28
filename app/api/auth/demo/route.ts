import { NextResponse } from "next/server";
import { createDemoAccount } from "@/lib/auth/actions";
import { createSession } from "@/lib/auth/session";

export async function POST() {
  try {
    const user = await createDemoAccount();
    await createSession({ userId: user.id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to start demo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
