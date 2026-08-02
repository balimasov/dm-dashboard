import { NextResponse } from "next/server";
import { deleteAssistantMessages, getCharacter, getCreature, listAssistantMessages } from "@/lib/db";

/** Shared campaignId/characterId-xor-creatureId validation for both handlers below. */
function resolveEntity(params: URLSearchParams): { entityId: string } | { error: NextResponse } {
  const campaignId = params.get("campaignId");
  const characterId = params.get("characterId");
  const creatureId = params.get("creatureId");

  if (!campaignId || (!characterId && !creatureId) || (characterId && creatureId)) {
    return { error: NextResponse.json({ error: "Provide campaignId and exactly one of characterId/creatureId." }, { status: 400 }) };
  }

  if (characterId) {
    const character = getCharacter(characterId);
    if (!character || character.campaignId !== campaignId) {
      return { error: NextResponse.json({ error: "Character not found." }, { status: 404 }) };
    }
    return { entityId: characterId };
  }

  const creature = getCreature(creatureId!);
  if (!creature || creature.campaignId !== campaignId) {
    return { error: NextResponse.json({ error: "Creature not found." }, { status: 404 }) };
  }
  return { entityId: creatureId! };
}

/**
 * GET `/api/assistant/history?campaignId=&characterId=` (or `&creatureId=`)
 * — the Turn Advisor panel's own conversation, chronological (oldest
 * first — the same order it renders in). No role gate beyond the app's
 * normal session check (`proxy.ts`), same rationale as `/assistant/suggest`
 * itself: a player looking at a character/creature they can already see on
 * the dashboard isn't shown anything the UI doesn't already reveal.
 */
export async function GET(req: Request) {
  const resolved = resolveEntity(new URL(req.url).searchParams);
  if ("error" in resolved) return resolved.error;
  return NextResponse.json(listAssistantMessages(resolved.entityId));
}

/** DELETE `/api/assistant/history?campaignId=&characterId=` (or `&creatureId=`) — clears this entity's entire conversation. Irreversible; the frontend gates it behind a confirm(). */
export async function DELETE(req: Request) {
  const resolved = resolveEntity(new URL(req.url).searchParams);
  if ("error" in resolved) return resolved.error;
  deleteAssistantMessages(resolved.entityId);
  return NextResponse.json({ ok: true });
}
