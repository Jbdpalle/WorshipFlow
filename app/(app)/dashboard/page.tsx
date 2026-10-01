import { requireUser } from "@/lib/auth/guard";
import { getDashboardData } from "@/lib/dashboard/data";
import { NextSundayHero } from "@/components/dashboard/next-sunday-hero";
import { FollowingSundayCard } from "@/components/dashboard/following-sunday-card";
import { ThisWeekList } from "@/components/dashboard/this-week-list";
import { NeedsAttentionList } from "@/components/dashboard/needs-attention-list";
import { MemberStatusCard } from "@/components/dashboard/member-status-card";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const { user, team, membershipRole } = await requireUser();
  const data = await getDashboardData(team.id, user.id, membershipRole);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">
        {greeting()}, {user.name.split(" ")[0]}
      </h1>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="order-1 lg:col-span-2">
          <NextSundayHero nextSunday={data.nextSunday} />
        </div>

        <div className="order-2">
          <FollowingSundayCard followingSunday={data.followingSunday} />
        </div>

        <div className="order-4 lg:order-3">
          <ThisWeekList items={data.thisWeek} />
        </div>

        <div className="order-3 lg:order-4 lg:col-span-2">
          {data.isLeaderView ? (
            <NeedsAttentionList items={data.needsAttention} />
          ) : (
            <MemberStatusCard status={data.memberStatus} />
          )}
        </div>
      </div>
    </div>
  );
}
