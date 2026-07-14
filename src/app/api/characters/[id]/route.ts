import { NextResponse } from "next/server";
import { getCharacter, removeCharacter, updateCharacter } from "@/lib/db";
import { characterUpdateSchema } from "@/lib/schemas";

export async function PATCH(req: Request, ctx: RouteContext<"/api/characters/[id]">) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const result = characterUpdateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const updated = updateCharacter(id, result.data);
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
