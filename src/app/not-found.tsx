import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-center shadow-lg shadow-black/20">
        <h1 className="text-lg font-semibold text-slate-100">Page not found</h1>
        <p className="text-sm text-slate-500">
          This page doesn&apos;t exist, or the campaign/character it pointed to was removed.
        </p>
        <Link
          href="/"
          className="inline-block rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          Go to campaigns
        </Link>
      </div>
    </div>
  );
}
