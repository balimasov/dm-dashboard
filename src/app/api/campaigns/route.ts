import { NextResponse } from "next/server";
import { createCampaign, listCampaigns } from "@/lib/db";

export async function GET() {
  return NextResponse.json(listCampaigns());
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "A campaign name is required." }, { status: 400 });
  }

  const campaign = createCampaign(name);
  return NextResponse.json(campaign, { status: 201 });
}
