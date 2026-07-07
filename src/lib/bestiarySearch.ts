import "server-only";
import { AbilityScores, CreatureTemplate, CreatureTrait } from "./types";

/**
 * Best-effort SRD stat-block lookup against Open5e's public monster API (no
 * key required). Unverified against a live response — the sandbox this was
 * built in has outbound access to api.open5e.com blocked by its network
 * policy (confirmed: the egress proxy 403s the CONNECT to that host, same as
 * it does for dndbeyond.com), so every round of this file has been written
 * against remembered/documented shapes rather than a real request.
 *
 * Round 2 fixed a mapping-only bug (fields read from the wrong paths, so
 * everything silently defaulted). Round 3's report — common SRD monsters
 * like "orc"/"goblin"/"imp" returning zero results, not just wrong stats —
 * points at the endpoint itself rather than the field mapping: Open5e's
 * `/monsters/` (v1) path may no longer exist now that a `/v2/creatures/`
 * API exists. Since that can't be confirmed from here either, both
 * endpoints are tried in turn (first whichever responds with results wins)
 * rather than betting on one. `console.error` on a non-OK response or fetch
 * failure so a real deployment's logs show *why* a search came back empty
 * instead of that being a silent dead end again.
 */
const OPEN5E_ENDPOINTS = ["https://api.open5e.com/monsters/", "https://api.open5e.com/v2/creatures/"];

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

async function fetchOpen5e(base: string, query: string): Promise<Array<Record<string, unknown>>> {
  let res: Response;
  try {
    res = await fetch(`${base}?search=${encodeURIComponent(query)}&limit=10`, { cache: "no-store" });
  } catch (err) {
    console.error(`[bestiarySearch] fetch failed for ${base}:`, err);
    return [];
  }
  if (!res.ok) {
    console.error(`[bestiarySearch] ${base} responded ${res.status} ${res.statusText}`);
    return [];
  }

  const json = await res.json().catch((err) => {
    console.error(`[bestiarySearch] failed to parse JSON from ${base}:`, err);
    return null;
  });
  if (Array.isArray((json as { results?: unknown } | null)?.results)) {
    return (json as { results: unknown[] }).results as Array<Record<string, unknown>>;
  }
  if (Array.isArray(json)) return json as Array<Record<string, unknown>>;
  return [];
}

export async function searchSrdMonsters(query: string): Promise<CreatureTemplate[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  for (const base of OPEN5E_ENDPOINTS) {
    const raw = await fetchOpen5e(base, trimmed);
    const mapped = raw.map(mapOpen5eMonster).filter((t): t is CreatureTemplate => t !== null);
    if (mapped.length > 0) return mapped;
  }
  return [];
}
