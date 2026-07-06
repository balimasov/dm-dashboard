import { NextResponse } from "next/server";
import { deleteCampaign, getCampaign, updateCampaign } from "@/lib/db";

export async function PATCH(req: Request, ctx: RouteContext<"/api/campaigns/[id]">) {
  const { id } = await ctx.params;
  const updates = await req.json().catch(() => null);
  if (!updates || typeof updates !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const updated = updateCampaign(id, updates);
  if (!updated) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/campaigns/[id]">) {
  const { id } = await ctx.params;
  const existing = getCampaign(id);
  if (!existing) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }
  deleteCampaign(id);
  return NextResponse.json({ ok: true });
}
