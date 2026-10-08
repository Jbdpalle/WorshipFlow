import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db/prisma";
import { FeedbackForm } from "@/components/feedback/feedback-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { MessageSquare } from "lucide-react";

export default async function FeedbackPage() {
  const { user } = await requireUser();
  // ADMIN_EMAIL is a comma-separated list so more than one person can see
  // the feedback inbox (e.g. the product owner and a team lead).
  const adminEmails = (process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  const isAdmin = adminEmails.includes(user.email);

  const inbox = isAdmin
    ? await prisma.feedback.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { user: true },
      })
    : [];

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <SectionHeader
        level={1}
        label="Feedback"
        title="Tell us what you think"
        description="Testing WorshipFlow with your team? Bugs, ideas, and general thoughts all help."
      />
      <FeedbackForm />

      {isAdmin && (
        <div className="space-y-3">
          <h2 className="text-xl font-bold">All feedback (admin)</h2>
          {inbox.length === 0 && (
            <EmptyState icon={MessageSquare} title="No feedback yet" description="Messages your team sends from this page will show up here." />
          )}
          {inbox.map((f) => (
            <Card key={f.id}>
              <CardHeader className="flex items-center justify-between gap-3 pb-2">
                <Badge variant={f.type === "bug" ? "danger" : "outline"}>{f.type}</Badge>
                <span className="tnum text-sm text-muted-foreground">
                  {new Date(f.createdAt).toLocaleString()}
                </span>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm">{f.message}</p>
                <p className="mt-1 text-sm text-muted-foreground">
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
