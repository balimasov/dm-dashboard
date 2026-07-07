import { NextResponse } from "next/server";
import { createCreature, listCreatures, upsertBestiaryTemplate } from "@/lib/db";
import { AbilityScores, CreatureTrait } from "@/lib/types";

const DEFAULT_STATS: AbilityScores = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };

export async function GET(req: Request) {
  const campaignId = new URL(req.url).searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId query param is required." }, { status: 400 });
  }
  return NextResponse.json(listCreatures(campaignId));
}

/**
 * `templateName` (the creature's actual type, e.g. "Unicorn") is required and
 * distinct from `name` (an optional in-play nickname, e.g. "Thunder" — falls
 * back to `templateName` if omitted): the bestiary is keyed by the former, so
 * two differently-named Unicorns owned by two different characters both
 * save/reuse the same "Unicorn" stat block instead of creating duplicates.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const campaignId = typeof body?.campaignId === "string" ? body.campaignId : "";
  const templateName = typeof body?.templateName === "string" ? body.templateName.trim() : "";

  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required." }, { status: 400 });
  }
  if (!templateName) {
    return NextResponse.json({ error: "templateName is required." }, { status: 400 });
  }

  const name = (typeof body?.name === "string" ? body.name.trim() : "") || templateName;
  const ac = Number(body?.ac) || 10;
  const maxHp = Number(body?.maxHp) || 1;
  const speed = Number(body?.speed) || 30;
  const stats: AbilityScores = { ...DEFAULT_STATS, ...(body?.stats ?? {}) };
  const traits: CreatureTrait[] = Array.isArray(body?.traits)
    ? body.traits.filter((t: unknown): t is CreatureTrait => Boolean((t as CreatureTrait)?.name))
    : [];
  const creatureType = typeof body?.creatureType === "string" ? body.creatureType : undefined;
  const size = typeof body?.size === "string" ? body.size : undefined;
  const templateId = typeof body?.templateId === "string" ? body.templateId : undefined;

  const creature = createCreature({
    campaignId,
    templateId,
    name,
    creatureType,
    size,
    ac,
    hp: Number(body?.hp) || maxHp,
    maxHp,
    tempHp: 0,
    speed,
    stats,
    traits,
    conditions: [],
    ownerCharacterId: typeof body?.ownerCharacterId === "string" ? body.ownerCharacterId : undefined,
    source: typeof body?.source === "string" ? body.source : undefined,
  });

  // Saving the stat block to the shared bestiary is automatic, not a
  // separate step — whether these stats came from a fresh SRD search or
  // were typed in by hand, the next time any character needs this creature
  // it should already be there.
  upsertBestiaryTemplate({
    name: templateName,
    creatureType,
    size,
    ac,
    maxHp,
    speed,
    stats,
    traits,
    origin: templateId?.startsWith("srd-") ? "srd" : "custom",
  });

  return NextResponse.json(creature, { status: 201 });
}
