import { requireUser } from "@/lib/auth/guard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SettingsForm } from "@/components/settings/settings-form";
import { RestartTourButton } from "@/components/demo/demo-tour-banner";
import { ThemeSegmentedControl } from "@/components/layout/theme-toggle";

export default async function SettingsPage() {
  const { user, church, membershipRole } = await requireUser();
  const canRenameChurch = membershipRole === "OWNER" || membershipRole === "ADMIN";
  const daysLeft = user.demoExpiresAt
    ? Math.max(0, Math.ceil((user.demoExpiresAt.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000)))
    : null;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Your name and church, as everyone on the team sees them.</p>
      </div>

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
            System matches your device&apos;s light/dark setting automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeSegmentedControl />
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
            {canRenameChurch
              ? "Shown in the sidebar and on the dashboard."
              : "Only a church owner or admin can change this."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm field="church" initialValue={church.name} disabled={!canRenameChurch} />
        </CardContent>
      </Card>
    </div>
  );
}
