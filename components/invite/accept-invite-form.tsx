"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { acceptInviteNewUser, acceptInviteExistingUser } from "@/lib/actions/invites";
import { useMounted } from "@/hooks/use-mounted";

export function AcceptInviteForm({
  token,
  email,
  userExists,
}: {
  token: string;
  email: string;
  userExists: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useMounted();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = userExists
      ? await acceptInviteExistingUser(token, password)
      : await acceptInviteNewUser(token, { name, password });
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="invite-accept-email">Email</Label>
        <Input id="invite-accept-email" value={email} disabled />
      </div>
      {!userExists && (
        <div className="space-y-1.5">
          <Label htmlFor="invite-accept-name">Your name</Label>
          <Input
            id="invite-accept-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Joel Martinez"
          />
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="invite-accept-password">
          {userExists ? "Password" : "Choose a password"}
        </Label>
        <Input
          id="invite-accept-password"
          type="password"
          required
          minLength={userExists ? undefined : 8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={userExists ? "••••••••" : "At least 8 characters"}
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading || !mounted}>
        {loading ? "Joining…" : userExists ? "Log in and join" : "Join the team"}
      </Button>
    </form>
  );
}
