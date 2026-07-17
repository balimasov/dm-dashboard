import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { reorderCharacters } from "@/lib/db";
import { reorderBodySchema } from "@/lib/schemas";

/** Reordering is DM-only — the drag handles live in `CampaignRosterEditor`, only reachable through the DM-gated Settings modal. */
export async function POST(req: Request) {
  const denied = await requireRole("dm");
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const result = reorderBodySchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "orderedIds must be an array of strings." }, { status: 400 });
  }

  reorderCharacters(result.data.orderedIds);
  return NextResponse.json({ ok: true });
}
