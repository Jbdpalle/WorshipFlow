import { ReactNode } from "react";
import { requireUser } from "@/lib/auth/guard";
import { Shell } from "@/components/layout/shell";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { user, team } = await requireUser();

  return (
    <Shell userName={user.name} teamName={team.name}>
      {children}
    </Shell>
  );
}
