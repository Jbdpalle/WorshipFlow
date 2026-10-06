"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useMounted } from "@/hooks/use-mounted";
import { convertDemoToFree } from "@/lib/actions/demo-conversion";

export function DemoConversionForm({ defaultName }: { defaultName: string }) {
  const router = useRouter();
  const [name, setName] = useState(defaultName === "Guest Worship Leader" ? "" : defaultName);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useMounted();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await convertDemoToFree({ name, email, password });
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Free Account</CardTitle>
        <CardDescription>Set a real email and password — everything else stays as it is.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="de-name">Your name</Label>
            <Input id="de-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Joel Martinez" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="de-email">Email</Label>
            <Input
              id="de-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@church.org"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="de-password">Choose a password</Label>
            <Input
              id="de-password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading || !mounted}>
            {loading ? "Creating your account…" : "Create Free Account"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
