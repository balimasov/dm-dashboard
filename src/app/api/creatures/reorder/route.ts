import { NextResponse } from "next/server";
import { reorderCreatures } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const orderedIds = body?.orderedIds;
  if (!Array.isArray(orderedIds) || orderedIds.some((id) => typeof id !== "string")) {
    return NextResponse.json({ error: "orderedIds must be an array of strings." }, { status: 400 });
  }

  reorderCreatures(orderedIds);
  return NextResponse.json({ ok: true });
}
