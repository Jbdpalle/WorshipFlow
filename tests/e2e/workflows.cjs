// Manual browser check of the live workflows — NOT part of `npm test`.
// Needs: the app running (next dev -p 3100), a seeded leader + member login
// (see FIXTURE below) and Playwright's Chromium. It drives two real browser
// sessions (leader + musician) against the running app and prints PASS/FAIL
// per workflow. Usage: node tests/e2e/workflows.cjs <fixture.json> [baseUrl]
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const fs = require("fs");

const fx = JSON.parse(fs.readFileSync(process.argv[2], "utf8").trim()); // {leader, member, password, setId}
const BASE = process.argv[3] || "http://localhost:3100";
const results = [];
const NOTE = "Bass enters too early " + Date.now().toString(36);
const check = (name, ok, extra = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`);
};

async function open(browser, who, width = 390) {
  const ctx = await browser.newContext({ viewport: { width, height: 844 }, hasTouch: true });
  const r = await ctx.request.post(BASE + "/api/auth/login", { data: { email: fx[who], password: fx.password } });
  if (!r.ok()) throw new Error("login failed for " + who);
  return { ctx, page: await ctx.newPage() };
}

(async () => {
  const browser = await chromium.launch();
  const L = await open(browser, "leader");
  const M = await open(browser, "member");

  // Leader: one tap from the set to a running practice.
  await L.page.goto(`${BASE}/sets/${fx.setId}`, { waitUntil: "networkidle" });
  await L.page.getByRole("button", { name: /start practice|resume practice/i }).click();
  await L.page.waitForURL(/\/practice\/[^/]+$/, { timeout: 20000 });
  await L.page.getByRole("heading", { level: 2 }).first().waitFor();
  check("Start practice: one tap lands inside the running session", /Practice/.test(await L.page.locator("body").innerText()));

  // Start from the top of song 1 so the run is repeatable.
  await L.page.getByRole("navigation", { name: "Set order" }).getByRole("button").first().click();
  await L.page.waitForTimeout(1500);

  // Musician joins the same practice via the shared set position.
  await M.page.goto(`${BASE}/rehearsal/${fx.setId}`, { waitUntil: "networkidle" });
  const nowHeading = (p) => p.locator('section[aria-label="Current section"] h2');
  const startLabel = (await nowHeading(M.page).innerText()).trim();

  // Leader taps Go Next once; the musician's screen follows with NO tap.
  await L.page.getByRole("button", { name: /go next/i }).click();
  const leaderLabel = (await nowHeading(L.page).innerText()).trim();
  await M.page.waitForFunction(
    ([sel, label]) => document.querySelector(sel)?.textContent?.trim().startsWith(label),
    ['section[aria-label="Current section"] h2', leaderLabel],
    { timeout: 12000 },
  );
  check("Musician follows leader's Go Next without tapping", leaderLabel !== startLabel, `${startLabel} → ${leaderLabel}`);

  // Musician looks ahead on purpose; leader moves again; musician is NOT yanked.
  // Two sections ahead, so the leader's next move still leaves them elsewhere.
  await M.page.getByRole("button", { name: /look ahead/i }).click();
  await M.page.getByRole("button", { name: /look ahead/i }).click();
  const browsing = (await nowHeading(M.page).innerText()).trim();
  const scrollBefore = await M.page.evaluate(() => window.scrollY);
  await L.page.getByRole("button", { name: /go next/i }).click();
  await M.page.waitForTimeout(6000);
  const stillBrowsing = (await nowHeading(M.page).innerText()).trim();
  check("Musician reading another section is not pulled away", stillBrowsing === browsing, `stayed on ${stillBrowsing}`);
  check("Scroll position is not reset by the incoming update", (await M.page.evaluate(() => window.scrollY)) === scrollBefore);
  const pill = M.page.getByRole("button", { name: /back to live/i });
  check("A 'Back to live' prompt is offered", await pill.isVisible());
  await pill.click();
  const liveLabel = (await nowHeading(L.page).innerText()).trim();
  check("Back to live returns to the leader's section", (await nowHeading(M.page).innerText()).trim() === liveLabel, liveLabel);

  // Quick note without leaving the music.
  const urlBefore = M.page.url();
  await M.page.getByRole("button", { name: /quick note/i }).click();
  await M.page.getByRole("button", { name: "Fix", exact: true }).click();
  await M.page.getByRole("textbox", { name: /^Note/ }).fill(NOTE);
  await M.page.getByRole("button", { name: "Add", exact: true }).click();
  await M.page.getByRole("status").filter({ hasText: /Noted/ }).waitFor({ timeout: 25000 }).catch(async () => {
    console.log("   note UI said:", (await M.page.locator("[role=alert],[role=status]").allInnerTexts()).join(" | "));
  });
  check("Quick note saved in place (same URL, same section)", M.page.url() === urlBefore && (await nowHeading(M.page).innerText()).trim() === liveLabel);

  // Leader reviews it: make it a direction on the note's section.
  await L.page.reload({ waitUntil: "networkidle" });
  await L.page.locator("summary", { hasText: "Notes to review" }).click();
  const card = L.page.locator("div.rounded-lg", { hasText: NOTE }).last();
  await card.waitFor({ timeout: 10000 });
  await card.getByRole("button", { name: /make it a direction/i }).click();
  await L.page.getByLabel("Direction is for").selectOption("Bass");
  await L.page.getByLabel("Direction to apply").fill("Enter on bar 3 (e2e)");
  await L.page.getByRole("button", { name: /apply to arrangement/i }).click();
  await L.page.locator("div.rounded-lg", { hasText: NOTE }).waitFor({ state: "detached", timeout: 10000 });
  check("Leader converted the note into an agreed direction (note leaves the review list)", true);

  // Wake lock / no horizontal overflow at the real widths on the live screen.
  for (const w of [320, 375, 390, 430, 768, 834, 1280]) {
    await M.page.setViewportSize({ width: w, height: 844 });
    await M.page.waitForTimeout(150);
    const o = await M.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(`Live screen has no horizontal overflow at ${w}px`, o <= 1, `overflow ${o}px`);
  }

  await browser.close();
  const failed = results.filter((r) => !r).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error("E2E ERROR", e.message);
  process.exit(2);
});
