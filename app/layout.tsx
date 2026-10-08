import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";
import { RegisterServiceWorker } from "@/components/pwa/register-sw";
import { InstallPrompt } from "@/components/pwa/install-prompt";

// One family for the whole product (see DESIGN_SYSTEM.md). Self-hosted at
// build time by next/font; --font-figtree feeds --font-sans in globals.css.
const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WorshipFlow",
  description:
    "WorshipFlow — plan worship sets, arrange songs, and run rehearsals your whole team can follow.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "WorshipFlow",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f0ea" },
    { media: "(prefers-color-scheme: dark)", color: "#16181a" },
  ],
};

// Runs before first paint so an explicit light/dark choice (saved by the
// Appearance toggle — see lib/theme/use-theme.ts) applies immediately
// instead of flashing the OS-preferred theme first. Reading localStorage
// before hydration is exactly why this has to be a plain inline script
// rather than a React effect.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var t = localStorage.getItem("worshipflow-theme");
    if (t === "light" || t === "dark") {
      document.documentElement.setAttribute("data-theme", t);
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={figtree.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="antialiased">
        {children}
        <RegisterServiceWorker />
        <InstallPrompt />
      </body>
    </html>
  );
}
