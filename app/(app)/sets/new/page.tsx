import { SectionHeader } from "@/components/ui/section-header";
import { NewSetForm } from "./new-set-form";

export default function NewSetPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <SectionHeader
        level={1}
        label="Sets"
        title="New set"
        description="Give it a title to get started. Add date, team, theme and scripture whenever you're ready."
      />
      <NewSetForm />
    </div>
  );
}
