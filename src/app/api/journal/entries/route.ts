import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/auth";
import { createJournalEntry, getJournalSession, listJournalEntries } from "@/lib/db";
import { dateKeyForTimeZone } from "@/lib/journal";
import { journalEntryCreateSchema } from "@/lib/schemas";
import { JournalEntryAudience } from "@/lib/types";

/** Any authenticated role. An archived session is a 404 (not 403) for a non-DM — it's meant to be invisible, not just restricted; a 403 would confirm it exists. A non-DM's entry list is filtered to the "party" audience, same "GET filters, doesn't deny" pattern `creatures` GET uses. */
export async function GET(req: Request) {
  const role = await getSessionRole();
  const sessionId = new URL(req.url).searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId query param is required." }, { status: 400 });
  }

  const session = getJournalSession(sessionId);
  if (!session || (role !== "dm" && session.archived)) {
    return NextResponse.json({ error: "Journal session not found." }, { status: 404 });
  }

  const entries = listJournalEntries(sessionId);
  const visible = role === "dm" ? entries : entries.filter((e) => e.audience === "party");
  return NextResponse.json(visible);
}

export async function POST(req: Request) {
  const role = await getSessionRole();

  const body = await req.json().catch(() => null);
  const result = journalEntryCreateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (result.data.sessionId) {
    const session = getJournalSession(result.data.sessionId);
    if (!session || (role !== "dm" && session.archived)) {
      return NextResponse.json({ error: "Journal session not found." }, { status: 404 });
    }
  }

  // A single canonical UTC calendar day, not the caller's own local one —
  // `resolveOrCreateSessionForDate` in `db.ts` matches an existing session
  // by this exact string, so computing it from each device's own IANA zone
  // (as this used to) meant two devices at the same table could disagree
  // about "today" and silently split one real session across two rows.
  // Fixed to a constant zone instead, so every request agrees regardless of
  // who's asking.
  const dateKeyForAutoSession = dateKeyForTimeZone("UTC");

  // Never trust a client-supplied audience for a player — force "party"
  // regardless of what was sent. A DM defaults to "dm" when omitted, which
  // is exactly Quick Note's request shape (it never sends `audience`).
  const audience: JournalEntryAudience = role === "player" ? "party" : result.data.audience === "party" ? "party" : "dm";

  const entry = createJournalEntry({
    campaignId: result.data.campaignId,
    sessionId: result.data.sessionId,
    dateKeyForAutoSession,
    text: result.data.text,
    audience,
    authorRole: role,
  });
  return NextResponse.json(entry, { status: 201 });
}
