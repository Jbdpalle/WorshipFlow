import { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { OfflineBanner } from "@/components/layout/offline-banner";
import { PageNav } from "@/components/layout/page-nav";
import { DemoTourBanner } from "@/components/demo/demo-tour-banner";

export function Shell({
  userName,
  teamName,
  isDemo,
  tourStatus,
  tourStep,
  children,
}: {
  userName: string;
  teamName: string;
  isDemo: boolean;
  tourStatus: string | null;
  tourStep: number;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <OfflineBanner />
      <DemoTourBanner isDemo={isDemo} tourStatus={tourStatus} tourStep={tourStep} />
      <Sidebar userName={userName} teamName={teamName} />
      <MobileHeader userName={userName} teamName={teamName} />
      <div className="pb-20 md:pb-0 md:pl-64">
        <PageNav />
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
