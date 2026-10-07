// Shared identity rule for "is this the same person, spelled slightly
// differently" — case/whitespace-insensitive only. Deliberately does NOT
// do fuzzy/nickname matching ("KK" vs "Karthik"): guessing that two
// different-looking names are the same real person risks merging two
// actually-different people's assignments, which is worse than leaving a
// true nickname duplicate for a human to rename on the Team page.
export function normalizeMemberName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export type NameGroup<T extends { id: string; name: string }> = {
  name: string; // display name, from the first member in the group
  ids: string[];
  members: T[];
};

// Collapses team members that share an identical (normalized) name into
// one group, in first-seen order. Used everywhere a member picker or
// by-name grouping renders — a roster-import that created two TeamMember
// rows for the same person (e.g. a re-import that didn't exactly match)
// should still show that person once, with their assignments merged
// across both rows, not duplicated or silently split between them.
export function groupMembersByName<T extends { id: string; name: string }>(members: T[]): NameGroup<T>[] {
  const order: string[] = [];
  const groups = new Map<string, T[]>();
  for (const m of members) {
    const key = normalizeMemberName(m.name);
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(m);
  }
  return order.map((key) => {
    const list = groups.get(key)!;
    return { name: list[0].name, ids: list.map((m) => m.id), members: list };
  });
}
