"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, KeyRound } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/tooltip";
import { createPasswordReset } from "@/lib/actions/password-reset";

// Leader-assisted password reset: generates a link via the same
// token-and-copy pattern as InviteDialog (WorshipFlow has no
// email-sending capability), for a team member who already has an
// account but is locked out.
export function ResetPasswordDialog({
  teamMemberId,
  teamMemberName,
  trigger,
}: {
  teamMemberId: string;
  teamMemberName: string;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() {
    setError(null);
    setLink(null);
    setCopied(false);
  }

  async function generate() {
    setGenerating(true);
    setError(null);
    const result = await createPasswordReset(teamMemberId);
    setGenerating(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setLink(`${window.location.origin}/reset-password/${result.data.token}`);
  }

  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)}>{trigger}</span>
      ) : (
        <Button variant="outline" onClick={() => setOpen(true)}>
          <KeyRound className="h-4 w-4" /> Reset password
        </Button>
      )}
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          reset();
        }}
        title={`Reset ${teamMemberName}'s password`}
      >
        {link ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Share this link with {teamMemberName} — opening it lets them set a brand-new password, no need to
              know their old one.
            </p>
            <div className="flex items-center gap-2">
              <Input value={link} readOnly className="font-mono text-xs" />
              <Tooltip content={copied ? "Copied!" : "Copy reset link"}>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  aria-label="Copy reset link"
                  onClick={async () => {
                    await navigator.clipboard.writeText(link);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </Tooltip>
            </div>
            <p className="text-xs text-muted-foreground">
              Expires in 24 hours. Generating a new link for {teamMemberName} will void this one.
            </p>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setOpen(false);
                reset();
                router.refresh();
              }}
            >
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Generates a one-time link you share with {teamMemberName} yourself (text, Slack, in person) — they
              use it to set a new password.
            </p>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button loading={generating} type="button" className="w-full" disabled={generating} onClick={generate}>
              <KeyRound className="h-4 w-4" /> {generating ? "Generating…" : "Generate reset link"}
            </Button>
          </div>
        )}
      </Dialog>
    </>
  );
}
