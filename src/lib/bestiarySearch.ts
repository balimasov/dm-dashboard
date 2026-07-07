import "server-only";
import { AbilityScores, CreatureTemplate, CreatureTrait } from "./types";

/**
 * SRD stat-block lookup against Open5e's public monster API (no key
 * required). Every earlier version of this file guessed at the filter query
 * param (`?search=`) without ever seeing a real response — the sandbox this
 * is built in gets its CONNECT to api.open5e.com refused by network policy,
 * same as dndbeyond.com. This version is written against an actual response
 * (a real `GET /v1/monsters/?name__icontains=dragon` result, inspected
 * directly), which confirmed two things at once:
 *
 *  1. The real filter param is `name__icontains`, not `search` — Open5e
 *     silently ignores unrecognized query params rather than erroring, so
 *     `?search=` was never filtering anything; every request fell back to
 *     the default unfiltered/paginated listing. That's what caused both
 *     symptoms reported after the param was still wrong: results looking
 *     like an alphabetical slice unrelated to the query, and search taking
 *     15-20 seconds (because with no real filter, finding a match required
 *     this file's own code to page through hundreds of unrelated creatures
 *     itself). With the real param, a single request already returns just
 *     the matching creatures — no multi-page scan needed any more.
 *  2. The field shapes this file's mapper already assumed (flat
 *     `armor_class`/`hit_points`/`strength`.../`strength_save`, a nested
 *     `speed: {walk, fly, ...}`, string `senses`/`languages`/
 *     `damage_resistances`/`damage_immunities`/`condition_immunities`,
 *     array `actions`/`special_abilities`/`bonus_actions`/`reactions`/
 *     `legendary_actions` with `{name, desc}` entries) were already
 *     correct — the reason "everything but HP/saves/actions" looked empty
 *     wasn't the mapping, it was that `?search=` requests kept returning
 *     the wrong creatures (or none) to map in the first place. One real
 *     bug *was* found this way, though: `strength_save` etc. come back as
 *     JSON `null` (not absent) when a creature isn't proficient in that
 *     save — `Number(null)` is `0`, which used to be read as an explicit
 *     "+0 override" instead of "no override, use the plain modifier".
 */
const OPEN5E_ENDPOINTS = ["https://api.open5e.com/monsters/", "https://api.open5e.com/v2/creatures/"];
const MAX_RESULTS = 15;

function get(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

/** Tries each path in order, returning the first one that resolves to a usable number. Explicit `null` (e.g. a save with no override) is skipped rather than coerced to 0. */
function firstNumber(obj: unknown, paths: string[], fallback: number): number {
  for (const path of paths) {
    const raw = get(obj, path);
    if (raw == null) continue;
    const n = Number(Array.isArray(raw) ? get(raw[0], "value") : raw);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

/** Same as a plain string field, but also accepts an array of strings (joined) — a couple of stat-block fields come back as lists in some schema variants. */
function firstString(obj: unknown, paths: string[]): string | undefined {
  for (const path of paths) {
    const raw = get(obj, path);
    if (typeof raw === "string" && raw.trim()) return raw.trim();
    if (Array.isArray(raw) && raw.length > 0 && raw.every((x) => typeof x === "string")) {
      const joined = (raw as string[]).join(", ").trim();
      if (joined) return joined;
    }
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

/** Real API gives challenge rating as display text ("17", "1/4") in `challenge_rating`, with a parallel decimal `cr` (17.0) alongside it — text wins when both are present. */
function toChallengeRating(m: Record<string, unknown>): string | undefined {
  const text = firstString(m, ["challenge_rating", "challenge_rating_text"]);
  if (text) return text;
  const decimal = firstNumber(m, ["cr", "challenge_rating_decimal"], NaN);
  if (!Number.isFinite(decimal)) return undefined;
  const FRACTIONS: Record<number, string> = { 0: "0", 0.125: "1/8", 0.25: "1/4", 0.5: "1/2" };
  return FRACTIONS[decimal] ?? String(decimal);
}

const ABILITY_PATHS: Record<keyof AbilityScores, string[]> = {
  str: ["strength", "abilities.strength", "stats.strength"],
  dex: ["dexterity", "abilities.dexterity", "stats.dexterity"],
  con: ["constitution", "abilities.constitution", "stats.constitution"],
  int: ["intelligence", "abilities.intelligence", "stats.intelligence"],
  wis: ["wisdom", "abilities.wisdom", "stats.wisdom"],
  cha: ["charisma", "abilities.charisma", "stats.charisma"],
};

const SAVE_PATHS: Record<keyof AbilityScores, string[]> = {
  str: ["strength_save", "saving_throws.strength"],
  dex: ["dexterity_save", "saving_throws.dexterity"],
  con: ["constitution_save", "saving_throws.constitution"],
  int: ["intelligence_save", "saving_throws.intelligence"],
  wis: ["wisdom_save", "saving_throws.wisdom"],
  cha: ["charisma_save", "saving_throws.charisma"],
};

/** Candidate source-array keys per stat-block section — tried in order, first non-empty wins. `special_abilities` is the real API's name for what this app calls "traits". */
const TRAIT_GROUP_PATHS: Record<NonNullable<CreatureTrait["group"]>, string[]> = {
  trait: ["special_abilities", "traits"],
  action: ["actions"],
  bonusAction: ["bonus_actions", "bonusActions"],
  reaction: ["reactions"],
  legendary: ["legendary_actions", "legendaryActions"],
};

function mapTraitGroup(m: Record<string, unknown>, group: NonNullable<CreatureTrait["group"]>): CreatureTrait[] {
  for (const path of TRAIT_GROUP_PATHS[group]) {
    const entries = get(m, path);
    if (!Array.isArray(entries) || entries.length === 0) continue;
    const mapped = entries
      .filter((t): t is Record<string, unknown> => typeof (t as { name?: unknown })?.name === "string")
      .map((t) => ({
        name: t.name as string,
        description: firstString(t, ["desc", "description", "text"]),
        group,
      }));
    if (mapped.length > 0) return mapped;
  }
  return [];
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
    ...mapTraitGroup(m, "trait"),
    ...mapTraitGroup(m, "action"),
    ...mapTraitGroup(m, "bonusAction"),
    ...mapTraitGroup(m, "reaction"),
    ...mapTraitGroup(m, "legendary"),
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
    challengeRating: toChallengeRating(m),
    damageVulnerabilities: firstString(m, ["damage_vulnerabilities"]),
    damageResistances: firstString(m, ["damage_resistances"]),
    damageImmunities: firstString(m, ["damage_immunities"]),
    conditionImmunities: firstString(m, ["condition_immunities"]),
    traits,
    origin: "srd",
  };
}

/** One filtered request per endpoint — `name__icontains` does the actual filtering server-side now, so there's no need to page through unrelated results hoping for a match. */
async function fetchOpen5e(base: string, query: string): Promise<Array<Record<string, unknown>>> {
  const url = `${base}?name__icontains=${encodeURIComponent(query)}`;
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch (err) {
    console.error(`[bestiarySearch] fetch failed for ${url}:`, err);
    return [];
  }
  if (!res.ok) {
    console.error(`[bestiarySearch] ${url} responded ${res.status} ${res.statusText}`);
    return [];
  }

  const json: unknown = await res.json().catch((err) => {
    console.error(`[bestiarySearch] failed to parse JSON from ${url}:`, err);
    return null;
  });
  if (json == null) return [];

  return Array.isArray((json as { results?: unknown }).results)
    ? ((json as { results: unknown[] }).results as Array<Record<string, unknown>>)
    : Array.isArray(json)
      ? (json as Array<Record<string, unknown>>)
      : [];
}

/** Belt-and-suspenders re-sort by relevance (exact match, then prefix, then substring) — a no-op re-ordering when the server's own filter already did the work, but keeps results sane if a future endpoint's filter param turns out to be looser than expected. */
function rankByQuery(templates: CreatureTemplate[], query: string): CreatureTemplate[] {
  const q = query.trim().toLowerCase();
  return templates
    .filter((t) => t.name.toLowerCase().includes(q))
    .sort((a, b) => {
      const an = a.name.toLowerCase();
      const bn = b.name.toLowerCase();
      const rank = (n: string) => (n === q ? 0 : n.startsWith(q) ? 1 : 2);
      const diff = rank(an) - rank(bn);
      return diff !== 0 ? diff : an.localeCompare(bn);
    });
}

export async function searchSrdMonsters(query: string): Promise<CreatureTemplate[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  for (const base of OPEN5E_ENDPOINTS) {
    const raw = await fetchOpen5e(base, trimmed);
    const mapped = raw.map(mapOpen5eMonster).filter((t): t is CreatureTemplate => t !== null);
    const ranked = rankByQuery(mapped, trimmed);
    if (ranked.length > 0) return ranked.slice(0, MAX_RESULTS);
  }
  return [];
}
