import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { duplicateCampaign } from "@/lib/db";

/** Duplicating a campaign is DM-only — same reasoning as create/edit/remove in `CampaignsClient.tsx`: a player has no roster-management UI at all, so a direct request here would be working around the UI rather than using it. */
export async function POST(_req: Request, ctx: RouteContext<"/api/campaigns/[id]/duplicate">) {
  const denied = await requireRole("dm");
  if (denied) return denied;

  const { id } = await ctx.params;
  const result = duplicateCampaign(id);
  if (!result) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }
  return NextResponse.json(result, { status: 201 });
}
