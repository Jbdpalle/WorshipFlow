"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { FEEDBACK_TYPES } from "@/lib/songs/constants";
import { submitFeedback } from "@/lib/actions/feedback";

export function FeedbackForm() {
  const pathname = usePathname();
  const [type, setType] = useState(FEEDBACK_TYPES[0].value as string);
  const [message, setMessage] = useState("");
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
          disabled={sending || !message.trim()}
          onClick={async () => {
            setSending(true);
            setError(null);
            try {
              await submitFeedback({ type, message, page: pathname ?? undefined });
              setSent(true);
              setMessage("");
            } catch (err) {
              setError(err instanceof Error ? err.message : "Unable to send feedback. Please try again.");
            } finally {
              setSending(false);
            }
          }}
        >
          {sending ? "Sending…" : "Send Feedback"}
        </Button>
      </CardContent>
    </Card>
  );
}
