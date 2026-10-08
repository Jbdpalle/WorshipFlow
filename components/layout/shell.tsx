import { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { OfflineBanner } from "@/components/layout/offline-banner";
import { PageNav } from "@/components/layout/page-nav";
import { DemoTourBanner } from "@/components/demo/demo-tour-banner";

// App frame. phone: header + bottom bar · iPad portrait: icon rail ·
// iPad landscape/desktop: full sidebar. Content is capped at max-w-6xl
// and centred so large screens get calm margins, not stretched cards.
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
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <OfflineBanner />
      <DemoTourBanner isDemo={isDemo} tourStatus={tourStatus} tourStep={tourStep} />
      <Sidebar userName={userName} teamName={teamName} />
      <MobileHeader teamName={teamName} />
      <div className="pb-20 md:pb-0 md:pl-16 lg:pl-64">
        <PageNav />
        <main id="main" className="mx-auto max-w-6xl px-4 py-6 md:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
      <BottomNav userName={userName} teamName={teamName} />
    </div>
  );
}
