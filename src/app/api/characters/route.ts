import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { parseJsonBody } from "@/lib/apiRoute";
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

  const parsed = await parseJsonBody(req, characterCreateSchema, "campaignId is required.");
  if ("error" in parsed) return parsed.error;
  const { campaignId } = parsed.data;
  const url = parsed.data.url.trim();

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
