"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { EmptyState } from "@/components/ui/empty-state";
import { SetCard } from "@/components/sets/set-card";
import { CalendarX } from "lucide-react";
import { eventTypeLabel } from "@/lib/songs/constants";
import { groupMembersByName, normalizeMemberName } from "@/lib/songs/member-name";
import type { SetsPageEntry } from "@/lib/dashboard/data";

type TeamMemberOption = { id: string; name: string; role: string };
type View = "date" | "leader" | "member";

function formatDate(date: Date | null) {
  return date
    ? date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })
    : "No date set";
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="label-caps">{children}</h2>;
}

function DateView({ entries }: { entries: SetsPageEntry[] }) {
  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = entries
    .filter((e) => e.serviceDate && e.serviceDate >= today)
    .sort((a, b) => a.serviceDate!.getTime() - b.serviceDate!.getTime());
  const undated = entries.filter((e) => !e.serviceDate);
  const past = entries
    .filter((e) => e.serviceDate && e.serviceDate < today)
    .sort((a, b) => b.serviceDate!.getTime() - a.serviceDate!.getTime());

  const grid = "grid gap-4 md:grid-cols-2";

  return (
    <div className="space-y-8">
      {upcoming.length > 0 && (
        <section className="space-y-3">
          <SectionLabel>Upcoming</SectionLabel>
          <div className={grid}>
            {upcoming.map((e, i) => (
              <SetCard key={e.id} entry={e} now={now} highlight={i === 0} />
            ))}
          </div>
        </section>
      )}
      {undated.length > 0 && (
        <section className="space-y-3">
          <SectionLabel>No date set</SectionLabel>
          <div className={grid}>
            {undated.map((e) => (
              <SetCard key={e.id} entry={e} now={now} />
            ))}
          </div>
        </section>
      )}
      {past.length > 0 && (
        <section className="space-y-3">
          <SectionLabel>Past</SectionLabel>
          <div className={grid}>
            {past.map((e) => (
              <SetCard key={e.id} entry={e} now={now} muted />
            ))}
          </div>
        </section>
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
        <ul className="divide-y divide-border">
          {rows.map(({ entry, roles }) => (
            <li key={entry.id} className="flex items-center justify-between gap-2 text-sm">
              <Link href={`/sets/${entry.id}`} className="inline-flex min-h-11 items-center hover:text-primary hover:underline">
                {entryLabel(entry)}
              </Link>
              <span className="flex shrink-0 gap-1">
                {roles.map((role) => (
                  <Badge key={role} variant="musical">
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

  return (
    <div className="space-y-5">
      <SegmentedControl
        label="Group sets"
        value={view}
        onChange={setView}
        options={[
          { value: "date", label: "By date" },
          { value: "leader", label: "By leader" },
          { value: "member", label: "By member" },
        ]}
      />

      {entries.length === 0 ? (
        <EmptyState
          icon={CalendarX} stage="plan"
          title="Nothing here yet"
          description="Sets you create will appear here, grouped the way you choose above."
        />
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
