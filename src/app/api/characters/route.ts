import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { addCharacterFromUrl, listCharacters } from "@/lib/db";
import { extractDndBeyondCharacterId } from "@/lib/dndBeyondUrl";
import { characterCreateSchema } from "@/lib/schemas";

export async function GET(req: Request) {
  const campaignId = new URL(req.url).searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId query param is required." }, { status: 400 });
  }
  return NextResponse.json(listCharacters(campaignId));
}

/** Adding a character is DM-only — the only UI path to this is `CampaignRosterEditor`, embedded in the Settings modal that `openSettings` refuses to open for anyone but `isDm`. */
export async function POST(req: Request) {
  const denied = await requireRole("dm");
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const result = characterCreateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "campaignId is required." }, { status: 400 });
  }
  const { campaignId } = result.data;
  const url = result.data.url.trim();

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
