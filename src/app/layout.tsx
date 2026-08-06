import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import "./globals.css";
import packageJson from "../../package.json";
import { GlobalLoadingIndicator } from "@/components/GlobalLoadingIndicator";
import { TimezoneProvider } from "@/components/TimezoneProvider";
import { TimezoneSync } from "@/components/TimezoneSync";
import { AUTH_COOKIE_NAME, isValidSession } from "@/lib/auth";
import { TZ_COOKIE_NAME } from "@/lib/timezone";
import { logout } from "@/app/login/actions";

export const metadata: Metadata = {
  title: "DM Dashboard",
  description: "A compact party character dashboard for the Dungeon Master",
};

const APP_VERSION = packageJson.version;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const authenticated = isValidSession(cookieStore.get(AUTH_COOKIE_NAME)?.value).valid;
  const timeZone = cookieStore.get(TZ_COOKIE_NAME)?.value;

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100">
        <TimezoneProvider timeZone={timeZone}>
          <TimezoneSync />
          <GlobalLoadingIndicator />
          <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-10">
            <div className="mx-auto flex max-w-[1800px] flex-wrap items-center gap-x-2 gap-y-2 px-4 py-3">
              <Link href="/" className="mr-auto flex shrink-0 items-center gap-2 font-semibold text-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element -- fixed local asset, no need for next/image here */}
                <img src="/logo.png" alt="" width={28} height={28} className="shrink-0" />
                DM Dashboard
              </Link>
              {authenticated && (
                <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:order-last">
                  <form action={logout}>
                    <button
                      type="submit"
                      aria-label="Log out"
                      title="Log out"
                      className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="20"
                        height="20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                    </button>
                  </form>
                </div>
              )}
              {/* Empty by default — a page can portal extra sticky content
                  here (see `DashboardClient`'s own Sync/Journal/⋮ toolbar via
                  `createPortal`) so it renders as part of THIS SAME
                  translucent/blurred `<header>` instead of a second,
                  independently `sticky`-positioned element stacked directly
                  underneath it. Two adjacent elements each running their own
                  `backdrop-filter: blur` can show a visible seam right at
                  their shared edge — confirmed even after their positions
                  and translucency were made pixel-identical, an inherent
                  characteristic of stacking two separate blur regions next
                  to a busy scrolling background, not something fixable by
                  aligning them more precisely. Anything that needs to look
                  like part of the header has to physically live inside this
                  one element instead.

                  Lives *inside* this same flex-wrap row (not a separate
                  block below it) so it merges onto the brand+logout row
                  whenever there's enough width, instead of always costing
                  its own full row: `w-full` forces it onto its own line on
                  narrow (mobile) viewports — nothing else fits next to a
                  100%-wide flex item, so it still wraps below brand+logout
                  exactly like before — while `sm:w-auto` lets it size to its
                  own content and simply take the remaining space on that
                  same line once there's room, which desktop widths always
                  have. `sm:order-last` on the logout button (not on this
                  slot) is what keeps it *last* — this slot and logout are
                  siblings in source order (slot after logout) so mobile's
                  wrap grouping stays [brand, logout] / [slot] unchanged;
                  reordering only logout at `sm:` moves it visually past the
                  now-inline toolbar without touching how anything wraps.

                  `min-h-[53px]` (border-t 1px + toolbar row's own `py-2`
                  16px + its `h-9` buttons' 36px) reserves that toolbar's
                  real height up front on mobile, where it's still its own
                  row — a portal can't put anything here until the client
                  has hydrated, so this slot is *always* empty in the actual
                  server-rendered HTML, and left at its natural height,
                  every load visibly grew the header by this amount the
                  instant the toolbar portaled in (confirmed empirically:
                  always a single-frame step, not gradual). Dropped at `sm:`
                  — merged into the brand+logout row there, so hydration
                  only adds a few buttons to a row whose height was already
                  set by that row's own content, not a whole new row
                  popping in; no reservation needed to prevent a jump that
                  no longer happens. Scoped to `authenticated` rather than
                  unconditional — the public login page never portals
                  anything here and doesn't need any of this. */}
              <div
                id="header-extra-slot"
                className={authenticated ? "w-full min-h-[53px] sm:w-auto sm:min-h-0" : undefined}
              />
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="border-t border-slate-800 py-3 text-center text-xs text-slate-600">
            DM Dashboard · v{APP_VERSION} · dwarfbalin
          </footer>
        </TimezoneProvider>
      </body>
    </html>
  );
}
