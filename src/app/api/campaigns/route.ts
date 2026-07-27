import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { parseJsonBody } from "@/lib/apiRoute";
import { createCampaign, listCampaigns } from "@/lib/db";
import { campaignCreateSchema } from "@/lib/schemas";

export async function GET() {
  return NextResponse.json(listCampaigns());
}

/** Campaign creation is DM-only — the "+ New Campaign" button is only ever rendered for `isDm` (see `CampaignsClient.tsx`), so a player session posting here directly would be working around the UI, not using it as intended. */
export async function POST(req: Request) {
  const denied = await requireRole("dm");
  if (denied) return denied;

  const parsed = await parseJsonBody(req, campaignCreateSchema, "A campaign name is required.");
  if ("error" in parsed) return parsed.error;

  const campaign = createCampaign(parsed.data);
  return NextResponse.json(campaign, { status: 201 });
}
