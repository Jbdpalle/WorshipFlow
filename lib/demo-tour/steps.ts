// The guided demo walkthrough's step copy — shared between the server
// actions that advance it and the client banner that displays it. Each
// step advances only when the real corresponding action succeeds
// server-side (see advanceTourIfNeeded in lib/actions/demo-tour.ts), never
// from a client-side "Next" button — the user has to actually do the thing.
export const TOUR_STEPS = [
  { step: 1, title: "Your Library", body: 'Open your demo song, "Still Before You", from the Library.' },
  { step: 2, title: "Build a set", body: "Create your first set, then add the demo song to it." },
  { step: 3, title: "Open the song", body: "Open the song from the set to see its full Song Flow." },
  { step: 4, title: "Song Vision", body: "Edit the Song Vision — where you're taking this song." },
  { step: 5, title: "Song Flow", body: "Edit one of the sections — rename it, or change its label." },
  { step: 6, title: "Directions", body: 'Add a direction for a role — try "Rest of the Band" or "Rest of the Vocals" too.' },
  { step: 7, title: "Dynamics", body: "Set the dynamics level on a section." },
  { step: 8, title: "Transition", body: "Open the transition under the song and set how it ends." },
  { step: 9, title: "Rehearsal", body: "Start a rehearsal for the set." },
  { step: 10, title: "My Part", body: "Check out My Part — only what one musician needs to know." },
  { step: 11, title: "Director Mode", body: "In rehearsal, move to the next section as the leader to start directing live." },
  { step: 12, title: "Announce", body: "Send a quick announcement to the team." },
] as const;

export const TOUR_TOTAL_STEPS = TOUR_STEPS.length;
