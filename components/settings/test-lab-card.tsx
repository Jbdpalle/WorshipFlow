"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { enterTestLab, leaveTestLab, createTestSets, resetTestLab } from "@/lib/actions/test-lab";

// Only rendered for the two owner accounts (the page checks, and every
// action re-checks on the server).
export function TestLabCard({ inLab }: { inLab: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [setIds, setSetIds] = useState<string[]>([]);
  const [confirmReset, setConfirmReset] = useState(false);

  async function run(name: string, fn: () => Promise<{ ok: boolean; error?: string }>, done: string) {
    setBusy(name);
    setError(null);
    setMessage(null);
    const result = await fn();
    setBusy(null);
    if (!result.ok) {
      setError(result.error ?? "Something went wrong.");
      return false;
    }
    setMessage(done);
    router.refresh();
    return true;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FlaskConical className="h-4 w-4" aria-hidden /> Test Lab
        </CardTitle>
        <CardDescription>
          A separate, private church for testing. Only the two WorshipFlow owner accounts can see it — nobody else on any
          team can, and nobody can be invited to it. Its band members are roster entries with no login.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!inLab ? (
          <Button loading={busy === "enter"} onClick={() => run("enter", enterTestLab, "You're in the Test Lab.")}>
            Enter Test Lab
          </Button>
        ) : (
          <>
            <p className="text-sm font-semibold text-success">You are in the Test Lab — nothing here is real data.</p>
            <div className="flex flex-wrap gap-2">
              <Button
                loading={busy === "one"}
                onClick={async () => {
                  setBusy("one");
                  setError(null);
                  const r = await createTestSets(1);
                  setBusy(null);
                  if (!r.ok) return setError(r.error);
                  setSetIds(r.data.ids);
                  setMessage("Created 1 test set.");
                  router.refresh();
                }}
              >
                Create test set
              </Button>
              <Button
                variant="secondary"
                loading={busy === "three"}
                onClick={async () => {
                  setBusy("three");
                  setError(null);
                  const r = await createTestSets(3);
                  setBusy(null);
                  if (!r.ok) return setError(r.error);
                  setSetIds(r.data.ids);
                  setMessage("Created 3 test sets.");
                  router.refresh();
                }}
              >
                Create 3
              </Button>
              <ButtonLink href="/sets" variant="outline">
                Open Sets
              </ButtonLink>
              <Button variant="outline" loading={busy === "leave"} onClick={() => run("leave", leaveTestLab, "Back in your own church.")}>
                Back to my church
              </Button>
            </div>
            {setIds.length > 0 && (
              <p className="text-sm">
                <a className="font-semibold text-primary underline" href={`/sets/${setIds[0]}`}>
                  Open the new test set →
                </a>
              </p>
            )}
            <div className="border-t border-border pt-3">
              {confirmReset ? (
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm">Delete every test set, song and band member?</p>
                  <Button
                    variant="danger"
                    size="sm"
                    loading={busy === "reset"}
                    onClick={async () => {
                      if (await run("reset", resetTestLab, "Test Lab cleared.")) setConfirmReset(false);
                    }}
                  >
                    Yes, clear it
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setConfirmReset(true)}>
                  Clear all test data
                </Button>
              )}
            </div>
          </>
        )}
        {message && (
          <p role="status" className="text-sm text-success">
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
