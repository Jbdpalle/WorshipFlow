"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarPlus, Copy, ClipboardList, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Status } from "@/components/ui/status";
import { EmptyState } from "@/components/ui/empty-state";
import { SetTeam } from "@/components/setlist/set-team";
import { ServiceRosterList } from "@/components/dashboard/service-roster-list";
import { eventTypeLabel } from "@/lib/songs/constants";
import { generateWeeklyServices, copyRosterToSet } from "@/lib/actions/roster";
import { groupMembersByName, normalizeMemberName } from "@/lib/songs/member-name";
import type { RosterPageEntry } from "@/lib/dashboard/data";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type TeamMemberOption = { id: string; name: string; role: string };
type View = "date" | "leader" | "member";

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

// Auto-generated service titles are just the formatted date — don't repeat
// it; only show a real, distinct title (e.g. one typed via /sets/new).
function entryLabel(entry: RosterPageEntry) {
  const date = formatDate(entry.serviceDate);
  return entry.title === date ? date : `${date} — ${entry.title}`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
function weeksFromTodayIso(weeks: number) {
  const d = new Date();
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}

function PlanRosterPanel() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(todayIso());
  const [end, setEnd] = useState(weeksFromTodayIso(12));
  const [weekday, setWeekday] = useState("0");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <CalendarPlus className="h-4 w-4" aria-hidden /> Plan roster
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Plan roster</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Generate a service for every {WEEKDAYS[Number(weekday)]} in this range. Dates that already have a
          service are left alone — safe to run again.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="roster-start">Start</Label>
            <Input id="roster-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="roster-end">End</Label>
            <Input id="roster-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="roster-weekday">Day of week</Label>
            <Select id="roster-weekday" value={weekday} onChange={(e) => setWeekday(e.target.value)}>
              {WEEKDAYS.map((w, i) => (
                <option key={w} value={i}>
                  {w}
                </option>
              ))}
            </Select>
          </div>
        </div>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        {summary && <p role="status" className="text-sm text-success">{summary}</p>}
        <div className="flex gap-2">
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              setSummary(null);
              const result = await generateWeeklyServices({ startDate: start, endDate: end, weekday: Number(weekday) });
              setBusy(false);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              const { created, skippedExisting, limitReachedAfter } = result.data;
              const parts = [`${created.length} service${created.length === 1 ? "" : "s"} created`];
              if (skippedExisting > 0) parts.push(`${skippedExisting} already existed`);
              if (limitReachedAfter !== null) parts.push("stopped early — plan limit reached");
              setSummary(parts.join(", ") + ".");
              router.refresh();
            }}
          >
            {busy ? "Generating…" : "Generate"}
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DateCard({
  entry,
  nextEntryId,
  isNext,
  members,
  isLeader,
}: {
  entry: RosterPageEntry;
  nextEntryId: string | null;
  isNext: boolean;
  members: TeamMemberOption[];
  isLeader: boolean;
}) {
  const router = useRouter();
  const [copying, setCopying] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  // Collapsed by default: a plain name/role summary (same as every other
  // Dashboard roster view), not the full assign/remove editor — a list of
  // many upcoming services shouldn't force every card open into edit mode.
  // Leaders expand the one card they actually need to change.
  const [editing, setEditing] = useState(false);
  const hasLeader = entry.roster.some((r) => r.role === "Worship Leader");

  return (
    <Card className={isNext ? "border-primary/60" : undefined}>
      <CardHeader className="space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base font-bold">{formatDate(entry.serviceDate)}</CardTitle>
          <span className="flex items-center gap-1.5">
            {isNext && <Badge variant="primary">Next up</Badge>}
            {entry.eventType !== "SERVICE" && <Badge variant="outline">{eventTypeLabel(entry.eventType)}</Badge>}
          </span>
        </div>
        <Link
          href={`/sets/${entry.id}`}
          className="flex min-h-9 max-w-full items-center truncate text-sm font-semibold text-primary hover:underline"
        >
          {entry.title === formatDate(entry.serviceDate) ? "View service →" : entry.title}
        </Link>
        {isLeader && !hasLeader && (
          <div>
            <Status tone="warning">Worship leader not assigned</Status>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {editing ? (
          <div className="space-y-2">
            <SetTeam setId={entry.id} members={entry.setTeamMembers} teamMembers={members} isLeader={isLeader} />
            {isLeader && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
                Done
              </Button>
            )}
          </div>
        ) : entry.roster.length > 0 ? (
          <div className="space-y-2">
            <ServiceRosterList roster={entry.roster} setId={entry.id} canManage={false} />
            {isLeader && (
              <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit roster
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">No team assigned yet.</p>
            {isLeader && (
              <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="h-3.5 w-3.5" aria-hidden /> Assign team
              </Button>
            )}
          </div>
        )}
        {isLeader && entry.setTeamMembers.length > 0 && nextEntryId && (
          <div>
            <Button loading={copying}
              variant="outline"
              disabled={copying}
              onClick={async () => {
                setCopying(true);
                setCopyError(null);
                const result = await copyRosterToSet(entry.id, nextEntryId);
                setCopying(false);
                if (!result.ok) {
                  setCopyError(result.error);
                  return;
                }
                router.refresh();
              }}
            >
              <Copy className="h-4 w-4" aria-hidden /> {copying ? "Copying…" : "Copy to next service"}
            </Button>
            {copyError && <p role="alert" className="mt-1 text-sm text-danger">{copyError}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ByLeaderView({ entries }: { entries: RosterPageEntry[] }) {
  // Keyed by normalized name (not the raw string) so a leader whose name
  // was entered with different casing/whitespace across two roster rows
  // still groups under one heading — same rule as ByMemberView below.
  const byLeader = new Map<string, { displayName: string; list: RosterPageEntry[] }>();
  const unassigned: RosterPageEntry[] = [];
  for (const entry of entries) {
    const leader = entry.roster.find((r) => r.role === "Worship Leader")?.name;
    if (!leader) {
      unassigned.push(entry);
      continue;
    }
    const key = normalizeMemberName(leader);
    const group = byLeader.get(key) ?? { displayName: leader, list: [] };
    group.list.push(entry);
    byLeader.set(key, group);
  }

  if (byLeader.size === 0 && unassigned.length === 0) {
    return <p className="text-sm text-muted-foreground">No upcoming services yet.</p>;
  }

  return (
    <div className="space-y-4">
      {[...byLeader.entries()].map(([key, group]) => (
        <section key={key}>
          <h3 className="label-caps">
            Worship Leader: {group.displayName}
          </h3>
          <ul className="mt-1 divide-y divide-border">
            {group.list.map((e) => (
              <li key={e.id} className="text-sm">
                <Link href={`/sets/${e.id}`} className="inline-flex min-h-11 items-center hover:text-primary hover:underline">
                  {entryLabel(e)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {unassigned.length > 0 && (
        <section>
          <h3 className="label-caps">No leader assigned</h3>
          <ul className="mt-1 divide-y divide-border">
            {unassigned.map((e) => (
              <li key={e.id} className="text-sm">
                <Link href={`/sets/${e.id}`} className="inline-flex min-h-11 items-center hover:text-primary hover:underline">
                  {entryLabel(e)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ByMemberView({ entries, members }: { entries: RosterPageEntry[]; members: TeamMemberOption[] }) {
  // Two TeamMember rows can share one real person's name (most often a
  // roster import that didn't exactly match an existing row) — group by
  // name so they appear once here, with assignments merged across every
  // id in the group rather than split or hidden behind whichever id
  // happens to be selected.
  const groups = groupMembersByName(members);
  const [selectedName, setSelectedName] = useState("");
  const group = groups.find((g) => g.name === selectedName);
  const groupIds = new Set(group?.ids ?? []);

  const rows = entries
    .map((e) => {
      const roles = e.setTeamMembers.filter((m) => groupIds.has(m.teamMember.id)).map((m) => m.role);
      return { entry: e, roles: [...new Set(roles)] };
    })
    .filter((r) => r.roles.length > 0);

  if (groups.length === 0) return <p className="text-sm text-muted-foreground">No team members yet.</p>;

  return (
    <div className="space-y-3">
      <Select value={selectedName} onChange={(e) => setSelectedName(e.target.value)} className="max-w-xs">
        <option value="" disabled>
          Select a team member…
        </option>
        {groups.map((g) => (
          <option key={g.name} value={g.name}>
            {g.name}
          </option>
        ))}
      </Select>
      {!selectedName ? (
        <p className="text-sm text-muted-foreground">Choose a team member above to see their upcoming services.</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No upcoming services scheduled for this person.</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map(({ entry, roles }) => (
            <li key={entry.id} className="flex items-center justify-between gap-2 text-sm">
              <Link href={`/sets/${entry.id}`} className="inline-flex min-h-11 items-center hover:text-primary hover:underline">
                {entryLabel(entry)}
              </Link>
              <span className="flex shrink-0 gap-1">
                {roles.map((role) => (
                  <Badge key={role} variant="primary">
                    {role}
                  </Badge>
                ))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function RosterBoard({
  entries,
  members,
  isLeader,
}: {
  entries: RosterPageEntry[];
  members: TeamMemberOption[];
  isLeader: boolean;
}) {
  const [view, setView] = useState<View>("date");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {isLeader ? <PlanRosterPanel /> : <span />}
        <SegmentedControl
          label="Group roster"
          value={view}
          onChange={setView}
          options={[
            { value: "date", label: "By date" },
            { value: "leader", label: "By leader" },
            { value: "member", label: "By member" },
          ]}
        />
      </div>

      {entries.length === 0 ? (
        <EmptyState
          icon={ClipboardList} stage="assign"
          title="No upcoming services"
          description={isLeader ? "Use Plan roster to create a service for every Sunday in a range, then assign who is serving." : "Your worship leader hasn't scheduled anything yet. Check back soon."}
        />
      ) : view === "date" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {entries.map((entry, i) => (
            <DateCard
              key={entry.id}
              entry={entry}
              nextEntryId={entries[i + 1]?.id ?? null}
              isNext={i === 0}
              members={members}
              isLeader={isLeader}
            />
          ))}
        </div>
      ) : view === "leader" ? (
        <ByLeaderView entries={entries} />
      ) : (
        <ByMemberView entries={entries} members={members} />
      )}
    </div>
  );
}
