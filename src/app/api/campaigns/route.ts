import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createCampaign, listCampaigns } from "@/lib/db";
import { campaignCreateSchema } from "@/lib/schemas";

export async function GET() {
  return NextResponse.json(listCampaigns());
}

/** Campaign creation is DM-only — the "+ New Campaign" button is only ever rendered for `isDm` (see `CampaignsClient.tsx`), so a player session posting here directly would be working around the UI, not using it as intended. */
export async function POST(req: Request) {
  const denied = await requireRole("dm");
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const result = campaignCreateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "A campaign name is required." }, { status: 400 });
  }

  const campaign = createCampaign(result.data);
  return NextResponse.json(campaign, { status: 201 });
}
