import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WorshipFlow",
  description:
    "WorshipFlow — plan worship sets, arrange songs, and run rehearsals your whole team can follow.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
