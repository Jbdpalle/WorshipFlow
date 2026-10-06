import { NewSetForm } from "./new-set-form";

export default function NewSetPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New Service</h1>
        <p className="text-sm text-muted-foreground">
          Give it a title to get started — add date, team, theme, and scripture whenever you&apos;re ready.
        </p>
      </div>
      <NewSetForm />
    </div>
  );
}
