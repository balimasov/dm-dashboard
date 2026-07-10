"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, checkPassword, createSessionToken, isPasswordConfigured } from "@/lib/auth";
import { checkLoginRateLimit, clearLoginAttempts, recordFailedLogin } from "@/lib/loginRateLimit";

export type LoginState = { error?: string } | undefined;

/** Railway (and most hosts behind a reverse proxy) set this; falls back to a shared bucket rather than skipping rate-limiting outright if it's ever missing (e.g. plain `next start` with nothing in front). */
async function getClientIp(): Promise<string> {
  const headerList = await headers();
  return headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");

  if (isPasswordConfigured()) {
    const ip = await getClientIp();
    const lockedForMs = checkLoginRateLimit(ip);
    if (lockedForMs !== null) {
      return { error: `Забагато невдалих спроб. Спробуй ще раз через ${Math.ceil(lockedForMs / 60000)} хв.` };
    }
    if (!checkPassword(password)) {
      recordFailedLogin(ip);
      return { error: "Невірний пароль." };
    }
    clearLoginAttempts(ip);
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, createSessionToken(), {
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
