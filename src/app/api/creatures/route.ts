import { NextResponse } from "next/server";
import { getSessionRole, requireRole } from "@/lib/auth";
import { createCreature, listCreatures } from "@/lib/db";
import { AbilityScores, CreatureCategory, CreatureTrait } from "@/lib/types";

const DEFAULT_STATS: AbilityScores = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
const VALID_CATEGORIES: CreatureCategory[] = ["companion", "enemy", "npc"];

function parseCategory(raw: unknown): CreatureCategory {
  return VALID_CATEGORIES.includes(raw as CreatureCategory) ? (raw as CreatureCategory) : "companion";
}

function parseSavingThrows(raw: unknown): Partial<AbilityScores> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const result: Partial<AbilityScores> = {};
  (["str", "dex", "con", "int", "wis", "cha"] as const).forEach((key) => {
    const value = Number((raw as Record<string, unknown>)[key]);
    if (Number.isFinite(value)) result[key] = value;
  });
  return Object.keys(result).length > 0 ? result : undefined;
}

function parseOptionalNumber(raw: unknown): number | undefined {
  if (raw === undefined || raw === null) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

/** A player never sees Enemies/NPCs in the UI (see `DashboardClient.tsx`'s own comment on that split) — filtered out here too, not just hidden client-side, so a player session can't read them straight off this endpoint either. */
export async function GET(req: Request) {
  const campaignId = new URL(req.url).searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId query param is required." }, { status: 400 });
  }
  const creatures = listCreatures(campaignId);
  const role = await getSessionRole();
  const visible = role === "dm" ? creatures : creatures.filter((c) => c.category === "companion");
  return NextResponse.json(visible);
}

/**
 * `templateName` (the creature's actual type, e.g. "Unicorn") is required and
 * distinct from `name` (an optional in-play nickname, e.g. "Thunder" — falls
 * back to `templateName` if omitted): the bestiary is keyed by the former, so
 * two differently-named Unicorns owned by two different characters both
 * save/reuse the same "Unicorn" stat block instead of creating duplicates.
 *
 * DM-only regardless of category — every add flow (companion included) only
 * exists inside `CreatureRosterEditor`, itself only reachable through the
 * DM-gated Settings modal (`EmptyRosterState`'s own "Open Settings" action is
 * `isDm ? ... : undefined` even for the Companions section).
 */
export async function POST(req: Request) {
  const denied = await requireRole("dm");
  if (denied) return denied;

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
  const savingThrows = parseSavingThrows(body?.savingThrows);
  const traits: CreatureTrait[] = Array.isArray(body?.traits)
    ? body.traits.filter((t: unknown): t is CreatureTrait => Boolean((t as CreatureTrait)?.name))
    : [];
  const creatureType = typeof body?.creatureType === "string" ? body.creatureType : undefined;
  const size = typeof body?.size === "string" ? body.size : undefined;
  const alignment = typeof body?.alignment === "string" ? body.alignment : undefined;
  const senses = typeof body?.senses === "string" ? body.senses : undefined;
  const languages = typeof body?.languages === "string" ? body.languages : undefined;
  const challengeRating = typeof body?.challengeRating === "string" ? body.challengeRating : undefined;
  const damageVulnerabilities = typeof body?.damageVulnerabilities === "string" ? body.damageVulnerabilities : undefined;
  const damageResistances = typeof body?.damageResistances === "string" ? body.damageResistances : undefined;
  const damageImmunities = typeof body?.damageImmunities === "string" ? body.damageImmunities : undefined;
  const conditionImmunities = typeof body?.conditionImmunities === "string" ? body.conditionImmunities : undefined;
  const armorDesc = typeof body?.armorDesc === "string" ? body.armorDesc : undefined;
  const hitDice = typeof body?.hitDice === "string" ? body.hitDice : undefined;
  const speedDetail = typeof body?.speedDetail === "string" ? body.speedDetail : undefined;
  const skills = typeof body?.skills === "string" ? body.skills : undefined;
  const initiativeBonus = parseOptionalNumber(body?.initiativeBonus);
  const experiencePoints = parseOptionalNumber(body?.experiencePoints);
  const templateId = typeof body?.templateId === "string" ? body.templateId : undefined;

  const avatarUrl = typeof body?.avatarUrl === "string" ? body.avatarUrl : undefined;

  const creature = createCreature({
    campaignId,
    templateId,
    templateName,
    name,
    category: parseCategory(body?.category),
    avatarUrl,
    creatureType,
    size,
    alignment,
    ac,
    armorDesc,
    hp: parseOptionalNumber(body?.hp) ?? maxHp,
    maxHp,
    hitDice,
    tempHp: 0,
    speed,
    speedDetail,
    initiativeBonus,
    stats,
    savingThrows,
    senses,
    languages,
    challengeRating,
    experiencePoints,
    skills,
    damageVulnerabilities,
    damageResistances,
    damageImmunities,
    conditionImmunities,
    traits,
    conditions: [],
    exhaustion: 0,
    ownerCharacterId: typeof body?.ownerCharacterId === "string" ? body.ownerCharacterId : undefined,
    source: typeof body?.source === "string" ? body.source : undefined,
  });

  return NextResponse.json(creature, { status: 201 });
}
