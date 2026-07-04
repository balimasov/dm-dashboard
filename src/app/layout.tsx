import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import packageJson from "../../package.json";

export const metadata: Metadata = {
  title: "DM Character Dashboard",
  description: "Компактний дашборд персонажів партії для Данжеон Майстра",
};

const APP_VERSION = packageJson.version;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100">
        <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-10">
          <div className="mx-auto max-w-[1800px] px-4 py-3 flex items-center justify-between">
            <Link href="/" className="font-semibold text-slate-100">
              DM Character Dashboard
            </Link>
            <nav className="flex gap-4 text-sm text-slate-400">
              <Link href="/" className="hover:text-slate-100">
                Дашборд
              </Link>
              <Link href="/settings" className="hover:text-slate-100">
                Персонажі
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-800 py-3 text-center text-xs text-slate-600">
          DM Character Dashboard · v{APP_VERSION}
        </footer>
      </body>
    </html>
  );
}
