import { Music4 } from "lucide-react";

export default function MusicDirectorPage() {
  return (
    <section className="rounded-2xl border border-border bg-surface p-8 text-center shadow-sm sm:p-12">
      <Music4 className="mx-auto h-9 w-9 text-accent" aria-hidden />
      <h1 className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Music Director
      </h1>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        Coming soon — tools for directing the band and vocals in real time during rehearsal and
        service.
      </p>
    </section>
  );
}
