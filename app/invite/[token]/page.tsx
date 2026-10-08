import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getInviteInfo } from "@/lib/actions/invites";
import { AcceptInviteForm } from "@/components/invite/accept-invite-form";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const info = await getInviteInfo(token);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="text-primary">
            <LogoMark className="h-14 w-14" />
          </span>
          <h1 className="text-xl font-semibold">WorshipFlow</h1>
        </div>

        <Card>
          {info.status === "valid" ? (
            <>
              <CardHeader>
                <CardTitle>Join {info.churchName}</CardTitle>
                <CardDescription>
                  {info.teamMemberName
                    ? `You've been invited as ${info.teamMemberName}.`
                    : "You've been invited to join their worship team on WorshipFlow."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AcceptInviteForm token={token} email={info.email} userExists={info.userExists} />
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader>
                <CardTitle>
                  {info.status === "not_found" && "Invite not found"}
                  {info.status === "expired" && "This invite has expired"}
                  {info.status === "accepted" && "This invite has already been used"}
                </CardTitle>
                <CardDescription>
                  {info.status === "not_found" && "Double-check the link, or ask your worship leader to send a new one."}
                  {info.status === "expired" && "Ask your worship leader to send you a new invite."}
                  {info.status === "accepted" && "If this should be you, log in instead."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/login" className="text-sm font-medium text-primary">
                  Go to login →
                </Link>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
