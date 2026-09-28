import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db/prisma";
import { FeedbackForm } from "@/components/feedback/feedback-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function FeedbackPage() {
  const { user } = await requireUser();
  const isAdmin = process.env.ADMIN_EMAIL && user.email === process.env.ADMIN_EMAIL;

  const inbox = isAdmin
    ? await prisma.feedback.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { user: true },
      })
    : [];

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Feedback</h1>
        <p className="text-sm text-muted-foreground">
          Testing WorshipFlow with your team? Bugs, ideas, and general thoughts all help.
        </p>
      </div>
      <FeedbackForm />

      {isAdmin && (
        <div className="space-y-3">
          <h2 className="font-semibold">All Feedback (admin)</h2>
          {inbox.length === 0 && (
            <p className="text-sm text-muted-foreground">No feedback submitted yet.</p>
          )}
          {inbox.map((f) => (
            <Card key={f.id}>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <Badge variant={f.type === "bug" ? "danger" : "outline"}>{f.type}</Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(f.createdAt).toLocaleString()}
                </span>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm">{f.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {f.user?.email ?? "Anonymous"} {f.page && `· ${f.page}`}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
