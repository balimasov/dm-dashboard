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
            <div className="app-header-row mx-auto flex max-w-[1800px] flex-wrap items-center gap-x-2 gap-y-2 px-4 py-3">
              <Link href="/" className="mr-auto flex shrink-0 items-center gap-2 font-semibold text-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element -- fixed local asset, no need for next/image here */}
                <img src="/logo.png" alt="" width={28} height={28} className="shrink-0" />
                DM Dashboard
              </Link>
              {/* Empty by default — a page can portal extra sticky content
                  here (see `DashboardClient`'s own campaign-menu toolbar via
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

                  `contents` — this wrapper itself contributes no box of its
                  own (empty or not), so whatever gets portaled in lands as a
                  direct flex item of the row above, sitting right after the
                  brand link, no intermediate div affecting sizing/wrapping.
                  Scoped to `authenticated` rather than unconditional — the
                  public login page never portals anything here and doesn't
                  need this either. */}
              <div id="header-extra-slot" className={authenticated ? "contents" : undefined} />
              {authenticated && (
                <div className="header-logout-fallback flex shrink-0 items-center gap-1.5">
                  <form action={logout}>
                    {/* Fallback logout, not the primary one — once
                        `DashboardClient`'s own campaign menu mounts (see
                        `.campaign-toolbar` above), it carries its own "Log
                        out" as the last item in that menu, and this button
                        is hidden via the `:has()` rule in globals.css.
                        Kept unconditionally rendered (not removed) so
                        logout still works everywhere that menu doesn't
                        exist — the campaigns list, or this page for the
                        brief pre-hydration window before any portal can
                        land, or with JS disabled entirely. `IconFab` — same
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
          <footer className="border-t border-slate-800 py-3 text-center text-xs text-slate-600">
            DM Dashboard · v{APP_VERSION} · dwarfbalin
          </footer>
        </TimezoneProvider>
      </body>
    </html>
  );
}
