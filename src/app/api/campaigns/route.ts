import { NextResponse } from "next/server";
import { createCampaign, listCampaigns } from "@/lib/db";
import { campaignCreateSchema } from "@/lib/schemas";

export async function GET() {
  return NextResponse.json(listCampaigns());
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const result = campaignCreateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "A campaign name is required." }, { status: 400 });
  }

  const campaign = createCampaign(result.data);
  return NextResponse.json(campaign, { status: 201 });
}
