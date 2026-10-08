import { Logo } from "@/components/brand/logo";
import { redirect } from "next/navigation";
import { Music4, ListMusic, Users2, Mic2, Radio } from "lucide-react";
import { readSession } from "@/lib/auth/session";
import { ButtonLink } from "@/components/ui/button";

const STEPS = [
  { icon: ListMusic, label: "Plan", body: "Build the set — songs, order, keys, the shape of the service." },
  { icon: Mic2, label: "Arrange", body: "Section by section: who plays what, how intense, where it builds." },
  { icon: Users2, label: "Assign", body: "Give every song to the right people — nothing more than they need." },
  { icon: Radio, label: "Rehearse", body: "Walk through it together, live, with the leader directing from their phone." },
  { icon: Music4, label: "Lead", body: "Everyone already knows the plan. You lead; they follow." },
];

export default async function RootPage() {
  const session = await readSession();
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-5">
        <Logo />
        <div className="flex items-center gap-2">
          <ButtonLink href="/login" variant="ghost" size="sm">Log in</ButtonLink>
          <ButtonLink href="/signup" size="sm">Create a worship team</ButtonLink>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-20 pt-10 text-center sm:pt-16">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Know what to play. Know when to play it.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
          Plan the set. Communicate the vision. Rehearse together.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/signup" size="lg">Create a worship team</ButtonLink>
          <ButtonLink href="/login" variant="outline" size="lg">Log in</ButtonLink>
        </div>

        <div className="mt-20 grid gap-6 text-left sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((step) => (
            <div key={step.label} className="space-y-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <step.icon className="h-4 w-4" />
              </span>
              <h3 className="font-semibold">{step.label}</h3>
              <p className="text-sm text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-20 rounded-2xl border border-border bg-surface p-8 text-left">
          <p className="text-sm font-medium text-primary">The problem</p>
          <p className="mt-2 text-lg">
            A worship leader knows what they want a song to sound like, and where they want to
            take the worship moment — but getting that picture out of their head and into every
            team member&apos;s hands is hard.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            WorshipFlow exists to make that communication simple: one place to plan, one place
            for every musician to find their part, one screen to follow during rehearsal.
          </p>
        </div>

        <p className="mt-16 text-xs text-muted-foreground">
          Free to start. No credit card. One team.
        </p>
      </main>
    </div>
  );
}
