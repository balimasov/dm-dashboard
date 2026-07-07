import { NextResponse } from "next/server";
import { getCreature, removeCreature, updateCreature } from "@/lib/db";

export async function PATCH(req: Request, ctx: RouteContext<"/api/creatures/[id]">) {
  const { id } = await ctx.params;
  const updates = await req.json().catch(() => null);
  if (!updates || typeof updates !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const updated = updateCreature(id, updates);
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
  removeCreature(id);
  return NextResponse.json({ ok: true });
}
