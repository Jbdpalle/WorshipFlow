"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSet } from "@/lib/actions/sets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function NewSetForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState("");
  const [verses, setVerses] = useState("");
  const [keywords, setKeywords] = useState("");
  const [serviceDate, setServiceDate] = useState("");
  const [church, setChurch] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [leaderName, setLeaderName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Give your set a title.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const set = await createSet({
        title,
        theme,
        keywords,
        verses: verses.split("\n").map((v) => v.trim()).filter(Boolean),
        serviceDate: serviceDate || undefined,
        church,
        serviceType,
        leaderName,
      });
      router.push(`/sets/${set.id}`);
    } catch {
      setError("Something went wrong creating the set.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Set details</CardTitle>
          <CardDescription>The basics — title and, if you have one, a service date.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sunday Worship" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="serviceDate">Service date</Label>
            <Input id="serviceDate" type="date" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="serviceType">Service type</Label>
            <Input id="serviceType" value={serviceType} onChange={(e) => setServiceType(e.target.value)} placeholder="Sunday Worship Service" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="church">Church</Label>
            <Input id="church" value={church} onChange={(e) => setChurch(e.target.value)} placeholder="Grace Community Church" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="leaderName">Worship leader</Label>
            <Input id="leaderName" value={leaderName} onChange={(e) => setLeaderName(e.target.value)} placeholder="Joel" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Theme &amp; direction</CardTitle>
          <CardDescription>
            This feeds the song-category suggestions on the next screen. You stay in control of what actually makes the set.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="theme">Theme</Label>
            <Input id="theme" value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="LOVE" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="verses">Bible verses (one per line)</Label>
            <Textarea
              id="verses"
              value={verses}
              onChange={(e) => setVerses(e.target.value)}
              placeholder={"1 Corinthians 13:4-8\nJohn 3:16\nRomans 5:8"}
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="keywords">Keywords (comma separated)</Label>
            <Input
              id="keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="Love, Grace, Sacrifice, Cross, Mercy"
            />
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Creating…" : "Create Worship Set"}
        </Button>
      </div>
    </form>
  );
}
