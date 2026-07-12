/**
 * Plain module (no "use client") so both the server (`layout.tsx`, reading
 * the cookie via `cookies()`) and client components (`TimezoneProvider`,
 * `TimezoneSync`) import the same real string — a constant re-exported from
 * a "use client" file gets replaced by an opaque client reference when
 * imported into a Server Component, which is what silently broke this the
 * first time around.
 */
export const TZ_COOKIE_NAME = "dm-dashboard-tz";
