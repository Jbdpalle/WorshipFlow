"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, UserRound } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { ROLES } from "@/lib/songs/constants";
import { addTeamMember, removeTeamMember } from "@/lib/actions/team";
import { ImportRosterDialog } from "@/components/team/import-roster-dialog";

type Member = {
  id: string;
  name: string;
  role: string;
  instrument: string | null;
  bio: string | null;
  userId: string | null;
};

export function TeamRoster({ members }: { members: Member[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", role: ROLES[0] as string, instrument: "" });

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <ImportRosterDialog />
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Add Team Member
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((m) => (
          <Card key={m.id}>
            <CardContent className="flex items-start gap-3 pt-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                <UserRound className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{m.name}</p>
                <p className="text-sm text-muted-foreground">{m.role}</p>
                {m.instrument && m.instrument !== m.role && (
                  <p className="text-xs text-muted-foreground">{m.instrument}</p>
                )}
                {!m.userId && <p className="mt-1 text-xs text-muted-foreground">Roster only — no login</p>}
              </div>
              <button
                onClick={async () => {
                  await removeTeamMember(m.id);
                  router.refresh();
                }}
                className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-danger/10 hover:text-danger"
                aria-label="Remove"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} title="Add team member">
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!form.name.trim()) return;
            setSaving(true);
            await addTeamMember(form);
            setSaving(false);
            setOpen(false);
            setForm({ name: "", role: ROLES[0], instrument: "" });
            router.refresh();
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
          <Input
            placeholder="Instrument (optional)"
            value={form.instrument}
            onChange={(e) => setForm((f) => ({ ...f, instrument: e.target.value }))}
          />
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Adding…" : "Add"}
          </Button>
        </form>
      </Dialog>
    </div>
  );
}
