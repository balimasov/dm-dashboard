import { NextResponse } from "next/server";
import { getCharacter, getCreature, listAssistantQueries } from "@/lib/db";

/**
 * GET `/api/assistant/history?campaignId=&characterId=` (or `&creatureId=`)
 * — the Turn Advisor panel's History tab. No role gate beyond the app's
 * normal session check (`proxy.ts`), same rationale as `/assistant/suggest`
 * itself: a player looking at a character/creature they can already see on
 * the dashboard isn't shown anything the UI doesn't already reveal.
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const campaignId = params.get("campaignId");
  const characterId = params.get("characterId");
  const creatureId = params.get("creatureId");

  if (!campaignId || (!characterId && !creatureId) || (characterId && creatureId)) {
    return NextResponse.json({ error: "Provide campaignId and exactly one of characterId/creatureId." }, { status: 400 });
  }

  if (characterId) {
    const character = getCharacter(characterId);
    if (!character || character.campaignId !== campaignId) {
      return NextResponse.json({ error: "Character not found." }, { status: 404 });
    }
    return NextResponse.json(listAssistantQueries(characterId));
  }

  const creature = getCreature(creatureId!);
  if (!creature || creature.campaignId !== campaignId) {
    return NextResponse.json({ error: "Creature not found." }, { status: 404 });
  }
  return NextResponse.json(listAssistantQueries(creatureId!));
}
