import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleUser, ListMusic, Megaphone, Radio, SlidersHorizontal, Users, type LucideIcon } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggleButton } from "@/components/layout/theme-toggle";
import { DemoButton } from "@/components/landing/demo-button";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Status } from "@/components/ui/status";
import { ActionTile } from "@/components/ui/action-tile";
import { STAGE_TEXT, type Stage } from "@/components/ui/stage-icon";
import { readSession } from "@/lib/auth/session";
import { cn } from "@/lib/utils/cn";

// The landing page speaks the same design language as the app: the Warm
// theme (Stage on request), the same tokens, primitives and stage colours.
// Everything shown as a product screen is a labelled sample.

const STEPS: { n: string; stage: Stage; icon: LucideIcon; label: string; body: string }[] = [
  { n: "01", stage: "plan", icon: ListMusic, label: "Plan", body: "Build the set: songs, order, keys, the shape of the service." },
  { n: "02", stage: "arrange", icon: SlidersHorizontal, label: "Arrange", body: "Section by section: how intense, where it builds." },
  { n: "03", stage: "assign", icon: Users, label: "Assign", body: "Give every song to the right people, nothing more than they need." },
  { n: "04", stage: "rehearse", icon: Radio, label: "Rehearse", body: "Walk through it together, live, with the leader directing from their phone." },
  { n: "05", stage: "mypart", icon: CircleUser, label: "My part", body: "What do I play, and when do I come in?" },
  { n: "06", stage: "lead", icon: Megaphone, label: "Lead", body: "Current, next, signal, announce. Everyone already knows the plan." },
];

const BARS = [14, 14, 28, 54, 40, 10];

export default async function RootPage() {
  const session = await readSession();
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Logo />
        <nav aria-label="Page" className="hidden items-center gap-6 text-sm font-semibold text-muted-foreground md:flex">
          <a href="#how" className="hover:text-foreground">How it works</a>
          <a href="#leaders" className="hover:text-foreground">For leaders</a>
          <a href="#musicians" className="hover:text-foreground">For musicians</a>
        </nav>
        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggleButton />
          <ButtonLink href="/login" variant="ghost" size="sm">Log in</ButtonLink>
          <ButtonLink href="/signup" size="sm">Create a worship team</ButtonLink>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14 lg:pb-24 lg:pt-14">
          <div className="space-y-6">
            <p className="label-caps text-primary">For worship leaders and their teams</p>
            <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Know what to play. Know when to play it.
            </h1>
            <p className="max-w-lg text-lg text-muted-foreground">
              Plan the set. Show the vision. Every musician opens their own part, and rehearses from the same screen as the leader.
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/signup" size="lg">Create a worship team</ButtonLink>
              <DemoButton />
            </div>
            <p className="text-sm text-muted-foreground">Free to start. No credit card. Works on phone, iPad and laptop.</p>
          </div>

          <figure aria-label="Sample rehearsal screen" className="m-0">
            <div className="rounded-2xl border border-border bg-surface-muted p-3 sm:p-5">
              <div className="space-y-3 rounded-xl border border-border bg-background p-4 sm:p-5">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">01 Amazing Grace</span>
                  <span className="rounded-full bg-surface-muted px-3 py-1.5 text-xs font-bold text-muted-foreground">02 It Is Well</span>
                  <span className="rounded-full bg-surface-muted px-3 py-1.5 text-xs font-bold text-muted-foreground">03 Come Thou Fount</span>
                </div>
                <div className="flex h-14 items-end gap-1" aria-hidden>
                  {BARS.map((h, i) => (
                    <div
                      key={i}
                      className={cn("flex-1 rounded-t-md", i === 2 ? "bg-primary" : "bg-border")}
                      style={{ height: `${h}px` }}
                    />
                  ))}
                </div>
                <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr]">
                  <div className="rounded-xl border-2 border-primary bg-surface p-4">
                    <p className="label-caps text-primary">Now</p>
                    <p className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Verse 2</p>
                    <p className="mt-2 text-sm font-semibold text-muted-foreground">Light</p>
                  </div>
                  <div className="rounded-xl bg-surface-muted p-4">
                    <p className="label-caps">Next</p>
                    <p className="mt-1 text-2xl font-extrabold">Chorus</p>
                    <p className="mt-1 text-sm text-muted-foreground">Full band. Drums land on the downbeat.</p>
                  </div>
                </div>
                <div className="rounded-xl bg-musical-soft p-4">
                  <p className="label-caps text-musical">My part · Bass</p>
                  <p className="mt-1 text-lg font-semibold">Root notes, whole notes, under the voice.</p>
                </div>
              </div>
            </div>
            <figcaption className="mt-2 text-xs text-muted-foreground">Sample screen with example songs.</figcaption>
          </figure>
        </section>

        {/* The six steps */}
        <section id="how" className="border-y border-border bg-surface">
          <div className="mx-auto max-w-6xl space-y-8 px-4 py-14 sm:px-6 lg:py-20">
            <div className="max-w-2xl space-y-3">
              <p className="label-caps">How it works</p>
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">One flow, from the first idea to the downbeat.</h2>
              <p className="text-lg text-muted-foreground">
                Each step has its own colour in the app, so you always know which part of the workflow you are in.
              </p>
            </div>
            <ol className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
              {STEPS.map((s) => (
                <li key={s.label} className="contents">
                  <ActionTile
                    icon={s.icon}
                    stage={s.stage}
                    label={`${s.n} ${s.label}`}
                    detail={s.body}
                    className="min-h-44"
                  />
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Leaders and musicians */}
        <section className="mx-auto grid max-w-6xl gap-6 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:py-20">
          <Card id="leaders" className="space-y-4 p-6 sm:p-8">
            <p className={cn("label-caps", STAGE_TEXT.plan)}>For the worship leader</p>
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Get the picture out of your head and into everyone&apos;s hands.
            </h2>
            <p className="text-muted-foreground">
              A song&apos;s vision, its flow, its dynamics and every transition live in one place. The dashboard answers one question: what do I need to know right now?
            </p>
            <div className="space-y-3 rounded-xl border border-border bg-background p-4">
              <p className="label-caps">Next service · Sunday</p>
              <p className="text-xl font-extrabold">Sunday Worship</p>
              <div className="flex flex-wrap gap-2">
                <Status tone="warning">No drums on It Is Well</Status>
                <Status tone="success">3 songs set</Status>
              </div>
              <p className="text-xs text-muted-foreground">Sample data.</p>
            </div>
          </Card>

          <Card id="musicians" className="space-y-4 p-6 sm:p-8">
            <p className={cn("label-caps", STAGE_TEXT.mypart)}>For the musician</p>
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Open your phone. See your part. Nothing else.</h2>
            <p className="text-muted-foreground">
              If you play bass, you see the bass directions, section by section. No searching through a chart for the line that is about you.
            </p>
            <div className="overflow-hidden rounded-xl border border-border bg-background">
              <p className="label-caps px-4 pb-2 pt-3">Bass · Amazing Grace</p>
              {[
                ["Intro", "Rest.", true],
                ["Verse 1", "Follow the flow.", false],
                ["Chorus", "Enter here, simple root notes.", true],
              ].map(([section, note, strong]) => (
                <div key={String(section)} className="grid grid-cols-[5.5rem_1fr] gap-3 border-t border-border px-4 py-2.5 text-sm">
                  <span className={strong ? "font-bold" : "font-semibold text-muted-foreground"}>{section}</span>
                  <span className={strong ? "" : "text-muted-foreground"}>{note}</span>
                </div>
              ))}
              <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">Sample data.</p>
            </div>
          </Card>
        </section>

        {/* The problem */}
        <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6 lg:pb-20">
          <div className="grid gap-6 rounded-2xl bg-surface-muted p-6 sm:p-10 lg:grid-cols-[1fr_1.4fr] lg:gap-12">
            <p className="label-caps text-primary">The problem we exist for</p>
            <div className="space-y-3">
              <p className="text-xl font-semibold leading-snug sm:text-2xl">
                A worship leader knows what they want a song to sound like, and where they want to take the worship moment. Getting that picture into every team member&apos;s hands is hard.
              </p>
              <p className="text-muted-foreground">
                WorshipFlow makes it simple: one place to plan, one place for every musician to find their part, one screen to follow during rehearsal.
              </p>
            </div>
          </div>
        </section>

        {/* Closing call to action */}
        <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6 lg:pb-20">
          <div className="flex flex-col gap-6 rounded-2xl bg-primary p-8 text-primary-foreground sm:p-12 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl space-y-2">
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Build your first set this week.</h2>
              <p className="text-lg opacity-90">
                We start you with an example set, so you can see how it works right away. Free to start, no credit card.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <ButtonLink href="/signup" size="lg" variant="secondary">Create a worship team</ButtonLink>
              <ButtonLink href="/login" size="lg" variant="outline" className="border-primary-foreground/50 text-primary-foreground hover:bg-primary-foreground/10">
                Log in
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 pb-10 text-sm text-muted-foreground sm:px-6">
        <span>WorshipFlow</span>
        <span className="flex gap-5">
          <Link href="/login" className="hover:text-foreground">Log in</Link>
          <Link href="/signup" className="hover:text-foreground">Create a worship team</Link>
        </span>
      </footer>
    </div>
  );
}
