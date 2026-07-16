import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, isPasswordConfigured, isValidSession } from "@/lib/auth";

if (!isPasswordConfigured()) {
  console.warn(
    "[dm-dashboard] DASHBOARD_PASSWORD is not set — the app is running without a login gate. Set it in your environment to protect this deployment."
  );
}

/**
 * Named `proxy` (not `middleware`) per this fork's v16 rename — see
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md.
 * A shared-password gate: everything except the login page/assets requires a
 * valid session cookie (DM or player role, either is enough to get past this
 * gate — which blocks stay hidden for a player is decided per-page, not
 * here), page requests redirect to /login and API requests get a plain 401
 * (no redirect — a `fetch()` following a redirect to an HTML login page
 * would otherwise fail confusingly on `res.json()`).
 */
export function proxy(request: NextRequest) {
  if (isValidSession(request.cookies.get(AUTH_COOKIE_NAME)?.value).valid) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!login|api/health|_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
