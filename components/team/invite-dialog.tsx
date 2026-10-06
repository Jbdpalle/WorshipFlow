"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Mail, UserPlus } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Tooltip } from "@/components/ui/tooltip";
import { createInvite } from "@/lib/actions/invites";

const ROLE_OPTIONS = [
  { value: "MEMBER", label: "Member" },
  { value: "LEADER", label: "Leader" },
  { value: "ADMIN", label: "Admin" },
] as const;

export function InviteDialog({
  teamMemberId,
  teamMemberName,
  trigger,
}: {
  teamMemberId?: string;
  teamMemberName?: string;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof ROLE_OPTIONS)[number]["value"]>("MEMBER");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() {
    setEmail("");
    setRole("MEMBER");
    setError(null);
    setLink(null);
    setCopied(false);
  }

  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)}>{trigger}</span>
      ) : (
        <Button variant="outline" className="border-accent text-accent hover:bg-accent/10" onClick={() => setOpen(true)}>
          <UserPlus className="h-4 w-4" /> Invite
        </Button>
      )}
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          reset();
        }}
        title={teamMemberName ? `Invite ${teamMemberName}` : "Invite someone to your team"}
      >
        {link ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Share this link with {email} — it signs them into your team directly, no login needed first.
            </p>
            <div className="flex items-center gap-2">
              <Input value={link} readOnly className="font-mono text-xs" />
              <Tooltip content={copied ? "Copied!" : "Copy invite link"}>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  aria-label="Copy invite link"
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
            <p className="text-xs text-muted-foreground">Expires in 7 days.</p>
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
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!email.trim()) return;
              setSending(true);
              setError(null);
              const result = await createInvite({ email, role, teamMemberId });
              setSending(false);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setLink(`${window.location.origin}/invite/${result.data.token}`);
            }}
          >
            <div className="space-y-1">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="them@church.org"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="invite-role">Role</Label>
              <Select id="invite-role" value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" className="w-full" disabled={sending}>
              <Mail className="h-4 w-4" /> {sending ? "Creating invite…" : "Create invite link"}
            </Button>
          </form>
        )}
      </Dialog>
    </>
  );
}
