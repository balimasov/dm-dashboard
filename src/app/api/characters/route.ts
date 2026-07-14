import { NextResponse } from "next/server";
import { addCharacterFromUrl, listCharacters } from "@/lib/db";
import { extractDndBeyondCharacterId } from "@/lib/dndBeyondUrl";

export async function GET(req: Request) {
  const campaignId = new URL(req.url).searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId query param is required." }, { status: 400 });
  }
  return NextResponse.json(listCharacters(campaignId));
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  const campaignId = typeof body?.campaignId === "string" ? body.campaignId : "";

  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required." }, { status: 400 });
  }
  if (!url || !extractDndBeyondCharacterId(url)) {
    return NextResponse.json(
      { error: "Invalid D&D Beyond link." },
      { status: 400 }
    );
  }

  const ddbId = extractDndBeyondCharacterId(url);
  const existing = listCharacters(campaignId).find(
    (c) => c.dndBeyondUrl && extractDndBeyondCharacterId(c.dndBeyondUrl) === ddbId
  );
  if (existing) {
    return NextResponse.json({ error: "This character has already been added." }, { status: 409 });
  }

  const character = addCharacterFromUrl(url, campaignId);
  return NextResponse.json(character, { status: 201 });
}
