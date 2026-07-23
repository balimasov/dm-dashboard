import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/auth";
import { clearCreatureHpHistory, getCreature } from "@/lib/db";

/** Same DM/player split as `PATCH /api/creatures/[id]` — a player may clear their own companion's log, never an enemy/NPC's. */
export async function DELETE(_req: Request, ctx: RouteContext<"/api/creatures/[id]/hp-history">) {
  const { id } = await ctx.params;
  const existing = getCreature(id);
  if (!existing) {
    return NextResponse.json({ error: "Creature not found." }, { status: 404 });
  }

  const role = await getSessionRole();
  if (role !== "dm" && existing.category !== "companion") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = clearCreatureHpHistory(id);
  return NextResponse.json(updated);
}
