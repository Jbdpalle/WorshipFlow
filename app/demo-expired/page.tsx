import { redirect } from "next/navigation";
import { LogoMark } from "@/components/brand/logo";
import { prisma } from "@/lib/db/prisma";
import { readSession } from "@/lib/auth/session";
import { DemoConversionForm } from "@/components/auth/demo-conversion-form";

// Reads the session directly rather than through requireUser() — that's
// exactly what redirected here, so going through it again would loop.
export default async function DemoExpiredPage() {
  const session = await readSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) redirect("/login");

  // Only a genuinely expired demo belongs on this page — anyone else who
  // lands here (a normal user, or a demo account still inside its window)
  // just continues on.
  const isExpiredDemo = user.isDemo && user.demoExpiresAt && user.demoExpiresAt < new Date();
  if (!isExpiredDemo) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="text-primary">
            <LogoMark className="h-14 w-14" />
          </span>
          <h1 className="text-xl font-semibold">Your WorshipFlow demo has ended</h1>
          <p className="text-sm text-muted-foreground">
            Your 14-day trial is over, but nothing you built is gone. Create a free account to keep
            your song, set, and team exactly as you left them.
          </p>
        </div>
        <DemoConversionForm defaultName={user.name} />
      </div>
    </div>
  );
}
