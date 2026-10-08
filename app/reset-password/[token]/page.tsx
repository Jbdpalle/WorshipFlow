import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getPasswordResetInfo } from "@/lib/actions/password-reset";
import { ResetPasswordForm } from "@/components/invite/reset-password-form";

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const info = await getPasswordResetInfo(token);

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
                <CardTitle>Set a new password</CardTitle>
                <CardDescription>Choose a new password for your account.</CardDescription>
              </CardHeader>
              <CardContent>
                <ResetPasswordForm token={token} />
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader>
                <CardTitle>
                  {info.status === "not_found" && "Reset link not found"}
                  {info.status === "expired" && "This reset link has expired"}
                  {info.status === "used" && "This reset link has already been used"}
                </CardTitle>
                <CardDescription>
                  {info.status === "not_found" && "Double-check the link, or ask your worship leader for a new one."}
                  {info.status === "expired" && "Ask your worship leader to generate a new reset link for you."}
                  {info.status === "used" && "If you still need to change your password, ask your worship leader for a new link."}
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
