import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createJournalEntry, listJournalEntries } from "@/lib/db";
import { dateKeyForTimeZone } from "@/lib/journal";
import { journalEntryCreateSchema } from "@/lib/schemas";
import { TZ_COOKIE_NAME } from "@/lib/timezone";

/** DM-only in iteration 1 — see `sessions/route.ts`'s own doc comment for why GET denies rather than filters here. */
export async function GET(req: Request) {
  const denied = await requireRole("dm");
  if (denied) return denied;

  const sessionId = new URL(req.url).searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId query param is required." }, { status: 400 });
  }
  return NextResponse.json(listJournalEntries(sessionId));
}

export async function POST(req: Request) {
  const denied = await requireRole("dm");
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const result = journalEntryCreateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const cookieStore = await cookies();
  const timeZone = cookieStore.get(TZ_COOKIE_NAME)?.value ?? "UTC";
  const dateKeyForAutoSession = dateKeyForTimeZone(timeZone);

  const entry = createJournalEntry({
    campaignId: result.data.campaignId,
    sessionId: result.data.sessionId,
    dateKeyForAutoSession,
    text: result.data.text,
  });
  return NextResponse.json(entry, { status: 201 });
}
