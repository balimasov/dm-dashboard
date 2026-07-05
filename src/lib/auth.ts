import { createHmac, timingSafeEqual } from "crypto";

export const AUTH_COOKIE_NAME = "dm-dashboard-auth";

/**
 * The whole app is gated by a single shared password (`DASHBOARD_PASSWORD`)
 * rather than real user accounts — there's only one DM using this tool, so
 * a login system with accounts/roles would be pure overhead. If the env var
 * isn't set at all, auth is treated as disabled (everything passes through)
 * so local `npm run dev`/`npm start` still works without any setup; set it
 * in Railway's environment variables to actually protect a deployed copy.
 */
export function isPasswordConfigured(): boolean {
  return Boolean(process.env.DASHBOARD_PASSWORD);
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export function checkPassword(password: string): boolean {
  const expected = process.env.DASHBOARD_PASSWORD;
  return Boolean(expected) && timingSafeStringEqual(password, expected!);
}

/**
 * The session cookie stores an HMAC of a fixed string keyed by the
 * password — not the password itself — so a leaked cookie doesn't leak the
 * password, without needing a separate session secret/store for what's
 * meant to be a minimal single-password gate.
 */
function computeToken(password: string): string {
  return createHmac("sha256", password).update("dm-dashboard-auth-v1").digest("hex");
}

export function createSessionToken(): string {
  return computeToken(process.env.DASHBOARD_PASSWORD ?? "");
}

export function isValidSessionToken(token: string | undefined): boolean {
  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) return true;
  if (!token) return false;
  return timingSafeStringEqual(token, computeToken(password));
}
