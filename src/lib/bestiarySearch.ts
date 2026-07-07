import "server-only";
import { AbilityScores, CreatureTemplate, CreatureTrait } from "./types";

/**
 * Best-effort SRD stat-block lookup against Open5e's public monster API (no
 * key required). Unverified against a live response as of the first version
 * of this file — the sandbox this was built in has outbound access to
 * api.open5e.com blocked by its network policy, the same way D&D Beyond is —
 * and the first version's mapping turned out to only match Open5e's older
 * (v1) field names, so every stat silently fell back to a default (1 HP, 10
 * across every ability) once the live API didn't match. This version reads
 * each stat through a list of candidate paths (covering both the v1 shape
 * this was originally written against and the more nested v2-style shape —
 * e.g. `abilities.strength` instead of a flat `strength`, `armor_class` as a
 * list of `{value}` objects instead of a bare number) so a schema drift in
 * either direction degrades to "one field missing" instead of "everything is
 * a default". Still unverified against a real response; if fields are still
 * wrong, the actual shape needs to be pulled from a live request and the
 * candidate paths below adjusted to match it.
 */
const OPEN5E_BASE = "https://api.open5e.com/monsters/";

function get(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

/** Tries each path in order, returning the first one that resolves to a usable number. */
function firstNumber(obj: unknown, paths: string[], fallback: number): number {
  for (const path of paths) {
    const raw = get(obj, path);
    const n = Number(Array.isArray(raw) ? get(raw[0], "value") : raw);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function firstString(obj: unknown, paths: string[]): string | undefined {
  for (const path of paths) {
    const raw = get(obj, path);
    if (typeof raw === "string" && raw.trim()) return raw.trim();
  }
  return undefined;
}

function toSpeed(m: Record<string, unknown>): number {
  const direct = firstNumber(m, ["speed.walk", "walk_speed", "speed_walk"], NaN);
  if (Number.isFinite(direct)) return direct;
  const speed = m.speed;
  if (typeof speed === "number") return speed;
  if (typeof speed === "string") {
    const match = speed.match(/(\d+)\s*ft/);
    if (match) return Number(match[1]);
  }
  return 30;
}

const ABILITY_PATHS: Record<keyof AbilityScores, string[]> = {
  str: ["strength", "abilities.strength", "stats.strength", "str"],
  dex: ["dexterity", "abilities.dexterity", "stats.dexterity", "dex"],
  con: ["constitution", "abilities.constitution", "stats.constitution", "con"],
  int: ["intelligence", "abilities.intelligence", "stats.intelligence", "int"],
  wis: ["wisdom", "abilities.wisdom", "stats.wisdom", "wis"],
  cha: ["charisma", "abilities.charisma", "stats.charisma", "cha"],
};

const SAVE_PATHS: Record<keyof AbilityScores, string[]> = {
  str: ["strength_save", "saving_throws.strength", "saves.str"],
  dex: ["dexterity_save", "saving_throws.dexterity", "saves.dex"],
  con: ["constitution_save", "saving_throws.constitution", "saves.con"],
  int: ["intelligence_save", "saving_throws.intelligence", "saves.int"],
  wis: ["wisdom_save", "saving_throws.wisdom", "saves.wis"],
  cha: ["charisma_save", "saving_throws.charisma", "saves.cha"],
};

function mapTraitGroup(entries: unknown, group: CreatureTrait["group"]): CreatureTrait[] {
  if (!Array.isArray(entries)) return [];
  return entries
    .filter((t): t is Record<string, unknown> => typeof (t as { name?: unknown })?.name === "string")
    .map((t) => ({
      name: t.name as string,
      description: typeof t.desc === "string" ? t.desc : typeof t.description === "string" ? t.description : undefined,
      group,
    }));
}

function mapOpen5eMonster(m: Record<string, unknown>): CreatureTemplate | null {
  const name = typeof m.name === "string" ? m.name.trim() : "";
  if (!name) return null;

  const stats: AbilityScores = {
    str: firstNumber(m, ABILITY_PATHS.str, 10),
    dex: firstNumber(m, ABILITY_PATHS.dex, 10),
    con: firstNumber(m, ABILITY_PATHS.con, 10),
    int: firstNumber(m, ABILITY_PATHS.int, 10),
    wis: firstNumber(m, ABILITY_PATHS.wis, 10),
    cha: firstNumber(m, ABILITY_PATHS.cha, 10),
  };

  const savingThrows: Partial<AbilityScores> = {};
  (Object.keys(SAVE_PATHS) as Array<keyof AbilityScores>).forEach((key) => {
    const value = firstNumber(m, SAVE_PATHS[key], NaN);
    if (Number.isFinite(value)) savingThrows[key] = value;
  });

  const traits = [
    ...mapTraitGroup(m.special_abilities, "trait"),
    ...mapTraitGroup(m.actions, "action"),
    ...mapTraitGroup(m.bonus_actions, "bonusAction"),
    ...mapTraitGroup(m.reactions, "reaction"),
    ...mapTraitGroup(m.legendary_actions, "legendary"),
  ].slice(0, 24);

  const slug = typeof m.slug === "string" && m.slug ? m.slug : name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const size = firstString(m, ["size"]);
  const type = firstString(m, ["type"]);
  const subtype = firstString(m, ["subtype"]);

  return {
    id: `srd-${slug}`,
    name,
    creatureType: [type, subtype].filter(Boolean).join(" ") || undefined,
    size,
    alignment: firstString(m, ["alignment"]),
    ac: firstNumber(m, ["armor_class", "ac"], 10),
    maxHp: firstNumber(m, ["hit_points", "hp"], 1),
    speed: toSpeed(m),
    stats,
    ...(Object.keys(savingThrows).length > 0 ? { savingThrows } : {}),
    senses: firstString(m, ["senses"]),
    languages: firstString(m, ["languages"]),
    challengeRating: firstString(m, ["challenge_rating", "cr"]),
    traits,
    origin: "srd",
  };
}

export async function searchSrdMonsters(query: string): Promise<CreatureTemplate[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  let res: Response;
  try {
    res = await fetch(`${OPEN5E_BASE}?search=${encodeURIComponent(trimmed)}&limit=10`, { cache: "no-store" });
  } catch {
    return [];
  }
  if (!res.ok) return [];

  const json = await res.json().catch(() => null);
  const results = Array.isArray((json as { results?: unknown } | null)?.results)
    ? ((json as { results: unknown[] }).results as Array<Record<string, unknown>>)
    : Array.isArray(json)
      ? (json as Array<Record<string, unknown>>)
      : [];

  return results
    .map(mapOpen5eMonster)
    .filter((t): t is CreatureTemplate => t !== null);
}
