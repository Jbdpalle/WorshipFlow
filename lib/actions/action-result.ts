// Next.js strips the message off anything a Server Action throws once it
// reaches a production build — only an opaque digest crosses the wire (the
// client shows "Minified React error #441" with no way to recover the real
// text). Returning a result object instead sidesteps that entirely, since
// normal return values aren't subject to the same stripping.
export type ActionResult = { ok: true } | { ok: false; error: string };
export type ActionResultData<T> = { ok: true; data: T } | { ok: false; error: string };
