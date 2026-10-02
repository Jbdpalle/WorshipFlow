import { vi } from "vitest";

// Server Actions call requireUser() -> readSession()/createSession(), which
// read/write the session cookie via next/headers' cookies(). That only
// works inside a real Next.js request context — outside of one (a plain
// Vitest process) it throws. A minimal in-memory cookie jar stands in for
// it so these tests can exercise the real Server Action code, including
// its auth gate, rather than mocking the actions themselves.
const store = new Map<string, string>();

export function __resetCookieJar() {
  store.clear();
}

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (store.has(name) ? { name, value: store.get(name)! } : undefined),
    set: (name: string, value: string) => {
      store.set(name, value);
    },
    delete: (name: string) => {
      store.delete(name);
    },
  }),
}));

// revalidatePath() also only works inside a real Next.js request — a no-op
// here since these tests only care about the DB/auth outcome, not caching.
vi.mock("next/cache", () => ({
  revalidatePath: () => {},
}));
