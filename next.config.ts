import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: false,
  // pdf-parse (via pdfjs-dist) resolves its worker script relative to its
  // own file on disk at runtime; bundling it breaks that resolution, so it
  // must run as a real Node require instead of being bundled.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  // Being external isn't enough on its own: Vercel's automatic file tracing
  // statically follows import/require, but pdfjs-dist loads its worker
  // script (pdf.worker.mjs) via a runtime-computed path, which tracing
  // can't see — the file was silently missing from the deployed function,
  // producing "Setting up fake worker failed: Cannot find module
  // .../pdfjs-dist/legacy/build/pdf.worker.mjs" only in production.
  outputFileTracingIncludes: {
    "/songs": ["./node_modules/pdfjs-dist/**/*"],
  },
  experimental: {
    // Default is 1MB, which a real bulk PDF import (dozens of chord charts
    // in one request) blows past easily. The bulk-import dialog also
    // chunks its own requests, so this is a generous ceiling, not the only
    // safeguard.
    serverActions: { bodySizeLimit: "8mb" },
  },
};

export default nextConfig;
