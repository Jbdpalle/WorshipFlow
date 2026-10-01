// pdf-parse (via pdfjs-dist) references the browser-only DOMMatrix API at
// module-evaluation time on Vercel's serverless runtime specifically — not
// reproducible under a plain `next start` process, where the reference is
// apparently never reached for plain text extraction. Importing this before
// "pdf-parse" guarantees the identifier exists so that load-time reference
// doesn't crash; real matrix math is never exercised since this app only
// calls getText(), never the canvas/rendering APIs that would need it.
if (typeof globalThis.DOMMatrix === "undefined") {
  (globalThis as { DOMMatrix?: unknown }).DOMMatrix = class DOMMatrix {};
}
