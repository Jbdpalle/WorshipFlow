import { requireUser } from "@/lib/auth/guard";
import { getDashboardData, getCalendarMonthData } from "@/lib/dashboard/data";
import { NextSundayHero } from "@/components/dashboard/next-sunday-hero";
import { FollowingSundayCard } from "@/components/dashboard/following-sunday-card";
import { ThisWeekList } from "@/components/dashboard/this-week-list";
import { NeedsAttentionList } from "@/components/dashboard/needs-attention-list";
import { MemberStatusCard } from "@/components/dashboard/member-status-card";
import { InviteNudgeBanner } from "@/components/dashboard/invite-nudge-banner";
import { WorshipCalendar } from "@/components/dashboard/worship-calendar";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const { user, team, membershipRole } = await requireUser();
  const today = new Date();
  const [data, calendarEntries] = await Promise.all([
    getDashboardData(team.id, user.id, membershipRole),
    getCalendarMonthData(team.id, today.getFullYear(), today.getMonth()),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-foreground">
        {greeting()}, {user.name.split(" ")[0]}
      </h1>

      <InviteNudgeBanner count={data.uninvitedMemberCount} />

      <NextSundayHero nextSunday={data.nextSunday} isLeaderView={data.isLeaderView} />

      {!data.isLeaderView && <MemberStatusCard status={data.memberStatus} />}

      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Calendar &amp; attention
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <FollowingSundayCard followingSunday={data.followingSunday} isLeaderView={data.isLeaderView} />
            <ThisWeekList items={data.thisWeek} />
            {data.isLeaderView && <NeedsAttentionList items={data.needsAttention} />}
          </div>
          <div className="space-y-4">
            <WorshipCalendar
              initialYear={today.getFullYear()}
              initialMonth={today.getMonth()}
              initialEntries={calendarEntries}
              isLeaderView={data.isLeaderView}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
