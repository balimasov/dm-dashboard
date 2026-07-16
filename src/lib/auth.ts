import { createHmac, timingSafeEqual } from "crypto";

export const AUTH_COOKIE_NAME = "dm-dashboard-auth";

/**
 * Two shared passwords instead of real accounts — there's no per-player
 * identity to track, just "can see the DM-only stuff" vs. "can't". `dm` sees
 * every block that exists today and every block added later (nothing here
 * opts a new section *out* of DM visibility — DM is the default, `player`
 * is the one that has to be deliberately excluded per section); `player` is
 * the reduced view for whoever's at the table with their own device.
 */
export type UserRole = "dm" | "player";

function rolePassword(role: UserRole): string | undefined {
  return role === "dm" ? process.env.DASHBOARD_PASSWORD : process.env.PLAYER_DASHBOARD_PASSWORD;
}

/**
 * Whether logging in is required at all. Only `DASHBOARD_PASSWORD` gates
 * this — a deployment can run with just the DM password set and no player
 * login enabled yet, same as before this feature existed. Both unset means
 * auth is disabled entirely (local dev), and every visitor is treated as
 * `dm` (see `isValidSession`) so nothing is hidden while there's no login
 * page to tell them apart anyway.
 */
export function isPasswordConfigured(): boolean {
  return Boolean(process.env.DASHBOARD_PASSWORD);
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

/** Which role `password` belongs to, if any — checks both, so a login form with one field works for either. `null` for a role whose password env var isn't set (e.g. no `PLAYER_DASHBOARD_PASSWORD` configured yet), not just a wrong password. */
export function resolveRole(password: string): UserRole | null {
  const dmPassword = rolePassword("dm");
  if (dmPassword && timingSafeStringEqual(password, dmPassword)) return "dm";
  const playerPassword = rolePassword("player");
  if (playerPassword && timingSafeStringEqual(password, playerPassword)) return "player";
  return null;
}

/**
 * The session cookie stores `${role}:${hmac}` — an HMAC of a role-specific
 * fixed string keyed by that role's own password, not the password itself,
 * so a leaked cookie doesn't leak the password. Keying the HMAC input by
 * role (not just the password) means a DM and player token can never
 * collide even if both passwords were ever set to the same value.
 */
function computeToken(password: string, role: UserRole): string {
  return createHmac("sha256", password).update(`dm-dashboard-auth-v1:${role}`).digest("hex");
}

export function createSessionToken(role: UserRole): string {
  return `${role}:${computeToken(rolePassword(role) ?? "", role)}`;
}

/** Parses and verifies the session cookie, returning both whether it's valid and which role it grants — a `player` cookie never verifies as `dm` or vice versa, since each is HMAC'd with its own role's password. Defaults to `{ valid: true, role: "dm" }` when auth is disabled outright (see `isPasswordConfigured`). */
export function isValidSession(cookieValue: string | undefined): { valid: boolean; role: UserRole } {
  if (!isPasswordConfigured()) return { valid: true, role: "dm" };
  if (!cookieValue) return { valid: false, role: "dm" };

  const separatorIndex = cookieValue.indexOf(":");
  if (separatorIndex === -1) return { valid: false, role: "dm" };
  const role = cookieValue.slice(0, separatorIndex);
  const token = cookieValue.slice(separatorIndex + 1);
  if (role !== "dm" && role !== "player") return { valid: false, role: "dm" };

  const password = rolePassword(role);
  if (!password) return { valid: false, role };
  return { valid: timingSafeStringEqual(token, computeToken(password, role)), role };
}
