import { NextResponse } from "next/server";
import { getCreature, removeCreature, updateCreature } from "@/lib/db";
import { creatureUpdateSchema } from "@/lib/schemas";

export async function PATCH(req: Request, ctx: RouteContext<"/api/creatures/[id]">) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const result = creatureUpdateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const updated = updateCreature(id, result.data);
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
