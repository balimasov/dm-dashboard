import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import "./globals.css";
import packageJson from "../../package.json";
import { GlobalLoadingIndicator } from "@/components/GlobalLoadingIndicator";
import { TimezoneProvider } from "@/components/TimezoneProvider";
import { TimezoneSync } from "@/components/TimezoneSync";
import { IconFab } from "@/components/ui/IconFab";
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
            {/* `min-h-[60px]` — this row's own `py-3` (12px) top/bottom
                plus `DashboardClient`'s `h-9` (36px) toolbar buttons add up
                to exactly 60px, the total height its `position: fixed`
                overlay computes for itself (see that component's own doc
                comment) — it's no longer a DOM descendant sharing this
                flexbox, so nothing here forces the two to agree on their
                own. Without this, this row's own shorter content (just the
                28px logo, once the fallback logout is hidden) gave it a
                shorter total height than the overlay's, so the overlay's
                buttons sat off-center against this header's real
                border-bottom — 12px above them, 5px below. (`min-h-9`
                alone doesn't work here: with Tailwind's `border-box`
                sizing, `min-height` includes the row's own padding, so a
                bare 36px min-height leaves only 12px for content, not the
                36px intended — the explicit `[60px]` sidesteps that.) */}
            <div className="mx-auto flex max-w-[1800px] min-h-[60px] flex-wrap items-center gap-x-2 gap-y-2 px-4 py-3">
              <Link href="/" className="mr-auto flex shrink-0 items-center gap-2 font-semibold text-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element -- fixed local asset, no need for next/image here */}
                <img src="/logo.png" alt="" width={28} height={28} className="shrink-0" />
                {/* Hidden below `sm:` — a campaign page's own toolbar is a
                    `position: fixed` overlay (see `DashboardClient.tsx`),
                    not a flex sibling this row can shrink around, so on a
                    narrow phone its Sync Party button would otherwise sit
                    right on top of this text instead of next to it. */}
                <span className="hidden sm:inline">DM Dashboard</span>
              </Link>
              {authenticated && (
                <div className="header-logout-fallback flex shrink-0 items-center gap-1.5">
                  <form action={logout}>
                    {/* Fallback logout, not the primary one — a campaign
                        page's own `DashboardClient` overlays its own
                        campaign menu (see `.campaign-toolbar` in
                        `DashboardClient.tsx`) directly on top of this header
                        via `position: fixed`, `z-20` above this header's
                        `z-10` — not a `createPortal` into a DOM node here,
                        so it needs no client-side mount to exist: it's
                        already part of that page's own server-rendered
                        HTML, painted in the very first frame, no pop-in to
                        chase. That menu carries its own "Log out" as its
                        last item, and this fallback button is hidden the
                        instant that menu exists via the `:has()` rule in
                        globals.css (matched against `body`, since the
                        overlay lives elsewhere in the DOM tree, not inside
                        this `<header>`, despite rendering visually on top
                        of it). Kept unconditionally rendered (not removed)
                        so logout still works everywhere that menu doesn't
                        exist — the campaigns list has no campaign context
                        to build one from, and it's a working fallback with
                        JS disabled entirely too. `IconFab` — same
                        bordered/sized/hover recipe as the campaign menu's
                        own trigger. `type="submit"` overrides `IconFab`'s
                        own hardcoded `type="button"` — it comes later in
                        the prop spread, and this is still a real form
                        submit (the `logout` server action). */}
                    <IconFab type="submit" aria-label="Log out" title="Log out">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
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
                    </IconFab>
                  </form>
                </div>
              )}
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="border-t border-slate-800 px-4 py-3 text-center text-xs text-slate-600">
            <p>
              DM Dashboard · v{APP_VERSION} · dwarfbalin ·{" "}
              <Link href="/legal" className="hover:text-slate-400 hover:underline">
                Legal &amp; Licenses
              </Link>
            </p>
            {/* Short-form disclaimer — the fuller trademark/ownership statement lives on `/legal` itself. */}
            <p className="mt-1">
              DM Dashboard is an independent 5E-compatible tool. Not affiliated with or endorsed by Wizards of the
              Coast or D&amp;D Beyond.
            </p>
          </footer>
        </TimezoneProvider>
      </body>
    </html>
  );
}
