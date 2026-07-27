import { NextResponse } from "next/server";
import { parseJsonBody } from "@/lib/apiRoute";
import { getCharacter, removeCharacter, updateCharacter } from "@/lib/db";
import { characterUpdateSchema } from "@/lib/schemas";

export async function PATCH(req: Request, ctx: RouteContext<"/api/characters/[id]">) {
  const { id } = await ctx.params;
  const parsed = await parseJsonBody(req, characterUpdateSchema);
  if ("error" in parsed) return parsed.error;

  const updated = updateCharacter(id, parsed.data);
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
