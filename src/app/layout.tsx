import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import "./globals.css";
import packageJson from "../../package.json";
import { FeedbackFab } from "@/components/FeedbackFab";
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
            <div id="header-actions" className="flex flex-1 flex-wrap items-center justify-end gap-2" />
            {authenticated && (
              <form action={logout}>
                <button type="submit" className="shrink-0 text-sm text-slate-400 hover:text-slate-200">
                  Log out
                </button>
              </form>
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
