import { requireUser } from "@/lib/auth/guard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { SettingsForm } from "@/components/settings/settings-form";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { RestartTourButton } from "@/components/demo/demo-tour-banner";
import { ThemeSegmentedControl } from "@/components/layout/theme-toggle";
import { TooltipToggle } from "@/components/layout/tooltip-toggle";
import { DangerZone } from "@/components/settings/danger-zone";

export default async function SettingsPage() {
  const { user, church, membershipRole } = await requireUser();
  const isOwner = membershipRole === "OWNER";
  const daysLeft = user.demoExpiresAt
    ? Math.max(0, Math.ceil((user.demoExpiresAt.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000)))
    : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <SectionHeader
        level={1}
        label="Settings"
        title="Your account"
        description="Your name and church, as everyone on the team sees them."
      />

      {user.isDemo && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">WorshipFlow Demo</CardTitle>
            <CardDescription>
              {daysLeft !== null ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left in your demo.` : "This is a demo account."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RestartTourButton tourStatus={user.tourStatus} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
          <CardDescription>
            Light is the default. Stage is a dim, high-contrast theme for rehearsal rooms and stages; switch it on whenever you like.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ThemeSegmentedControl />
          <div className="border-t border-border pt-4">
            <TooltipToggle />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your name</CardTitle>
          <CardDescription>Shown across the app — dashboard, sidebar, and anywhere you&apos;re assigned.</CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm field="name" initialValue={user.name} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Church / team name</CardTitle>
          <CardDescription>
            {isOwner ? "Shown in the sidebar and on the dashboard." : "Only the church owner can change this."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm field="church" initialValue={church.name} disabled={!isOwner} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Password</CardTitle>
          <CardDescription>Change the password you use to log in.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      {isOwner && (
        <Card className="border-danger/30">
          <CardHeader>
            <CardTitle className="text-base text-danger">Danger zone</CardTitle>
            <CardDescription>Permanently delete {church.name} and everything in it.</CardDescription>
          </CardHeader>
          <CardContent>
            <DangerZone churchName={church.name} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
