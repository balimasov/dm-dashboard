import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSessionRole, requireRole } from "@/lib/auth";
import { createJournalSession, listJournalSessions } from "@/lib/db";
import { dateKeyForTimeZone } from "@/lib/journal";
import { journalSessionCreateSchema } from "@/lib/schemas";
import { TZ_COOKIE_NAME } from "@/lib/timezone";

/** Any authenticated role — `listJournalSessions` itself does the audience/archived filtering per role, same "GET filters, doesn't deny" pattern `creatures` GET uses. */
export async function GET(req: Request) {
  const role = await getSessionRole();
  const campaignId = new URL(req.url).searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId query param is required." }, { status: 400 });
  }
  return NextResponse.json(listJournalSessions(campaignId, role));
}

/** Manual "start a new session" — DM-only; session management stays a DM-only capability even though the journal itself is now shared with players. */
export async function POST(req: Request) {
  const denied = await requireRole("dm");
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const result = journalSessionCreateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  let timeZone = result.data.timeZone;
  if (!timeZone) {
    const cookieStore = await cookies();
    timeZone = cookieStore.get(TZ_COOKIE_NAME)?.value ?? "UTC";
  }
  const session = createJournalSession(result.data.campaignId, dateKeyForTimeZone(timeZone));
  return NextResponse.json(session, { status: 201 });
}
