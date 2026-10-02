"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Music4 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useMounted } from "@/hooks/use-mounted";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const mounted = useMounted();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Unable to log in.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function handleDemo() {
    setError(null);
    setDemoLoading(true);
    const res = await fetch("/api/auth/demo", { method: "POST" });
    setDemoLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Unable to start the demo. Please try again.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
            <Music4 className="h-6 w-6" />
          </span>
          <h1 className="text-xl font-semibold">WorshipFlow</h1>
          <p className="text-sm text-muted-foreground">
            Plan the set. Arrange the songs. Rehearse with clarity.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Log in</CardTitle>
            <CardDescription>Welcome back — pick up where your team left off.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@church.org"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading || !mounted}>
                {loading ? "Logging in…" : "Log in"}
              </Button>
            </form>

            <div className="relative py-1 text-center text-xs text-muted-foreground">
              <span className="bg-surface px-2">or</span>
              <div className="absolute inset-x-0 top-1/2 -z-10 border-t border-border" />
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleDemo}
              disabled={demoLoading}
            >
              {demoLoading ? "Starting demo…" : "Try the demo — no signup"}
            </Button>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link href="/signup" className="font-medium text-accent">
            Create a worship team
          </Link>
        </p>
      </div>
    </div>
  );
}
