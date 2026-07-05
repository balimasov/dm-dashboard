import { NextResponse } from "next/server";
import { reorderCharacters } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const orderedIds = body?.orderedIds;
  if (!Array.isArray(orderedIds) || orderedIds.some((id) => typeof id !== "string")) {
    return NextResponse.json({ error: "orderedIds must be an array of strings." }, { status: 400 });
  }

  const characters = reorderCharacters(orderedIds);
  return NextResponse.json(characters);
}
