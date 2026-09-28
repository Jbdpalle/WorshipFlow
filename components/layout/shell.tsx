import { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { BottomNav } from "@/components/layout/bottom-nav";

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
      <Sidebar userName={userName} teamName={teamName} />
      <MobileHeader userName={userName} teamName={teamName} />
      <div className="pb-20 md:pb-0 md:pl-64">
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
