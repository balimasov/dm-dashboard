import { NextResponse } from "next/server";
import { reorderCreatures } from "@/lib/db";
import { reorderBodySchema } from "@/lib/schemas";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const result = reorderBodySchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "orderedIds must be an array of strings." }, { status: 400 });
  }

  reorderCreatures(result.data.orderedIds);
  return NextResponse.json({ ok: true });
}
