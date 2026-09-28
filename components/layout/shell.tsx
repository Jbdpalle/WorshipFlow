import { ReactNode } from "react";
import { Nav } from "@/components/layout/nav";

export function Shell({
  userName,
  teamName,
  children,
}: {
  userName: string;
  teamName: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <Nav userName={userName} teamName={teamName} />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
