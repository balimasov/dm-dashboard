#!/usr/bin/env node
// Reusable Playwright launch/navigation helpers for manual dev-time
// verification (screenshotting a change before shipping it) — not a test
// suite, just the boilerplate that kept getting rewritten from scratch each
// session: resolving the pre-installed Chromium binary, importing
// `playwright` (now a devDependency, so this needs no NODE_PATH tricks),
// and getting from a blank page to "inside a campaign" in one call.
//
// Usage as a library:
//   import { launchBrowser, openCampaign } from "./scripts/playwright-helpers.mjs";
//   const { browser, page } = await launchBrowser();
//   await openCampaign(page, { baseURL: "http://localhost:3311", campaignName: "The Sundered Vale" });
//   // ...your scenario-specific actions/screenshots here...
//   await browser.close();
//
// Usage standalone (quick smoke check that the app renders at all):
//   node scripts/playwright-helpers.mjs [baseURL] [screenshotPath]
//   node scripts/playwright-helpers.mjs http://localhost:3311 /tmp/check.png

import { chromium } from "playwright";
import { existsSync, readdirSync } from "fs";
import path from "path";

const DEFAULT_BASE_URL = "http://localhost:3311";
const PW_BROWSERS_DIR = process.env.PLAYWRIGHT_BROWSERS_PATH || "/opt/pw-browsers";

/**
 * This remote environment ships a pre-installed Chromium under
 * `/opt/pw-browsers/chromium-<rev>/chrome-linux/chrome` (see
 * `PLAYWRIGHT_BROWSERS_PATH`/`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` in the
 * container's env) rather than the version-pinned one Playwright would
 * normally download into `~/.cache/ms-playwright`. `chromium.launch()`
 * without `executablePath` looks in the latter, so it fails outright unless
 * we point it at the former. Falls back to `undefined` (Playwright's own
 * default resolution) when the pre-installed directory isn't there, so this
 * still works unmodified on a machine that ran `npx playwright install`.
 */
function resolveChromiumExecutable() {
  if (!existsSync(PW_BROWSERS_DIR)) return undefined;
  const rev = readdirSync(PW_BROWSERS_DIR).find((name) => /^chromium-\d+$/.test(name));
  if (!rev) return undefined;
  const exe = path.join(PW_BROWSERS_DIR, rev, "chrome-linux", "chrome");
  return existsSync(exe) ? exe : undefined;
}

/** One browser + one page, viewport sized for a full dashboard screenshot without excessive scrolling. */
export async function launchBrowser({ headless = true, viewport = { width: 1400, height: 1400 } } = {}) {
  const browser = await chromium.launch({ headless, executablePath: resolveChromiumExecutable() });
  const page = await browser.newPage({ viewport });
  return { browser, page };
}

/**
 * Navigates to the dashboard's campaign list and clicks into one — the
 * first step of nearly every manual verification scenario, since almost
 * everything worth screenshotting (characters, creatures, journal,
 * reminders) lives inside a campaign. Waits for the post-navigation
 * network-idle settle both times, since the campaign page's initial data
 * fetch is what the rest of a scenario script needs to have finished.
 */
export async function openCampaign(page, { baseURL = DEFAULT_BASE_URL, campaignName } = {}) {
  await page.goto(baseURL, { waitUntil: "networkidle" });
  // The campaign name itself is the whole card's clickable surface (a
  // "stretched link" `<Link>` with `after:absolute after:inset-0" inside a
  // `<li>` — see `CampaignsClient.tsx`). Scoped to `li a` rather than a bare
  // role query, since the page header's own logo is also a link (to "/")
  // and sits earlier in the DOM — an unscoped `getByRole("link").first()`
  // clicks that instead and silently no-ops (same page, no navigation).
  const link = campaignName
    ? page.locator("li").filter({ hasText: campaignName }).getByRole("link").first()
    : page.locator("li a").first();
  await link.click();
  // The campaign link is a Next.js `<Link>` — a client-side route
  // transition (history.pushState + re-render), not a full page reload —
  // so there's no "load"/"navigated" event for `waitForLoadState` to key
  // off. Calling it right after `.click()` can resolve instantly against
  // whatever idle snapshot existed *before* the transition's own data fetch
  // even started, i.e. it doesn't actually wait for anything. `waitForURL`
  // polls the real browser URL, which changes correctly for a client-side
  // transition too, so it's the one that actually blocks until we're there;
  // *then* `networkidle` is meaningful, for the new page's own data fetch.
  await page.waitForURL(/\/campaigns\//);
  await page.waitForLoadState("networkidle");
}

/**
 * Playwright's own modal dialogs render in a `.fixed.inset-0.z-50`
 * container, stacked in DOM order — `.last()` is always the topmost one,
 * which is what "click the Actions menu inside the open modal" almost
 * always means (there's usually exactly one modal open at a time, but a
 * details modal can itself open a nested edit modal on top of it).
 */
export function topmostModal(page) {
  return page.locator(".fixed.inset-0.z-50").last();
}

// Standalone smoke check: open the dashboard, click into the first
// campaign, screenshot it. Confirms the dev server is up and rendering
// before you write a scenario-specific script on top of these helpers.
if (import.meta.url === `file://${process.argv[1]}`) {
  const baseURL = process.argv[2] || DEFAULT_BASE_URL;
  const screenshotPath = process.argv[3] || path.join(process.cwd(), "pw-smoke-check.png");
  const { browser, page } = await launchBrowser();
  try {
    await openCampaign(page, { baseURL });
    await page.screenshot({ path: screenshotPath });
    console.log(`OK — screenshot saved to ${screenshotPath}`);
  } finally {
    await browser.close();
  }
}
