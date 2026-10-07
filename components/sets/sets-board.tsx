"use client";

import { useState } from "react";
import { useMemo } from "react";
import Link from "next/link";
import { ListMusic, CalendarDays, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { eventTypeLabel } from "@/lib/songs/constants";
import { groupMembersByName, normalizeMemberName } from "@/lib/songs/member-name";
import type { SetsPageEntry } from "@/lib/dashboard/data";
import { cn } from "@/lib/utils/cn";

type TeamMemberOption = { id: string; name: string; role: string };
type View = "date" | "leader" | "member";

function formatDate(date: Date | null) {
  return date
    ? date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })
    : "No date set";
}

function SetCard({ entry, muted }: { entry: SetsPageEntry; muted?: boolean }) {
  return (
    <Link href={`/sets/${entry.id}`}>
      <Card className={cn("h-full transition-shadow hover:shadow-md", muted && "border-dashed bg-surface-muted/60 shadow-none hover:shadow-none")}>
        <CardContent className="space-y-3 pt-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className={cn("font-semibold", muted && "text-muted-foreground")}>{entry.title}</h3>
            {entry.theme && <Badge variant={muted ? "default" : "accent"}>{entry.theme}</Badge>}
          </div>
          <Badge variant="outline">{eventTypeLabel(entry.eventType)}</Badge>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDate(entry.serviceDate)}
            </span>
            <span className="flex items-center gap-1">
              <ListMusic className="h-3.5 w-3.5" />
              {entry.songCount} song{entry.songCount === 1 ? "" : "s"}
            </span>
            {entry.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {entry.location}
              </span>
            )}
          </div>
          {entry.roster.length > 0 && (
            <p className="truncate text-xs text-muted-foreground">
              {entry.roster.map((r) => r.name).join(", ")}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function DateView({ entries }: { entries: SetsPageEntry[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = entries
    .filter((e) => e.serviceDate && e.serviceDate >= today)
    .sort((a, b) => a.serviceDate!.getTime() - b.serviceDate!.getTime());
  const undated = entries.filter((e) => !e.serviceDate);
  const past = entries
    .filter((e) => e.serviceDate && e.serviceDate < today)
    .sort((a, b) => b.serviceDate!.getTime() - a.serviceDate!.getTime());

  return (
    <div className="space-y-8">
      {upcoming.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Upcoming</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((e) => (
              <SetCard key={e.id} entry={e} />
            ))}
          </div>
        </section>
      )}
      {undated.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">No Date Set</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {undated.map((e) => (
              <SetCard key={e.id} entry={e} />
            ))}
          </div>
        </section>
      )}
      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Past</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {past.map((e) => (
              <SetCard key={e.id} entry={e} muted />
            ))}
          </div>
        </section>
      )}
      {upcoming.length === 0 && undated.length === 0 && past.length === 0 && (
        <p className="text-sm text-muted-foreground">Nothing here yet.</p>
      )}
    </div>
  );
}

function sortByDateAsc(entries: SetsPageEntry[]) {
  return [...entries].sort((a, b) => {
    if (!a.serviceDate && !b.serviceDate) return 0;
    if (!a.serviceDate) return 1;
    if (!b.serviceDate) return -1;
    return a.serviceDate.getTime() - b.serviceDate.getTime();
  });
}

function entryLabel(entry: SetsPageEntry) {
  return `${formatDate(entry.serviceDate)} — ${entry.title}`;
}

function ByLeaderView({ entries }: { entries: SetsPageEntry[] }) {
  // Keyed by normalized name so a leader entered with different
  // casing/whitespace across two roster rows still groups under one
  // heading — same rule as ByMemberView below.
  const byLeader = new Map<string, { displayName: string; list: SetsPageEntry[] }>();
  const unassigned: SetsPageEntry[] = [];
  for (const entry of sortByDateAsc(entries)) {
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
    return <p className="text-sm text-muted-foreground">No sets yet.</p>;
  }

  return (
    <div className="space-y-4">
      {[...byLeader.entries()].map(([key, group]) => (
        <section key={key}>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Worship Leader: {group.displayName}
          </h3>
          <ul className="mt-2 space-y-1.5">
            {group.list.map((e) => (
              <li key={e.id} className="text-sm">
                <Link href={`/sets/${e.id}`} className="hover:text-accent">
                  {entryLabel(e)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {unassigned.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">No leader assigned</h3>
          <ul className="mt-2 space-y-1.5">
            {unassigned.map((e) => (
              <li key={e.id} className="text-sm">
                <Link href={`/sets/${e.id}`} className="hover:text-accent">
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

function ByMemberView({ entries, members }: { entries: SetsPageEntry[]; members: TeamMemberOption[] }) {
  // See the matching comment in components/roster/roster-board.tsx —
  // two TeamMember rows can share one real person's name; group by name
  // so they show up once, with assignments merged across every id in
  // the group.
  const groups = groupMembersByName(members);
  const [selectedName, setSelectedName] = useState(groups[0]?.name ?? "");
  const group = groups.find((g) => g.name === selectedName);
  const groupIds = new Set(group?.ids ?? []);

  const sorted = sortByDateAsc(entries);
  const rows = sorted
    .map((e) => {
      const roles = e.setTeamMembers.filter((m) => groupIds.has(m.teamMember.id)).map((m) => m.role);
      return { entry: e, roles: [...new Set(roles)] };
    })
    .filter((r) => r.roles.length > 0);

  if (groups.length === 0) return <p className="text-sm text-muted-foreground">No team members yet.</p>;

  return (
    <div className="space-y-3">
      <Select value={selectedName} onChange={(e) => setSelectedName(e.target.value)} className="max-w-xs">
        {groups.map((g) => (
          <option key={g.name} value={g.name}>
            {g.name}
          </option>
        ))}
      </Select>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No sets scheduled for this person.</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map(({ entry, roles }) => (
            <li key={entry.id} className="flex items-baseline justify-between gap-2 text-sm">
              <Link href={`/sets/${entry.id}`} className="hover:text-accent">
                {entryLabel(entry)}
              </Link>
              <span className="flex shrink-0 gap-1">
                {roles.map((role) => (
                  <Badge key={role} variant="accent">
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

export function SetsBoard({ entries, members }: { entries: SetsPageEntry[]; members: TeamMemberOption[] }) {
  const [view, setView] = useState<View>("date");
  const views = useMemo(() => ["date", "leader", "member"] as View[], []);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <div className="flex gap-1 rounded-lg bg-surface-muted p-1">
          {views.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                "tap-target rounded-md px-3 text-xs font-medium",
                view === v ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground",
              )}
            >
              {v === "date" ? "By Date" : v === "leader" ? "By Leader" : "By Member"}
            </button>
          ))}
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing here yet.</p>
      ) : view === "date" ? (
        <DateView entries={entries} />
      ) : view === "leader" ? (
        <ByLeaderView entries={entries} />
      ) : (
        <ByMemberView entries={entries} members={members} />
      )}
    </div>
  );
}
