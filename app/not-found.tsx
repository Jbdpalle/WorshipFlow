import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";

// Public 404 (outside the signed-in app): brand, plain words, one way out.
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <Logo />
      <h1 className="mt-4 text-2xl font-bold">We couldn&apos;t find that page</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The link may be out of date. If you were invited to a team, ask your worship leader for a fresh link.
      </p>
      <ButtonLink href="/login" size="lg">Go to log in</ButtonLink>
    </main>
  );
}
