/**
 * A minimal in-memory login throttle — this app runs as a single long-lived
 * Node process (no serverless cold starts, no multi-instance scaling), so a
 * module-level `Map` survives across requests without needing Redis or any
 * other shared store. Keyed by client IP so one abusive source can't lock
 * out the real DM, and reset on the window elapsing or a successful login.
 */

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

interface Entry {
  count: number;
  windowStart: number;
}

const attemptsByIp = new Map<string, Entry>();

/** Returns `null` if this IP may attempt a login right now, or the number of ms remaining in its lockout if not. */
export function checkLoginRateLimit(ip: string): number | null {
  const entry = attemptsByIp.get(ip);
  if (!entry) return null;
  const elapsed = Date.now() - entry.windowStart;
  if (elapsed > WINDOW_MS) {
    attemptsByIp.delete(ip);
    return null;
  }
  return entry.count >= MAX_ATTEMPTS ? WINDOW_MS - elapsed : null;
}

export function recordFailedLogin(ip: string): void {
  const entry = attemptsByIp.get(ip);
  const now = Date.now();
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    attemptsByIp.set(ip, { count: 1, windowStart: now });
    return;
  }
  entry.count += 1;
}

export function clearLoginAttempts(ip: string): void {
  attemptsByIp.delete(ip);
}
