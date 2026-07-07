import "server-only";
import { AbilityScores, CreatureSearchHit, CreatureTemplate, CreatureTrait, abilityModifier } from "./types";

/**
 * SRD stat-block lookup against Open5e's v2 API, using the real two-step
 * flow confirmed from actual captured responses (not guessed): a search
 * hit only carries a name/CR/type preview, not a full stat block, so
 * finding a creature is:
 *
 *  1. `GET /v2/search/?schema=v2&query=<name>` — returns hits across every
 *     content type (creatures, spells, rules text...) and every source
 *     document. Each hit looks like:
 *     `{ document: {key, name}, object_pk, object_name, object: {cr, type,
 *     size}, object_model, route, ... }`. Filtered to `object_model ===
 *     "Creature"` (so a spell whose description mentions the query isn't
 *     treated as a monster) and `document.key === "srd-2024"` (the 2024
 *     SRD specifically — the same search covers "srd-2014", third-party
 *     documents, etc., which this app deliberately doesn't want).
 *  2. `GET /{route}{object_pk}/` (e.g. `v2/creatures/srd-2024_adult-red-dragon/`)
 *     — the full stat block, fetched lazily: only for the one hit the DM
 *     actually picks (`fetchSrdCreatureDetail`), not for every row in the
 *     list. A popular query can return upwards of a hundred creature hits,
 *     and eagerly fetching full detail for all of them would mean that many
 *     extra requests before the DM has even chosen one — the search hit's
 *     own `object` preview (cr/type/size) is already enough for the list.
 *
 * The v2 creature detail schema is entirely different from the v1
 * `/monsters/` list schema an earlier version of this file was written
 * against: ability scores/type/size/size are nested objects, saving
 * throws are always present (equal to the plain modifier when a creature
 * isn't proficient, rather than the v1 list's `null`), resistances and
 * immunities arrive as ready-made display strings, actions/bonus actions/
 * reactions/legendary actions are one merged `actions` array disambiguated
 * by an `action_type` field, and `traits` is separate. All of this is
 * mapped directly from a real captured `Adult Red Dragon` response, not
 * guessed.
 */
const OPEN5E_ORIGIN = "https://api.open5e.com";
const TARGET_DOCUMENT_KEY = "srd-2024";
const MAX_RESULTS = 100;

function get(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

/** Tries each path in order, returning the first one that resolves to a usable number. Explicit `null` is skipped rather than coerced to 0. */
function firstNumber(obj: unknown, paths: string[], fallback: number): number {
  for (const path of paths) {
    const raw = get(obj, path);
    if (raw == null) continue;
    const n = Number(raw);
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

const ABILITY_KEYS: Record<keyof AbilityScores, string> = {
  str: "strength",
  dex: "dexterity",
  con: "constitution",
  int: "intelligence",
  wis: "wisdom",
  cha: "charisma",
};

/** e.g. "40 ft., fly 80 ft., climb 40 ft." — the walk speed alone is returned separately as `speed` for the numeric field other UI relies on. */
function mapSpeed(m: Record<string, unknown>): { speed: number; speedDetail?: string } {
  const speedObj = (get(m, "speed") ?? {}) as Record<string, unknown>;
  const walk = firstNumber(speedObj, ["walk"], 30);
  const modes: string[] = [];
  (["fly", "swim", "climb", "burrow"] as const).forEach((mode) => {
    const v = Number(speedObj[mode]);
    if (Number.isFinite(v) && v > 0) modes.push(`${mode} ${v} ft.`);
  });
  const speedDetail = [`${walk} ft.`, ...modes].join(", ");
  return { speed: walk, speedDetail };
}

/** Combines the separate darkvision/blindsight/tremorsense/truesight ranges and passive Perception into one line, matching how a real stat block's Senses row reads. */
function combineSenses(m: Record<string, unknown>): string | undefined {
  const parts: string[] = [];
  const ranges: Array<[string, string]> = [
    ["darkvision_range", "darkvision"],
    ["blindsight_range", "blindsight"],
    ["tremorsense_range", "tremorsense"],
    ["truesight_range", "truesight"],
  ];
  ranges.forEach(([path, label]) => {
    const v = firstNumber(m, [path], NaN);
    if (Number.isFinite(v) && v > 0) parts.push(`${label} ${v} ft.`);
  });
  const passive = firstNumber(m, ["passive_perception"], NaN);
  if (Number.isFinite(passive)) parts.push(`passive Perception ${passive}`);
  return parts.length > 0 ? parts.join(", ") : undefined;
}

function titleCaseSkill(key: string): string {
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** e.g. "Perception +13, Stealth +6" from `{perception: 13, stealth: 6}`. */
function mapSkills(m: Record<string, unknown>): string | undefined {
  const skills = get(m, "skill_bonuses");
  if (!skills || typeof skills !== "object") return undefined;
  const parts = Object.entries(skills as Record<string, unknown>)
    .filter(([, v]) => typeof v === "number")
    .map(([k, v]) => `${titleCaseSkill(k)} ${(v as number) >= 0 ? "+" : ""}${v}`);
  return parts.length > 0 ? parts.join(", ") : undefined;
}

const CR_FRACTIONS: Record<number, string> = { 0: "0", 0.125: "1/8", 0.25: "1/4", 0.5: "1/2" };

function toChallengeRatingText(cr: unknown): string | undefined {
  if (typeof cr === "string" && cr.trim()) return cr.trim();
  if (typeof cr === "number" && Number.isFinite(cr)) return CR_FRACTIONS[cr] ?? String(cr);
  return undefined;
}

/** `traits` (name/desc) map straight across. `actions` merges what this app models as four separate groups (action/bonusAction/reaction/legendary), disambiguated by `action_type` — grouped first, then ordered by `order_in_statblock` within each group, since that field restarts from 0 per action_type rather than running across the whole array. */
function mapTraitsAndActions(m: Record<string, unknown>): CreatureTrait[] {
  const traitsRaw = Array.isArray(m.traits) ? m.traits : [];
  const traits: CreatureTrait[] = traitsRaw
    .filter((t): t is Record<string, unknown> => typeof (t as { name?: unknown })?.name === "string")
    .map((t) => ({
      name: t.name as string,
      description: firstString(t, ["desc", "description"]),
      group: "trait" as const,
    }));

  const GROUP_BY_TYPE: Record<string, NonNullable<CreatureTrait["group"]>> = {
    ACTION: "action",
    BONUS_ACTION: "bonusAction",
    REACTION: "reaction",
    LEGENDARY_ACTION: "legendary",
  };
  const actionsRaw = Array.isArray(m.actions) ? m.actions : [];
  const buckets: Partial<Record<string, Array<Record<string, unknown>>>> = {};
  actionsRaw.forEach((a) => {
    if (typeof (a as { name?: unknown })?.name !== "string") return;
    const type = String((a as Record<string, unknown>).action_type ?? "ACTION");
    (buckets[type] ??= []).push(a as Record<string, unknown>);
  });
  Object.values(buckets).forEach((list) =>
    list?.sort((a, b) => Number(a.order_in_statblock ?? 0) - Number(b.order_in_statblock ?? 0))
  );

  const actions: CreatureTrait[] = ["ACTION", "BONUS_ACTION", "REACTION", "LEGENDARY_ACTION"].flatMap((type) =>
    (buckets[type] ?? []).map((a) => ({
      name: a.name as string,
      description: firstString(a, ["desc", "description"]),
      group: GROUP_BY_TYPE[type],
    }))
  );

  return [...traits, ...actions].slice(0, 30);
}

function mapOpen5eV2Creature(m: Record<string, unknown>): CreatureTemplate | null {
  const name = typeof m.name === "string" ? m.name.trim() : "";
  if (!name) return null;

  const abilityScores = (get(m, "ability_scores") ?? {}) as Record<string, unknown>;
  const stats: AbilityScores = {
    str: firstNumber(abilityScores, [ABILITY_KEYS.str], 10),
    dex: firstNumber(abilityScores, [ABILITY_KEYS.dex], 10),
    con: firstNumber(abilityScores, [ABILITY_KEYS.con], 10),
    int: firstNumber(abilityScores, [ABILITY_KEYS.int], 10),
    wis: firstNumber(abilityScores, [ABILITY_KEYS.wis], 10),
    cha: firstNumber(abilityScores, [ABILITY_KEYS.cha], 10),
  };

  // Real API always includes a value per ability (equal to the plain modifier when not
  // proficient) rather than omitting it — only keep ones that actually differ.
  const savingThrowsRaw = (get(m, "saving_throws") ?? {}) as Record<string, unknown>;
  const savingThrows: Partial<AbilityScores> = {};
  (Object.keys(ABILITY_KEYS) as Array<keyof AbilityScores>).forEach((key) => {
    const raw = savingThrowsRaw[ABILITY_KEYS[key]];
    if (typeof raw === "number" && raw !== abilityModifier(stats[key])) savingThrows[key] = raw;
  });

  const { speed, speedDetail } = mapSpeed(m);
  const rai = (get(m, "resistances_and_immunities") ?? {}) as Record<string, unknown>;
  const initiativeBonus = firstNumber(m, ["initiative_bonus"], NaN);
  const experiencePoints = firstNumber(m, ["experience_points"], NaN);
  const slug = typeof m.key === "string" && m.key ? m.key : name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return {
    id: `srd-${slug}`,
    name,
    creatureType: firstString(m, ["type.name"]),
    size: firstString(m, ["size.name"]),
    alignment: firstString(m, ["alignment"]),
    ac: firstNumber(m, ["armor_class"], 10),
    armorDesc: firstString(m, ["armor_detail"]),
    maxHp: firstNumber(m, ["hit_points"], 1),
    hitDice: firstString(m, ["hit_dice"]),
    speed,
    speedDetail,
    ...(Number.isFinite(initiativeBonus) ? { initiativeBonus } : {}),
    stats,
    ...(Object.keys(savingThrows).length > 0 ? { savingThrows } : {}),
    senses: combineSenses(m),
    languages: firstString(m, ["languages.as_string"]),
    challengeRating: toChallengeRatingText(get(m, "challenge_rating")),
    ...(Number.isFinite(experiencePoints) ? { experiencePoints } : {}),
    skills: mapSkills(m),
    damageVulnerabilities: firstString(rai, ["damage_vulnerabilities_display"]),
    damageResistances: firstString(rai, ["damage_resistances_display"]),
    damageImmunities: firstString(rai, ["damage_immunities_display"]),
    conditionImmunities: firstString(rai, ["condition_immunities_display"]),
    traits: mapTraitsAndActions(m),
    origin: "srd",
  };
}

async function fetchJson(url: string): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch (err) {
    console.error(`[bestiarySearch] fetch failed for ${url}:`, err);
    return null;
  }
  if (!res.ok) {
    console.error(`[bestiarySearch] ${url} responded ${res.status} ${res.statusText}`);
    return null;
  }
  return res.json().catch((err) => {
    console.error(`[bestiarySearch] failed to parse JSON from ${url}:`, err);
    return null;
  });
}

/**
 * A big `limit` here matters: the search endpoint mixes every content type
 * (creatures, spells, rules text...) and every source document into one
 * paginated result set, and this app only wants a slice of that (2024 SRD
 * creatures) — a default/small page size can get eaten entirely by
 * non-matching hits before this file's own filtering ever sees the real
 * matches for a broad, popular query.
 */
const SEARCH_LIMIT = 5000;

async function fetchSearchResults(query: string): Promise<Array<Record<string, unknown>>> {
  const json = await fetchJson(
    `${OPEN5E_ORIGIN}/v2/search/?schema=v2&query=${encodeURIComponent(query)}&limit=${SEARCH_LIMIT}`
  );
  return Array.isArray((json as { results?: unknown } | null)?.results)
    ? ((json as { results: unknown[] }).results as Array<Record<string, unknown>>)
    : [];
}

/** Only real creature hits from the 2024 SRD — the same search also returns spells, rules text, other source documents, etc. */
function isTargetCreatureHit(item: Record<string, unknown>): boolean {
  return item.object_model === "Creature" && get(item, "document.key") === TARGET_DOCUMENT_KEY;
}

function rankByQuery<T extends { name: string }>(items: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  return items
    .filter((t) => t.name.toLowerCase().includes(q))
    .sort((a, b) => {
      const an = a.name.toLowerCase();
      const bn = b.name.toLowerCase();
      const rank = (n: string) => (n === q ? 0 : n.startsWith(q) ? 1 : 2);
      const diff = rank(an) - rank(bn);
      return diff !== 0 ? diff : an.localeCompare(bn);
    });
}

/**
 * Lightweight search only — no per-hit detail fetch. A search hit's own
 * `object` field already carries a preview (cr/type/size), which is enough
 * for the picker list; the full stat block is only fetched for whichever
 * one the DM actually picks, via `fetchSrdCreatureDetail`.
 */
export async function searchSrdCreatures(query: string): Promise<CreatureSearchHit[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const hits = (await fetchSearchResults(trimmed)).filter(isTargetCreatureHit);
  const named = hits
    .map((item): CreatureSearchHit | null => {
      const objectPk = firstString(item, ["object_pk"]);
      const name = firstString(item, ["object_name"]);
      if (!objectPk || !name) return null;
      const preview = (get(item, "object") ?? {}) as Record<string, unknown>;
      return {
        id: `srd-${objectPk}`,
        name,
        creatureType: firstString(preview, ["type"]),
        size: firstString(preview, ["size"]),
        challengeRating: toChallengeRatingText(preview.cr),
        origin: "srd",
      };
    })
    .filter((h): h is CreatureSearchHit => h !== null);

  return rankByQuery(named, trimmed).slice(0, MAX_RESULTS);
}

/** Fetches and maps the full stat block for one search hit, by the `id` `searchSrdCreatures` gave it. */
export async function fetchSrdCreatureDetail(id: string): Promise<CreatureTemplate | null> {
  const objectPk = id.startsWith("srd-") ? id.slice("srd-".length) : id;
  const json = await fetchJson(`${OPEN5E_ORIGIN}/v2/creatures/${objectPk}/`);
  return json != null && typeof json === "object" ? mapOpen5eV2Creature(json as Record<string, unknown>) : null;
}
