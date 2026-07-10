"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-center shadow-lg shadow-black/20">
        <h1 className="text-lg font-semibold text-slate-100">Something went wrong</h1>
        <p className="text-sm text-slate-500">An unexpected error occurred. You can try again, or head back.</p>
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
