import { NextResponse } from "next/server";
import { createCampaign, listCampaigns } from "@/lib/db";

export async function GET() {
  return NextResponse.json(listCampaigns());
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const notes = typeof body?.notes === "string" ? body.notes : undefined;
  const logoUrl = typeof body?.logoUrl === "string" ? body.logoUrl : undefined;

  if (!name) {
    return NextResponse.json({ error: "A campaign name is required." }, { status: 400 });
  }

  const campaign = createCampaign({ name, notes, logoUrl });
  return NextResponse.json(campaign, { status: 201 });
}
