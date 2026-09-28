import { NewSetForm } from "./new-set-form";

export default function NewSetPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New Worship Set</h1>
        <p className="text-sm text-muted-foreground">
          Enter a theme and scripture and we&apos;ll suggest song categories from your library.
        </p>
      </div>
      <NewSetForm />
    </div>
  );
}
