import "server-only";
import { AbilityScores, CreatureTemplate, CreatureTrait } from "./types";

/**
 * Best-effort SRD stat-block lookup against Open5e's public monster API (no
 * key required). Unverified against a live response — the sandbox this was
 * built in has outbound access to api.open5e.com blocked by its network
 * policy (confirmed: the egress proxy 403s/refuses the CONNECT to that host,
 * same as it does for dndbeyond.com), so every round of this file has been
 * written against remembered/documented shapes rather than a real request.
 *
 * Round 4 confirmed the v1/v2 fallback got *something* responding again, but
 * surfaced two more issues, still without a live response to verify against:
 *  - Results looked alphabetical and unrelated to the query — meaning
 *    whichever endpoint answers may not honor `?search=` as a filter (or
 *    uses a different param name). Since that can't be confirmed, this
 *    version stops trusting the remote "search" to do any filtering at all:
 *    it pages through up to a few hundred candidates and filters/sorts them
 *    itself by name match against the query. If the server *does* filter
 *    correctly this is a no-op (first page already matches); if it doesn't,
 *    this is the only thing standing between the user and a random slice of
 *    the whole bestiary.
 *  - Senses/languages/resistances/immunities/actions were coming back empty
 *    even when other fields worked, meaning those fields live under paths
 *    this mapper wasn't trying. Widened the candidate paths for all of
 *    these and added resistance/immunity/vulnerability fields that didn't
 *    exist in the data model before this round at all.
 */
const OPEN5E_ENDPOINTS = ["https://api.open5e.com/monsters/", "https://api.open5e.com/v2/creatures/"];
const MAX_PAGES = 5;
const PAGE_SIZE = 100;
const MAX_RESULTS = 15;

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

/** Same as a plain string field, but also accepts an array of strings (joined) — several stat-block fields (senses, resistances...) come back as lists in some schema versions. */
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

/** Some schema versions give challenge rating as a decimal number (0.25) instead of display text ("1/4"). */
function toChallengeRating(m: Record<string, unknown>): string | undefined {
  const text = firstString(m, ["challenge_rating", "challenge_rating_text", "cr"]);
  if (text) return text;
  const decimal = firstNumber(m, ["challenge_rating_decimal", "cr_decimal"], NaN);
  if (!Number.isFinite(decimal)) return undefined;
  const FRACTIONS: Record<number, string> = { 0: "0", 0.125: "1/8", 0.25: "1/4", 0.5: "1/2" };
  return FRACTIONS[decimal] ?? String(decimal);
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

/** Candidate source-array keys per stat-block section — tried in order, first non-empty wins. */
const TRAIT_GROUP_PATHS: Record<NonNullable<CreatureTrait["group"]>, string[]> = {
  trait: ["special_abilities", "traits", "abilities"],
  action: ["actions"],
  bonusAction: ["bonus_actions", "bonusActions"],
  reaction: ["reactions"],
  legendary: ["legendary_actions", "legendaryActions", "legendary_actions_list"],
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
    senses: firstString(m, ["senses", "senses_list"]),
    languages: firstString(m, ["languages", "languages_list"]),
    challengeRating: toChallengeRating(m),
    damageVulnerabilities: firstString(m, ["damage_vulnerabilities", "vulnerabilities"]),
    damageResistances: firstString(m, ["damage_resistances", "resistances"]),
    damageImmunities: firstString(m, ["damage_immunities", "immunities"]),
    conditionImmunities: firstString(m, ["condition_immunities", "condition_immunities_list"]),
    traits,
    origin: "srd",
  };
}

/** Pages through one Open5e endpoint, collecting up to `MAX_PAGES * PAGE_SIZE` raw creature objects — not trusting the server to have actually filtered by `search` (see file-level note). */
async function fetchOpen5e(base: string, query: string): Promise<Array<Record<string, unknown>>> {
  const all: Array<Record<string, unknown>> = [];
  let url: string | null = `${base}?search=${encodeURIComponent(query)}&limit=${PAGE_SIZE}`;

  for (let page = 0; page < MAX_PAGES && url; page++) {
    let res: Response;
    try {
      res = await fetch(url, { cache: "no-store" });
    } catch (err) {
      console.error(`[bestiarySearch] fetch failed for ${url}:`, err);
      break;
    }
    if (!res.ok) {
      console.error(`[bestiarySearch] ${url} responded ${res.status} ${res.statusText}`);
      break;
    }

    const json: unknown = await res.json().catch((err) => {
      console.error(`[bestiarySearch] failed to parse JSON from ${url}:`, err);
      return null;
    });
    if (json == null) break;

    const results = Array.isArray((json as { results?: unknown }).results)
      ? ((json as { results: unknown[] }).results as Array<Record<string, unknown>>)
      : Array.isArray(json)
        ? (json as Array<Record<string, unknown>>)
        : [];
    all.push(...results);

    const next = (json as { next?: unknown }).next;
    url = typeof next === "string" && next.startsWith("http") ? next : null;
    if (results.length === 0) break;
  }

  return all;
}

/** Client-side relevance filter/sort — the remote "search" query param may not actually filter (see file-level note), so this is what actually guarantees the query is respected. Exact name match first, then prefix match, then substring, alphabetical within each tier. */
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
