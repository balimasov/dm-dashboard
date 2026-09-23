import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { parseJsonBody } from "@/lib/apiRoute";
import { reorderCampaigns } from "@/lib/db";
import { reorderBodySchema } from "@/lib/schemas";

/** Reordering is DM-only — same gating as `/api/characters/reorder` and `/api/creatures/reorder`. */
export async function POST(req: Request) {
  const denied = await requireRole("dm");
  if (denied) return denied;

  const parsed = await parseJsonBody(req, reorderBodySchema, "orderedIds must be an array of strings.");
  if ("error" in parsed) return parsed.error;

  reorderCampaigns(parsed.data.orderedIds);
  return NextResponse.json({ ok: true });
}
