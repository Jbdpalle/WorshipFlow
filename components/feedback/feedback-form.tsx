"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { FEEDBACK_TYPES } from "@/lib/songs/constants";
import { submitFeedback } from "@/lib/actions/feedback";
import { cn } from "@/lib/utils/cn";

const RATINGS = [
  { value: 1, label: "Very difficult" },
  { value: 2, label: "Difficult" },
  { value: 3, label: "Okay" },
  { value: 4, label: "Easy" },
  { value: 5, label: "Very easy" },
];

export function FeedbackForm() {
  const pathname = usePathname();
  const [type, setType] = useState(FEEDBACK_TYPES[0].value as string);
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (sent) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="font-medium">Thanks — your feedback was sent.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            We read every submission while testing WorshipFlow.
          </p>
          <Button className="mt-4" variant="secondary" onClick={() => setSent(false)}>
            Send another
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">How easy was this?</label>
          <p className="text-xs text-muted-foreground">Optional — skip if you just have a message below.</p>
          <div className="flex flex-wrap gap-1.5">
            {RATINGS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRating((prev) => (prev === r.value ? null : r.value))}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  rating === r.value
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border bg-surface-muted text-foreground hover:bg-border",
                )}
              >
                {r.value} — {r.label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Type</label>
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {FEEDBACK_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Message</label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            placeholder="What happened, what you expected, or what would help your team…"
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button
          disabled={sending || (!message.trim() && !rating)}
          onClick={async () => {
            setSending(true);
            setError(null);
            const result = await submitFeedback({
              type,
              message,
              page: pathname ?? undefined,
              rating: rating ?? undefined,
            });
            if (!result.ok) {
              setError(result.error);
              setSending(false);
              return;
            }
            setSent(true);
            setMessage("");
            setRating(null);
            setSending(false);
          }}
        >
          {sending ? "Sending…" : "Send Feedback"}
        </Button>
      </CardContent>
    </Card>
  );
}
