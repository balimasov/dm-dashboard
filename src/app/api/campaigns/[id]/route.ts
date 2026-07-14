import { NextResponse } from "next/server";
import { deleteCampaign, getCampaign, updateCampaign } from "@/lib/db";
import { campaignUpdateSchema } from "@/lib/schemas";

export async function PATCH(req: Request, ctx: RouteContext<"/api/campaigns/[id]">) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const result = campaignUpdateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const updated = updateCampaign(id, result.data);
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
