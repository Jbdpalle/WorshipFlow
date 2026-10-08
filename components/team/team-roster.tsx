"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ChurchRole } from "@prisma/client";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { IconButton } from "@/components/ui/icon-button";
import { Status } from "@/components/ui/status";
import { TextLink } from "@/components/ui/text-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { ROLES } from "@/lib/songs/constants";
import { addTeamMember, removeTeamMember, updateTeamMember } from "@/lib/actions/team";
import { revokeInvite } from "@/lib/actions/invites";
import { InviteDialog } from "@/components/team/invite-dialog";
import { Tooltip } from "@/components/ui/tooltip";

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
        <span tabIndex={0}>
          <Status tone="success">Account active</Status>
        </span>
      </Tooltip>
    );
  }

  const isExpired = invite && invite.expiresAt < new Date();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {invite ? (
        <Tooltip
          content={
            isExpired
              ? "This invite link expired — resend to generate a new one"
              : `Invited ${invite.email} — not yet accepted. WorshipFlow invites are a link you share, not an email we send.`
          }
        >
          <span tabIndex={0}>
            <Status tone={isExpired ? "warning" : "info"}>
              {isExpired ? "Invitation expired" : "Invitation sent"}
            </Status>
          </span>
        </Tooltip>
      ) : (
        <Tooltip content="Added to the roster, but hasn't logged in or linked an account yet">
          <span tabIndex={0}>
            <Status tone="muted">No account yet</Status>
          </span>
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
            <button type="button" className="tap-target rounded-lg px-1 text-sm font-semibold text-primary hover:underline">
              {invite ? "Resend invitation" : "Invite"}
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
    return <p className="text-base font-bold">{member.name}</p>;
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
        <span className="text-base font-bold">{member.name}</span>
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
        {error ? <p role="alert" className="text-sm text-danger">{error}</p> : <span />}
        <div className="flex flex-wrap gap-2">
          {isLeader && <InviteDialog canGrantAdmin={isAdmin} />}
          {isLeader && (
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden /> Add team member
            </Button>
          )}
        </div>
      </div>

      {isLeader && (
        <p className="text-sm text-muted-foreground">
          Importing a schedule? <TextLink href="/roster" className="inline-flex">Go to Roster →</TextLink>
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {members.map((m) => (
          <Card key={m.id}>
            <CardContent className="flex items-start gap-3 pt-4">
              <Avatar name={m.name} size="lg" />
              <div className="min-w-0 flex-1 space-y-2">
                <MemberNameEditor member={m} isLeader={isLeader} />
                <div>
                <p className="label-caps">Plays</p>
                {isLeader ? (
                  <Tooltip content="Their usual role on the roster — not a per-service assignment. Picked the wrong instrument? Change it here instead of removing and re-adding.">
                    <select
                      value={m.role}
                      aria-label={`Change ${m.name}'s role`}
                      className="tap-target -ml-1 rounded-md bg-transparent px-1 text-sm font-semibold text-foreground hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring"
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
                  <p className="text-sm font-semibold">{m.role}</p>
                )}
                {m.instrument && m.instrument !== m.role && (
                  <p className="text-sm text-muted-foreground">{m.instrument}</p>
                )}
                </div>
                <div>
                  <p className="label-caps">Account</p>
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
                  <IconButton
                    label={`Remove ${m.name} from the team`}
                    tone="danger"
                    onClick={async () => {
                      setError(null);
                      const result = await removeTeamMember(m.id);
                      if (!result.ok) {
                        setError(result.error);
                        return;
                      }
                      router.refresh();
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                </Tooltip>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {isLeader && openInvites.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-bold">Open invites</h2>
          <p className="text-sm text-muted-foreground">
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
                    <IconButton
                      label={`Revoke invite for ${invite.email}`}
                      tone="danger"
                      onClick={async () => {
                        const result = await revokeInvite(invite.id);
                        if (result.ok) router.refresh();
                      }}
                    >
                      <X className="h-4 w-4" />
                    </IconButton>
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
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <Button loading={saving} type="submit" className="w-full" disabled={saving}>
            {saving ? "Adding…" : "Add"}
          </Button>
        </form>
      </Dialog>
    </div>
  );
}
