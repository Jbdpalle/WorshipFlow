import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TextLink } from "@/components/ui/text-link";
import type { NeedsAttentionItem } from "@/lib/dashboard/data";

export function NeedsAttentionList({ items }: { items: NeedsAttentionItem[] }) {
  return (
    <Card aria-labelledby="needs-attention-heading" className="flex h-full flex-col">
      <CardHeader className="py-3">
        <CardTitle id="needs-attention-heading" className="text-base">
          Needs attention
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        {items.length === 0 ? (
          <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden />
            You&apos;re all set. Nothing needs your attention.
          </p>
        ) : (
          <ul>
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-start gap-3 border-t border-border px-4 py-3 first:border-t-0"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">{item.message}</p>
                  <TextLink href={item.href} className="min-h-9">
                    {item.actionLabel} →
                  </TextLink>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
