import { NextResponse } from "next/server";
import { getCharacter, removeCharacter, updateCharacter } from "@/lib/db";

export async function PATCH(req: Request, ctx: RouteContext<"/api/characters/[id]">) {
  const { id } = await ctx.params;
  const updates = await req.json().catch(() => null);
  if (!updates || typeof updates !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const updated = updateCharacter(id, updates);
  if (!updated) {
    return NextResponse.json({ error: "Character not found." }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/characters/[id]">) {
  const { id } = await ctx.params;
  const existing = getCharacter(id);
  if (!existing) {
    return NextResponse.json({ error: "Character not found." }, { status: 404 });
  }
  removeCharacter(id);
  return NextResponse.json({ ok: true });
}
