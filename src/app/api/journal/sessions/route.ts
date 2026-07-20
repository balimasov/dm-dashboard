import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { listJournalSessions } from "@/lib/db";

/**
 * DM-only in iteration 1 — the journal has no `"party"` audience content
 * yet, so a hard deny (rather than `creatures`' role-filtered pattern) is
 * both simpler and stricter. Once a `"party"` audience exists, this must
 * switch to filtering instead of denying non-DM callers outright.
 */
export async function GET(req: Request) {
  const denied = await requireRole("dm");
  if (denied) return denied;

  const campaignId = new URL(req.url).searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId query param is required." }, { status: 400 });
  }
  return NextResponse.json(listJournalSessions(campaignId));
}
