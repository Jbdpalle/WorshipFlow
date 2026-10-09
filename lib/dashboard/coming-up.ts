export type ComingUpRow = {
  id: string;
  rawDate: Date | null;
  date: string;
  title: string;
  sub: string;
};

// `following` (the Sunday after next) and `thisWeek` (anything else coming
// up within 7 days, any event type) are two independent dashboard queries —
// nothing guarantees `following` is actually the soonest of the two. A
// nearer rehearsal/camp set in thisWeek must still show above it, so the
// "Coming up" card sorts the combined list by actual date rather than
// trusting "following first, then thisWeek" concatenation order. Rows with
// no date sort last, after every dated row.
export function sortComingUpRows<T extends { rawDate: Date | null }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    if (!a.rawDate && !b.rawDate) return 0;
    if (!a.rawDate) return 1;
    if (!b.rawDate) return -1;
    return a.rawDate.getTime() - b.rawDate.getTime();
  });
}
