"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ChurchRole } from "@prisma/client";
import { Pencil, Plus, Trash2, UserRound, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { ROLES } from "@/lib/songs/constants";
import { addTeamMember, removeTeamMember, updateTeamMember } from "@/lib/actions/team";
import { revokeInvite } from "@/lib/actions/invites";
import { InviteDialog } from "@/components/team/invite-dialog";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils/cn";

type Member = {
  id: string;
  name: string;
  role: string;
  instrument: string | null;
  bio: string | null;
  userId: string | null;
};

type PendingInvite = {
  id: string;
  email: string;
  role: ChurchRole;
  token: string;
  expiresAt: Date;
  teamMemberId: string | null;
};

function MemberInviteStatus({
  member,
  invite,
  isLeader,
  isAdmin,
}: {
  member: Member;
  invite: PendingInvite | undefined;
  isLeader: boolean;
  isAdmin: boolean;
}) {
  if (member.userId) {
    return (
      <Tooltip content="This person has logged in and linked their own account">
        <Badge tabIndex={0} variant="success" className="text-[10px]">
          Active
        </Badge>
      </Tooltip>
    );
  }

  const isExpired = invite && invite.expiresAt < new Date();

  return (
    <div className="flex items-center gap-2">
      {invite ? (
        <Tooltip
          content={
            isExpired
              ? "This invite link expired — resend to generate a new one"
              : `Invited ${invite.email} — not yet accepted. WorshipFlow invites are a link you share, not an email we send.`
          }
        >
          <Badge
            tabIndex={0}
            variant={isExpired ? "outline" : "accent"}
            className={cn("text-[10px]", isExpired && "text-danger")}
          >
            {isExpired ? "Invitation Expired" : "Invitation Sent"}
          </Badge>
        </Tooltip>
      ) : (
        <Tooltip content="Added to the roster, but hasn't logged in or linked an account yet">
          <Badge tabIndex={0} variant="outline" className="text-[10px]">
            Roster only
          </Badge>
        </Tooltip>
      )}
      {isLeader && (
        // Always mounted (not conditional on `invite`) so the dialog isn't
        // unmounted out from under itself: createInvite's revalidatePath
        // refreshes this page's data as soon as the invite is created,
        // which would otherwise flip this condition and close the dialog
        // before the leader ever sees the link to copy.
        <InviteDialog
          teamMemberId={member.id}
          teamMemberName={member.name}
          canGrantAdmin={isAdmin}
          initialEmail={invite?.email}
          initialRole={invite?.role === "OWNER" ? "MEMBER" : invite?.role}
          trigger={
            <button className="text-xs font-medium text-accent hover:underline">
              {invite ? "Resend Invitation" : "Invite"}
            </button>
          }
        />
      )}
    </div>
  );
}

// Two TeamMember rows can end up with the same real person's name, most
// often from a roster import that didn't exactly match an existing row
// (see lib/songs/member-name.ts) — renaming one here to match the other
// exactly (same case/whitespace) is what lets them merge everywhere a
// member-name picker renders. Nickname/spelling fixes ("kk" → "Karthik")
// need the same treatment.
function MemberNameEditor({ member, isLeader }: { member: Member; isLeader: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(member.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isLeader) {
    return <p className="font-medium">{member.name}</p>;
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(member.name);
          setError(null);
          setEditing(true);
        }}
        className="group flex items-center gap-1.5 text-left"
        aria-label={`Rename ${member.name}`}
      >
        <span className="font-medium">{member.name}</span>
        <Pencil className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground/70" />
      </button>
    );
  }

  async function save() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === member.name) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError(null);
    const result = await updateTeamMember(member.id, { name: trimmed });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <Input
          autoFocus
          aria-label={`Edit ${member.name}'s name`}
          value={value}
          disabled={saving}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
          onBlur={save}
          className="h-7 px-1.5 text-sm font-medium"
        />
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export function TeamRoster({
  members,
  pendingInvites,
  isLeader,
  isAdmin,
}: {
  members: Member[];
  pendingInvites: PendingInvite[];
  isLeader: boolean;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", role: ROLES[0] as string, instrument: "" });
  const [error, setError] = useState<string | null>(null);

  const inviteByMemberId = new Map(
    pendingInvites.filter((i) => i.teamMemberId).map((i) => [i.teamMemberId as string, i]),
  );
  const openInvites = pendingInvites.filter((i) => !i.teamMemberId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {error ? <p className="text-sm text-danger">{error}</p> : <span />}
        <div className="flex flex-wrap gap-2">
          {isLeader && <InviteDialog canGrantAdmin={isAdmin} />}
          {isLeader && (
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Add Team Member
            </Button>
          )}
        </div>
      </div>

      {isLeader && (
        <p className="text-sm text-muted-foreground">
          Importing a schedule?{" "}
          <Link href="/roster" className="font-medium text-accent hover:underline">
            Go to Roster →
          </Link>
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((m) => (
          <Card key={m.id}>
            <CardContent className="flex items-start gap-3 pt-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                <UserRound className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <MemberNameEditor member={m} isLeader={isLeader} />
                {isLeader ? (
                  <Tooltip content="Their usual role on the roster — not a per-service assignment. Picked the wrong instrument? Change it here instead of removing and re-adding.">
                    <select
                      value={m.role}
                      aria-label={`Change ${m.name}'s role`}
                      className="-ml-1 rounded-md bg-transparent px-1 text-sm text-muted-foreground hover:bg-surface-muted focus:outline-none"
                      onChange={async (e) => {
                        const newRole = e.target.value;
                        if (newRole === m.role) return;
                        setError(null);
                        const result = await updateTeamMember(m.id, { role: newRole });
                        if (!result.ok) {
                          setError(result.error);
                          return;
                        }
                        router.refresh();
                      }}
                    >
                      {!ROLES.includes(m.role as (typeof ROLES)[number]) && <option value={m.role}>{m.role}</option>}
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </Tooltip>
                ) : (
                  <p className="text-sm text-muted-foreground">{m.role}</p>
                )}
                {m.instrument && m.instrument !== m.role && (
                  <p className="text-xs text-muted-foreground">{m.instrument}</p>
                )}
                <div className="mt-1.5">
                  <MemberInviteStatus
                    member={m}
                    invite={inviteByMemberId.get(m.id)}
                    isLeader={isLeader}
                    isAdmin={isAdmin}
                  />
                </div>
              </div>
              {isAdmin && (
                <Tooltip content={`Remove ${m.name} from the team roster`}>
                  <button
                    onClick={async () => {
                      setError(null);
                      const result = await removeTeamMember(m.id);
                      if (!result.ok) {
                        setError(result.error);
                        return;
                      }
                      router.refresh();
                    }}
                    className="shrink-0 rounded-md p-2.5 text-muted-foreground hover:bg-danger/10 hover:text-danger"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </Tooltip>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {isLeader && openInvites.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Open invites</h2>
          <p className="text-xs text-muted-foreground">
            Not tied to a specific roster member yet — whoever opens the link gets added.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {openInvites.map((invite) => (
              <Card key={invite.id}>
                <CardContent className="flex items-center justify-between gap-2 pt-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{invite.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {invite.role} · expires {new Date(invite.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Tooltip content="Cancel this invite before it's accepted">
                    <button
                      onClick={async () => {
                        const result = await revokeInvite(invite.id);
                        if (result.ok) router.refresh();
                      }}
                      className="shrink-0 rounded-md p-2.5 text-muted-foreground hover:bg-danger/10 hover:text-danger"
                      aria-label="Revoke invite"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </Tooltip>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title="Add team member">
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!form.name.trim()) return;
            setSaving(true);
            setError(null);
            const result = await addTeamMember(form);
            if (!result.ok) {
              setError(result.error);
              setSaving(false);
              return;
            }
            setOpen(false);
            setForm({ name: "", role: ROLES[0], instrument: "" });
            router.refresh();
            setSaving(false);
          }}
        >
          <Input
            placeholder="Name"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Select
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground">
            Just their usual role — doesn&apos;t lock them in. Assign what they&apos;re actually
            playing for a specific service from that service&apos;s Worship Team card.
          </p>
          <Input
            placeholder="Instrument (optional)"
            value={form.instrument}
            onChange={(e) => setForm((f) => ({ ...f, instrument: e.target.value }))}
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Adding…" : "Add"}
          </Button>
        </form>
      </Dialog>
    </div>
  );
}
