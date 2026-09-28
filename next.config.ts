import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: false,
  // pdf-parse (via pdfjs-dist) resolves its worker script relative to its
  // own file on disk at runtime; bundling it breaks that resolution, so it
  // must run as a real Node require instead of being bundled.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
