import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { parseJsonBody } from "@/lib/apiRoute";
import { reorderCharacters } from "@/lib/db";
import { reorderBodySchema } from "@/lib/schemas";

/** Reordering is DM-only — the drag handles live in `CampaignRosterEditor`, only reachable through the DM-gated Settings modal. */
export async function POST(req: Request) {
  const denied = await requireRole("dm");
  if (denied) return denied;

  const parsed = await parseJsonBody(req, reorderBodySchema, "orderedIds must be an array of strings.");
  if ("error" in parsed) return parsed.error;

  reorderCharacters(parsed.data.orderedIds);
  return NextResponse.json({ ok: true });
}
