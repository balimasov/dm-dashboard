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
            <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-x-2 gap-y-2 px-4 py-3">
              <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold text-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element -- fixed local asset, no need for next/image here */}
                <img src="/logo.png" alt="" width={28} height={28} className="shrink-0" />
                DM Dashboard
              </Link>
              {authenticated && (
                <div className="flex flex-wrap items-center gap-1.5">
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
            </div>
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

                `min-h-[53px]` (border-t 1px + toolbar row's own `py-2` 16px
                + its `h-9` buttons' 36px) reserves that toolbar's real
                height up front, while authenticated — a portal can't put
                anything here until the client has hydrated and mounted the
                page that owns it, so this slot is *always* empty in the
                actual server-rendered HTML. Left at its natural height
                (auto), every single load — reload, pull-to-refresh —
                visibly grew the header by this exact amount the instant
                the toolbar portaled in, shoving all page content down in
                one abrupt jump (confirmed empirically: the transition is a
                single-frame step, never a gradual one, no matter how long
                it takes to arrive). Reserving the space up front makes that
                content pop in *within* a footprint that was already there,
                instead of the footprint itself changing size. Scoped to
                `authenticated` rather than applied unconditionally — the
                public login page never portals anything here and doesn't
                need the extra height. */}
            <div id="header-extra-slot" className={authenticated ? "min-h-[53px]" : undefined} />
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
