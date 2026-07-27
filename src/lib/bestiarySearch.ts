import "server-only";
import { AbilityScores, CreatureAttack, CreatureDamageRoll, CreatureSearchHit, CreatureTemplate, CreatureTrait } from "./types";
import { abilityModifier } from "./characterMath";

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

/**
 * `usage_limits` on an Open5e v2 action is `{type, param}` (confirmed from
 * `api_v2/serializers/creature.py`'s `get_usage_limits`), `type` one of
 * `PER_DAY | RECHARGE | RECHARGE_ON_ROLL | RECHARGE_AFTER_REST` (confirmed
 * from `api_v2/models/enums.py`) — mapped to the same free-text `recharge`
 * a hand-authored YAML would use.
 */
const USAGE_LIMIT_LABELS: Record<string, (param: number | undefined) => string> = {
  PER_DAY: (param) => `${param ?? "?"}/Day`,
  RECHARGE: () => "Recharge",
  RECHARGE_ON_ROLL: (param) => `Recharge ${param ?? "?"}-6`,
  RECHARGE_AFTER_REST: () => "Recharge after a Short or Long Rest",
};

function mapRecharge(a: Record<string, unknown>): string | undefined {
  const usageLimits = get(a, "usage_limits");
  if (!usageLimits || typeof usageLimits !== "object") return undefined;
  const type = String((usageLimits as Record<string, unknown>).type ?? "");
  const paramRaw = Number((usageLimits as Record<string, unknown>).param);
  const label = USAGE_LIMIT_LABELS[type];
  return label ? label(Number.isFinite(paramRaw) ? paramRaw : undefined) : undefined;
}

/** e.g. "5" (melee reach) or "80/320" (ranged, with a long range) — no "ft." suffix, matching `CreatureAttack.range`'s own "numbers only, unit added on display" convention. Picks reach for a melee attack and range/long_range for a ranged one, matching whichever distance `attackType` (derived from the same reach/range presence) actually describes. */
function formatAttackRange(attack: Record<string, unknown>, attackType: "melee" | "ranged"): string | undefined {
  if (attackType === "melee") {
    const reach = firstNumber(attack, ["reach"], NaN);
    return Number.isFinite(reach) && reach > 0 ? String(reach) : undefined;
  }
  const range = firstNumber(attack, ["range"], NaN);
  if (!Number.isFinite(range) || range <= 0) return undefined;
  const longRange = firstNumber(attack, ["long_range"], NaN);
  return Number.isFinite(longRange) && longRange > 0 ? `${range}/${longRange}` : String(range);
}

/** An attack's damage rolls — the main die/bonus/type, plus a second roll when Open5e's own `extra_damage_*` fields are present (e.g. a weapon with a bonus elemental die) — same "list of rolls" shape `CreatureAttack.damage` uses for a hand-authored multi-type attack. */
function mapActionDamage(attack: Record<string, unknown>): CreatureDamageRoll[] {
  const dieCount = firstNumber(attack, ["damage_die_count"], NaN);
  const dieType = firstNumber(attack, ["damage_die_type"], NaN);
  if (!Number.isFinite(dieCount) || !Number.isFinite(dieType)) return [];

  const bonus = firstNumber(attack, ["damage_bonus"], 0);
  const rolls: CreatureDamageRoll[] = [
    {
      dice: `${dieCount}d${dieType}${bonus !== 0 ? ` ${bonus >= 0 ? "+" : ""}${bonus}` : ""}`,
      damageType: firstString(attack, ["damage_type.name", "damage_type"]),
    },
  ];

  const extraCount = firstNumber(attack, ["extra_damage_die_count"], NaN);
  const extraType = firstNumber(attack, ["extra_damage_die_type"], NaN);
  if (Number.isFinite(extraCount) && Number.isFinite(extraType)) {
    rolls.push({
      dice: `${extraCount}d${extraType}`,
      damageType: firstString(attack, ["extra_damage_type.name", "extra_damage_type"]),
    });
  }
  return rolls;
}

/**
 * Maps the first entry of an action's `attacks[]` (confirmed real field
 * shape from `api_v2/models/creature.py`'s `CreatureActionAttack`) — melee
 * vs ranged is inferred from `reach`/`range` presence (Open5e's own
 * `attack_type` on this object is a different axis, SPELL vs WEAPON, mapped
 * separately below into `attackKind`). Returns `undefined` for an action
 * with no `attacks` (most traits/legendary actions), one missing the to-hit
 * number, or one with no damage dice at all.
 */
function mapActionAttack(a: Record<string, unknown>): CreatureAttack | undefined {
  const attacksRaw = Array.isArray(a.attacks) ? a.attacks : [];
  const attack = attacksRaw.find((x): x is Record<string, unknown> => typeof x === "object" && x !== null);
  if (!attack) return undefined;

  const attackBonus = firstNumber(attack, ["to_hit_mod"], NaN);
  if (!Number.isFinite(attackBonus)) return undefined;

  const damage = mapActionDamage(attack);
  if (damage.length === 0) return undefined;

  const reach = firstNumber(attack, ["reach"], NaN);
  const attackType: "melee" | "ranged" = Number.isFinite(reach) && reach > 0 ? "melee" : "ranged";
  const attackKind: "weapon" | "spell" = firstString(attack, ["attack_type"])?.toUpperCase() === "SPELL" ? "spell" : "weapon";

  return {
    attackType,
    attackKind,
    attackBonus,
    damage,
    range: formatAttackRange(attack, attackType),
  };
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
      recharge: mapRecharge(a),
      attack: mapActionAttack(a),
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
  const proficiencyBonus = firstNumber(m, ["proficiency_bonus"], NaN);
  const slug = typeof m.key === "string" && m.key ? m.key : name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return {
    id: `srd-${slug}`,
    name,
    creatureType: firstString(m, ["type.name"]),
    size: firstString(m, ["size.name"]),
    alignment: firstString(m, ["alignment"]),
    ac: firstNumber(m, ["armor_class"], 10),
    armorDesc: firstString(m, ["armor_detail"]),
    ...(Number.isFinite(proficiencyBonus) ? { proficiencyBonus } : {}),
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
