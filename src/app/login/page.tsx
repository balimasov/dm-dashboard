"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, undefined);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <form
        action={formAction}
        className="w-full max-w-sm space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-black/20"
      >
        <div>
          <h1 className="text-lg font-semibold text-slate-100">DM Dashboard</h1>
          <p className="text-sm text-slate-500">Enter your password to continue.</p>
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
            Password
          </label>
          <input
            id="password"
            name="password"
            // `type="text"` + `-webkit-text-security` (not `type="password"`)
            // deliberately — mobile Chrome/WebView flags any page with a real
            // password input as "sensitive" and blocks screenshots/screen
            // recording system-wide for it (Android's anti-phishing autofill
            // heuristic), which broke this page's screenshots even after
            // navigating away. This masks the input the same way visually
            // without tripping that flag; it's a single shared low-stakes
            // password, not a per-user credential, so skipping the OS-level
            // password-manager integration this would otherwise get is fine.
            type="text"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            required
            autoFocus
            style={{ WebkitTextSecurity: "disc" } as React.CSSProperties}
            className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-600"
          />
        </div>
        {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Checking..." : "Log in"}
        </Button>
      </form>
    </div>
  );
}
