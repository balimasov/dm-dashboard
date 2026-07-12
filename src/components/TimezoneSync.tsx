"use client";

import { useEffect } from "react";
import { TZ_COOKIE_NAME } from "@/lib/timezone";

function readCookie(name: string): string | undefined {
  return document.cookie.split("; ").find((row) => row.startsWith(`${name}=`))?.split("=")[1];
}

/**
 * Renders nothing — just keeps the timezone cookie in sync with the
 * browser's real IANA zone (`Intl.DateTimeFormat().resolvedOptions().timeZone`)
 * so the *next* page load's server render already knows it (see
 * `TimezoneProvider`). Only writes when the value actually changed, so a
 * normal visit doesn't touch `document.cookie` on every navigation.
 */
export function TimezoneSync() {
  useEffect(() => {
    const real = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (readCookie(TZ_COOKIE_NAME) === real) return;
    document.cookie = `${TZ_COOKIE_NAME}=${real}; path=/; max-age=31536000; SameSite=Lax`;
  }, []);

  return null;
}
