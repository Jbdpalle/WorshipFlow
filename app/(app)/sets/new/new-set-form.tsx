"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Sparkles } from "lucide-react";
import { createSet } from "@/lib/actions/sets";
import { useMounted } from "@/hooks/use-mounted";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EVENT_TYPES, type EventTypeValue } from "@/lib/songs/constants";
import { cn } from "@/lib/utils/cn";

export function NewSetForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState<EventTypeValue>("SERVICE");
  const [theme, setTheme] = useState("");
  const [verses, setVerses] = useState("");
  const [keywords, setKeywords] = useState("");
  const [serviceDate, setServiceDate] = useState("");
  const [location, setLocation] = useState("");
  const [church, setChurch] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [leaderName, setLeaderName] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useMounted();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Give your set a title.");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await createSet({
      title,
      eventType,
      theme,
      keywords,
      verses: verses.split("\n").map((v) => v.trim()).filter(Boolean),
      serviceDate: serviceDate || undefined,
      location,
      church,
      serviceType,
      leaderName,
    });
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.push(`/sets/${result.data.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-24 sm:pb-0">
      <Card>
        <CardHeader>
          <CardTitle>Start a new service</CardTitle>
          <CardDescription>Just the essentials — you can fill in the rest later.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sunday Worship"
              autoFocus
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eventType">Event type</Label>
            <Select id="eventType" value={eventType} onChange={(e) => setEventType(e.target.value as EventTypeValue)}>
              {EVENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 p-4 text-left"
          aria-expanded={moreOpen}
        >
          <span>
            <span className="block font-semibold">Add more context</span>
            <span className="block text-sm text-muted-foreground">
              Date, location, worship leader, theme, scripture, and keywords — optional.
            </span>
          </span>
          <ChevronDown className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform", moreOpen && "rotate-180")} />
        </button>

        {moreOpen && (
          <CardContent className="space-y-6 border-t border-border pt-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="serviceDate">Date</Label>
                <Input id="serviceDate" type="date" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="serviceType">Sub-type / label</Label>
                <Input id="serviceType" value={serviceType} onChange={(e) => setServiceType(e.target.value)} placeholder="Sunday Worship Service" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="location">Location</Label>
                <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Main Auditorium" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="church">Church</Label>
                <Input id="church" value={church} onChange={(e) => setChurch(e.target.value)} placeholder="Grace Community Church" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="leaderName">Worship leader</Label>
                <Input id="leaderName" value={leaderName} onChange={(e) => setLeaderName(e.target.value)} placeholder="Joel" />
              </div>
            </div>

            <div className="space-y-4 border-t border-border pt-5">
              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-musical" />
                A theme and scripture here feed the song-category suggestions on the next screen —
                you stay in control of what actually makes the set.
              </p>
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
            </div>
          </CardContent>
        )}
      </Card>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-surface/95 p-4 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none md:bottom-0">
        <div className="mx-auto flex max-w-2xl justify-end">
          <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={loading || !mounted}>
            {loading ? "Creating…" : "Create Service"}
          </Button>
        </div>
      </div>
    </form>
  );
}
