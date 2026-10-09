import { requireUser } from "@/lib/auth/guard";
import { getDashboardData, getCalendarMonthData } from "@/lib/dashboard/data";
import { LayoutDashboard } from "lucide-react";
import { SectionHeader } from "@/components/ui/section-header";
import { NextSundayHero } from "@/components/dashboard/next-sunday-hero";
import { ServiceSetCard } from "@/components/dashboard/service-set-card";
import { ServiceTeamCard } from "@/components/dashboard/service-team-card";
import { ComingUpCard } from "@/components/dashboard/coming-up-card";
import { NeedsAttentionList } from "@/components/dashboard/needs-attention-list";
import { MemberStatusCard } from "@/components/dashboard/member-status-card";
import { JumpToTiles } from "@/components/dashboard/jump-to-tiles";
import { InviteNudgeBanner } from "@/components/dashboard/invite-nudge-banner";
import { WorshipCalendar } from "@/components/dashboard/worship-calendar";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// "What do I need to know right now?" Order of importance: the next
// service, then its set / team / what needs attention (or, for a
// musician, their own part), then what comes after.
export default async function DashboardPage() {
  const { user, team, membershipRole } = await requireUser();
  const today = new Date();
  const [data, calendarEntries] = await Promise.all([
    getDashboardData(team.id, user.id, membershipRole),
    getCalendarMonthData(team.id, today.getFullYear(), today.getMonth()),
  ]);
  const next = data.nextSunday;
  const hasComingUp = !!data.followingSunday || data.thisWeek.length > 0;
  const calendar = (
    <WorshipCalendar
      initialYear={today.getFullYear()}
      initialMonth={today.getMonth()}
      initialEntries={calendarEntries}
      isLeaderView={data.isLeaderView}
    />
  );

  return (
    <div className="space-y-8">
      <SectionHeader
        level={1} icon={LayoutDashboard} stage="plan"
        label={today.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        title={`${greeting()}, ${user.name.split(" ")[0]}`}
      />

      <InviteNudgeBanner count={data.uninvitedMemberCount} />

      <NextSundayHero nextSunday={next} isLeaderView={data.isLeaderView} />

      <JumpToTiles next={next} isLeaderView={data.isLeaderView} uninvitedMemberCount={data.uninvitedMemberCount} />

      {next && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <ServiceSetCard set={next} isLeaderView={data.isLeaderView} />
          <ServiceTeamCard set={next} isLeaderView={data.isLeaderView} />
          <div className="md:col-span-2 lg:col-span-1">
            {data.isLeaderView ? (
              <NeedsAttentionList items={data.needsAttention} />
            ) : (
              <MemberStatusCard status={data.memberStatus} />
            )}
          </div>
        </div>
      )}

      {!next && !data.isLeaderView && <MemberStatusCard status={data.memberStatus} />}

      {hasComingUp ? (
        <div className="grid items-start gap-4 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <ComingUpCard following={data.followingSunday} thisWeek={data.thisWeek} />
          </div>
          <div className="lg:col-span-3">{calendar}</div>
        </div>
      ) : (
        calendar
      )}
    </div>
  );
}
