"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, createSessionToken, isPasswordConfigured, resolveRole } from "@/lib/auth";
import { checkLoginRateLimit, clearLoginAttempts, recordFailedLogin } from "@/lib/loginRateLimit";

export type LoginState = { error?: string } | undefined;

/** Railway (and most hosts behind a reverse proxy) set this; falls back to a shared bucket rather than skipping rate-limiting outright if it's ever missing (e.g. plain `next start` with nothing in front). */
async function getClientIp(): Promise<string> {
  const headerList = await headers();
  return headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  // One password field for both roles — whichever configured password
  // matches decides the role, so the login page itself never has to ask
  // "are you the DM or a player."
  let role: "dm" | "player" = "dm";

  if (isPasswordConfigured()) {
    const ip = await getClientIp();
    const lockedForMs = checkLoginRateLimit(ip);
    if (lockedForMs !== null) {
      return { error: `Too many failed attempts. Try again in ${Math.ceil(lockedForMs / 60000)} min.` };
    }
    const resolved = resolveRole(password);
    if (!resolved) {
      recordFailedLogin(ip);
      return { error: "Incorrect password." };
    }
    role = resolved;
    clearLoginAttempts(ip);
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, createSessionToken(role), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/");
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
  redirect("/login");
}
