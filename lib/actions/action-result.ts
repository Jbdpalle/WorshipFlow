// Next.js strips the message off anything a Server Action throws once it
// reaches a production build — only an opaque digest crosses the wire (the
// client shows "Minified React error #441" with no way to recover the real
// text). Returning a result object instead sidesteps that entirely, since
// normal return values aren't subject to the same stripping.
export type ActionResult = { ok: true } | { ok: false; error: string };
export type ActionResultData<T> = { ok: true; data: T } | { ok: false; error: string };

// A previous sweep converted every throw *inside* each action's own logic
// to one of the return types above. It missed the one thing every single
// action calls before any of that logic runs: requireUser(), which does a
// live DB lookup (session -> user -> church memberships) with nothing
// guarding it. Any transient failure there (a DB blip, a connection-pool
// hiccup under load — exactly what a bulk PDF import batch can trigger)
// still throws straight out of the action uncaught, and production strips
// it to the same opaque #441 again — for every file in the batch at once,
// since the whole action call fails before per-file handling ever starts.
//
// This wraps the entire body of every action as a last-resort backstop, so
// no future gap (auth, a helper, anything) can reopen this class of bug
// again. unstable_rethrow lets Next's own internal control-flow throws
// (redirect(), notFound()) pass through untouched — only genuine errors
// get caught and turned into a normal, displayable result.
import { unstable_rethrow } from "next/navigation";

export async function runAction<R extends { ok: boolean }>(fn: () => Promise<R>): Promise<R> {
  try {
    return await fn();
  } catch (err) {
    unstable_rethrow(err);
    console.error("Server action failed:", err);
    return { ok: false, error: "Something went wrong — please try again." } as unknown as R;
  }
}
