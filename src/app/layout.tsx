import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import "./globals.css";
import packageJson from "../../package.json";
import { FeedbackFab } from "@/components/FeedbackFab";
import { GlobalLoadingBar } from "@/components/GlobalLoadingBar";
import { AUTH_COOKIE_NAME, isValidSessionToken } from "@/lib/auth";
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
  const authenticated = isValidSessionToken(cookieStore.get(AUTH_COOKIE_NAME)?.value);

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100">
        <GlobalLoadingBar />
        <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-10">
          <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3">
            <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold text-slate-100">
              <svg viewBox="0 0 32 32" width="28" height="28" className="shrink-0" aria-hidden="true">
                <circle cx="16" cy="16" r="16" fill="#dc2626" />
                <text
                  x="16"
                  y="23"
                  fontFamily="Georgia, 'Times New Roman', serif"
                  fontSize="20"
                  fontWeight="700"
                  fill="white"
                  textAnchor="middle"
                >
                  &amp;
                </text>
              </svg>
              DM Dashboard
            </Link>
            {/* Sync/settings actions and logout are one flex item together, so
                they wrap onto their own line as a whole on narrow screens
                instead of splitting from each other — but stay on the same
                row as the logo whenever there's room (e.g. desktop). Only
                rendered when authenticated, since header-actions is otherwise
                always empty too (you can't reach any portaling page
                unauthenticated) — so there's never an empty slot to collapse. */}
            {authenticated && (
              <div className="flex flex-wrap items-center gap-2">
                <div id="header-actions" className="flex flex-wrap items-center gap-2 empty:hidden" />
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
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-800 py-3 text-center text-xs text-slate-600">
          DM Dashboard · v{APP_VERSION} · dwarfbalin
        </footer>
        <FeedbackFab />
      </body>
    </html>
  );
}
