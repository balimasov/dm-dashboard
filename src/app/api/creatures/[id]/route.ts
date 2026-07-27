import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/auth";
import { parseJsonBody } from "@/lib/apiRoute";
import { getCreature, removeCreature, updateCreature } from "@/lib/db";
import { creatureUpdateSchema } from "@/lib/schemas";

/**
 * A companion stays editable by both roles (`CreatureCard`'s Edit link for
 * the Companions section is never `isDm`-gated — a player tracking their own
 * summon/mount's HP is the point), but an Enemy/NPC is DM-only, matching
 * `DashboardClient.tsx`'s own "Enemies and NPCs are DM-only" comment. Checks
 * both the *current* category and (for a PATCH) the requested one — a player
 * can't reach in and re-categorize a companion into "enemy"/"npc" to hide it
 * from themselves later, any more than they can declassify an existing
 * enemy by PATCHing `category` back down to "companion" in the same request
 * that reveals its stats.
 */
function forbidsPlayer(existingCategory: string, requestedCategory?: string): boolean {
  return existingCategory !== "companion" || (requestedCategory !== undefined && requestedCategory !== "companion");
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/creatures/[id]">) {
  const { id } = await ctx.params;
  const parsed = await parseJsonBody(req, creatureUpdateSchema);
  if ("error" in parsed) return parsed.error;

  const existing = getCreature(id);
  if (!existing) {
    return NextResponse.json({ error: "Creature not found." }, { status: 404 });
  }

  const role = await getSessionRole();
  if (role !== "dm" && forbidsPlayer(existing.category, parsed.data.category)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = updateCreature(id, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "Creature not found." }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/creatures/[id]">) {
  const { id } = await ctx.params;
  const existing = getCreature(id);
  if (!existing) {
    return NextResponse.json({ error: "Creature not found." }, { status: 404 });
  }

  const role = await getSessionRole();
  if (role !== "dm" && forbidsPlayer(existing.category)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  removeCreature(id);
  return NextResponse.json({ ok: true });
}
