import { NextResponse } from "next/server";
import { addCharacterFromUrl, listCharacters } from "@/lib/db";
import { extractDndBeyondCharacterId } from "@/lib/types";

export async function GET() {
  return NextResponse.json(listCharacters());
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url.trim() : "";

  if (!url || !extractDndBeyondCharacterId(url)) {
    return NextResponse.json(
      { error: "Невірний лінк на D&D Beyond." },
      { status: 400 }
    );
  }

  const ddbId = extractDndBeyondCharacterId(url);
  const existing = listCharacters().find(
    (c) => c.dndBeyondUrl && extractDndBeyondCharacterId(c.dndBeyondUrl) === ddbId
  );
  if (existing) {
    return NextResponse.json({ error: "Цей персонаж вже додано." }, { status: 409 });
  }

  const character = addCharacterFromUrl(url);
  return NextResponse.json(character, { status: 201 });
}
