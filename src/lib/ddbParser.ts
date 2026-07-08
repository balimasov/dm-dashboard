import {
  AbilityScores,
  Character,
  Currency,
  Feature,
  formatModifier,
  InventoryItem,
  ItemCategory,
  ItemRarity,
  KnownSpell,
  proficiencyBonus,
  RecoveryType,
  Resource,
  Sense,
  SKILL_ABILITY,
  SkillName,
  SkillProficiency,
  SpellSlotLevel,
} from "./types";

/**
 * Parses the response of D&D Beyond's undocumented character JSON endpoint
 * (character-service.dndbeyond.com/character/v5/character/{id}).
 *
 * Field meanings below come from inspecting a real character export and
 * cross-referencing MrPrimate/ddb-importer (the most complete open-source
 * parser of this API, used by the ddb-importer Foundry VTT module).
 *
 * Known limitations (left for manual correction on the edit page):
 * - Free-choice ability score increases ("choose-an-ability-score" with no
 *   fixed ability) aren't resolved — only fixed racial/item stat bonuses are.
 * - AC handles Barbarian/Monk-style Unarmored Defense (10 + Dex + another
 *   ability while unarmored), but not variants that set a different flat
 *   base (e.g. Draconic Sorcery's 13 + Dex) — those aren't modeled the same
 *   way by D&D Beyond and would need separate handling. Natural armor races,
 *   dragon hide, and dual-wielding AC bonuses also aren't accounted for.
 * - Third-caster subclasses (Eldritch Knight, Arcane Trickster) aren't
 *   detected — only classes whose base `definition.canCastSpells` is true
 *   contribute spell slots.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const ABILITY_BY_ID: Record<number, keyof AbilityScores> = {
  1: "str",
  2: "dex",
  3: "con",
  4: "int",
  5: "wis",
  6: "cha",
};

const ABILITY_SUBTYPE: Record<keyof AbilityScores, string> = {
  str: "strength-score",
  dex: "dexterity-score",
  con: "constitution-score",
  int: "intelligence-score",
  wis: "wisdom-score",
  cha: "charisma-score",
};

const CONDITION_LABELS: Record<number, string> = {
  1: "Blinded",
  2: "Charmed",
  3: "Deafened",
  5: "Frightened",
  6: "Grappled",
  7: "Incapacitated",
  8: "Invisible",
  9: "Paralyzed",
  10: "Petrified",
  11: "Poisoned",
  12: "Prone",
  13: "Restrained",
  14: "Stunned",
  15: "Unconscious",
  16: "Diseased",
};
const EXHAUSTION_CONDITION_ID = 4;

const RESET_TYPE_MAP: Record<number, RecoveryType> = {
  1: "short-rest",
  2: "long-rest",
  3: "dawn",
  4: "manual",
};

function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

const SAVE_SUBTYPE: Record<keyof AbilityScores, string> = {
  str: "strength-saving-throws",
  dex: "dexterity-saving-throws",
  con: "constitution-saving-throws",
  int: "intelligence-saving-throws",
  wis: "wisdom-saving-throws",
  cha: "charisma-saving-throws",
};

const SENSE_SUBTYPES = ["darkvision", "blindsight", "tremorsense", "truesight"];

function titleCase(kebab: string): string {
  return kebab
    .split("-")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

function collectModifiers(data: any): any[] {
  const groups = ["race", "class", "background", "item", "feat", "condition"];
  return groups.flatMap((g) => data.modifiers?.[g] ?? []);
}

function computeAbilityScores(data: any, mods: any[]): AbilityScores {
  const result = {} as AbilityScores;
  for (const [idStr, key] of Object.entries(ABILITY_BY_ID)) {
    const id = Number(idStr);
    const base = data.stats?.find((s: any) => s.id === id)?.value ?? 10;
    const bonus = data.bonusStats?.find((s: any) => s.id === id)?.value ?? 0;
    const override = data.overrideStats?.find((s: any) => s.id === id)?.value;
    if (override != null) {
      result[key] = override;
      continue;
    }
    // D&D Beyond's `isGranted` flag is unreliable for ability-score bonuses that
    // come from a choice with sub-options (e.g. a background ASI offering "+2 to
    // one ability" or "+1 to two abilities") — both the chosen and unchosen
    // branches can show isGranted:false even though the choice was made and one
    // branch is genuinely active. A modifier tied to a *specific* ability
    // (entityId set) is only ever present when that ability was actually part of
    // some granted feature, so it's safe to sum unconditionally; only the
    // free-choice "pick any ability" case (entityId null) can't be resolved this
    // way and is intentionally left out.
    const flatBonus = mods
      .filter((m) => m.type === "bonus" && m.subType === ABILITY_SUBTYPE[key] && m.entityId === id)
      .reduce((sum, m) => sum + (m.value ?? m.fixedValue ?? 0), 0);
    result[key] = base + bonus + flatBonus;
  }
  return result;
}

function computeConditionsAndExhaustion(data: any): { conditions: string[]; exhaustion: number } {
  const conditions: string[] = [];
  let exhaustion = 0;
  for (const c of data.conditions ?? []) {
    if (c.id === EXHAUSTION_CONDITION_ID) {
      exhaustion = c.level ?? 0;
      continue;
    }
    const label = CONDITION_LABELS[c.id];
    if (label) conditions.push(label);
  }
  return { conditions, exhaustion };
}

function computeSavingThrowProficiencies(mods: any[]): Array<keyof AbilityScores> {
  return (Object.keys(SAVE_SUBTYPE) as Array<keyof AbilityScores>).filter((key) =>
    mods.some((m) => m.type === "proficiency" && m.subType === SAVE_SUBTYPE[key] && m.isGranted)
  );
}

/**
 * Unlike saving throws (a fixed, automatic class grant), skill proficiencies
 * come from a player choice (background/class "pick N skills") — and just
 * like the ability-score choice bug above, D&D Beyond flags every skill
 * proficiency/expertise modifier `isGranted: false` regardless of whether it
 * was actually chosen. But unlike the ability-score case, there's no need to
 * disambiguate: the modifiers array only ever contains the skills the
 * character actually has (verified against real exports — a Fighter's
 * "choose 2 of 8" class skill list shows up here as exactly 2 entries, not
 * all 8 options), so presence in the array is itself the signal.
 */
/** Equipped armor/shields expose `stealthCheck: 2` when they impose disadvantage on Stealth (1 = normal). */
function hasArmorStealthDisadvantage(data: any): boolean {
  return (data.inventory ?? []).some((i: any) => i.equipped && i.definition?.stealthCheck === 2);
}

const RARITY_MAP: Record<string, ItemRarity> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  "very rare": "Very Rare",
  legendary: "Legendary",
  artifact: "Artifact",
  varies: "Varies",
};

const CATEGORY_MAP: Record<string, ItemCategory> = {
  weapon: "Weapon",
  armor: "Armor",
  potion: "Consumable",
  scroll: "Consumable",
  ammunition: "Consumable",
  wand: "Magic Item",
  ring: "Magic Item",
  rod: "Magic Item",
  staff: "Magic Item",
  "wondrous item": "Magic Item",
};

/**
 * D&D Beyond's `filterType` covers the common physical categories (Weapon,
 * Armor, Potion, Scroll, Ammunition, Wand, Ring, Rod, Staff, Wondrous Item —
 * per the standard equipment-category convention), but not every item type
 * has been seen in a real export to confirm the exact string. Anything
 * unmapped falls back to a rarity-based guess: above-Common items are
 * usually magic items even when the specific filterType isn't recognized,
 * while Common unknowns are almost always mundane adventuring gear.
 */
function computeItemCategory(filterType: string | undefined, rarity: ItemRarity): ItemCategory {
  const mapped = CATEGORY_MAP[String(filterType ?? "").toLowerCase()];
  if (mapped) return mapped;
  return rarity !== "Common" && rarity !== "Unknown" ? "Magic Item" : "Gear";
}

function computeInventory(data: any): InventoryItem[] {
  return (data.inventory ?? []).map((item: any, idx: number) => {
    const rarity: ItemRarity = RARITY_MAP[String(item.definition?.rarity ?? "").toLowerCase()] ?? "Unknown";
    const description = shortDescription(item.definition?.snippet, item.definition?.description);
    return {
      id: `item-${idx}`,
      name: item.definition?.name || "Item",
      rarity,
      category: computeItemCategory(item.definition?.filterType, rarity),
      quantity: item.quantity ?? 1,
      ...(description ? { description } : {}),
    };
  });
}

function computeCurrency(data: any): Currency {
  return {
    cp: data.currencies?.cp ?? 0,
    sp: data.currencies?.sp ?? 0,
    ep: data.currencies?.ep ?? 0,
    gp: data.currencies?.gp ?? 0,
    pp: data.currencies?.pp ?? 0,
  };
}

/**
 * A Bard's Jack of All Trades (and similar features) grant half the
 * proficiency bonus, rounded down, on ability checks that don't already
 * include the full bonus — modeled by D&D Beyond as a `type:
 * "half-proficiency"` modifier. Confirmed on a real Bard export: `subType:
 * "ability-checks"` with no `entityId`, meaning it's not scoped to one skill
 * but applies across the board — every skill this character isn't already
 * proficient/expert in still gets the half bonus, so all of them start
 * showing up here (previously only proficient/expertise/advantage skills
 * were surfaced at all, silently dropping this bonus everywhere).
 */
function computeSkillProficiencies(mods: any[], armorStealthDisadvantage: boolean): SkillProficiency[] {
  const jackOfAllTrades = mods.some(
    (m) => m.type === "half-proficiency" && m.subType === "ability-checks" && m.isGranted
  );
  const skills: SkillProficiency[] = [];
  for (const name of Object.keys(SKILL_ABILITY) as SkillName[]) {
    const proficient = mods.some((m) => m.type === "proficiency" && m.subType === name);
    const expertise = mods.some((m) => m.type === "expertise" && m.subType === name);
    const halfProficiency =
      !proficient &&
      !expertise &&
      (jackOfAllTrades || mods.some((m) => m.type === "half-proficiency" && m.subType === name && m.isGranted));
    const advMod = mods.find((m) => m.type === "advantage" && m.subType === name && m.isGranted);
    const disadvMod = mods.find((m) => m.type === "disadvantage" && m.subType === name && m.isGranted);
    const fromArmor = name === "stealth" && armorStealthDisadvantage;
    if (!proficient && !expertise && !halfProficiency && !advMod && !disadvMod && !fromArmor) continue;

    let advantage: "advantage" | "disadvantage" | undefined;
    let advantageNote: string | undefined;
    if (advMod || disadvMod) {
      advantage = advMod ? "advantage" : "disadvantage";
      advantageNote = (advMod ?? disadvMod).restriction?.trim() || undefined;
    } else if (fromArmor) {
      advantage = "disadvantage";
      advantageNote = "Wearing armor that imposes disadvantage on Stealth checks.";
    }

    skills.push({
      name,
      proficient,
      expertise,
      ...(halfProficiency ? { halfProficiency: true } : {}),
      ...(advantage ? { advantage, ...(advantageNote ? { advantageNote } : {}) } : {}),
    });
  }
  return skills;
}

/**
 * D&D Beyond doesn't reliably distinguish damage resistances from condition
 * immunities in this endpoint (e.g. immunity to a *condition* like
 * magical-sleep shows up under the same `type: "immunity"` as a damage-type
 * immunity would) — both are surfaced here at face value, matching what the
 * app's Resistances/Immunities/Vulnerabilities section is meant to list.
 */
function computeDamageModifiers(mods: any[]) {
  function namesFor(type: string): string[] {
    const names = mods
      .filter((m) => m.type === type && m.isGranted && m.subType)
      .map((m) => titleCase(m.subType));
    return Array.from(new Set(names));
  }
  return {
    resistances: namesFor("resistance"),
    immunities: namesFor("immunity"),
    vulnerabilities: namesFor("vulnerability"),
  };
}

/**
 * Advantage/disadvantage grants (e.g. Fey Ancestry vs. Charmed, War Caster's
 * advantage on Constitution saves to maintain Concentration, Danger Sense)
 * are modeled as `type: "advantage"|"disadvantage"` modifiers whose
 * `friendlySubtypeName` is the subject ("Constitution Saving Throws") and
 * whose `restriction` is a trailing clause of the full rules sentence (often
 * starting mid-sentence, e.g. "saving throws that you make to maintain
 * Concentration."). Shown as raw fragments joined with a dash rather than
 * reassembled into a single sentence, since restriction text isn't
 * consistently a clean standalone clause.
 */
function computeAdvantages(mods: any[]): string[] {
  const entries = mods.filter((m) => (m.type === "advantage" || m.type === "disadvantage") && m.isGranted);
  const names = entries.map((m) => {
    const prefix = m.type === "disadvantage" ? "Disadvantage" : "Advantage";
    const subject = m.friendlySubtypeName || titleCase(m.subType ?? "");
    const restriction = (m.restriction ?? "").trim();
    return restriction ? `${prefix}: ${subject} — ${restriction}` : `${prefix}: ${subject}`;
  });
  return Array.from(new Set(names));
}

/**
 * Additional senses (Darkvision, Blindsight, Tremorsense, Truesight) appear as
 * modifiers keyed by `subType`, split across two distinct `type`s that must
 * be combined differently:
 *  - `"set-base"` — a flat grant (race, feat...); when more than one source
 *    sets the same sense, the largest one wins (they're alternatives, not
 *    stacking).
 *  - `"sense"` — an *additive* bonus on top of an existing sense, e.g. the
 *    Goggles of Night ("if you already have darkvision, increases its range
 *    by 60 feet") or the Gloom Stalker's Umbral Sight. These stack with the
 *    base grant instead of replacing it — treating them as another
 *    max-candidate (as an earlier version of this code did) silently drops
 *    the bonus whenever it's less-or-equal to the base range, e.g. an Elf's
 *    innate 60 ft plus a 60 ft item bonus should read 120 ft, not 60 ft.
 */
function computeSenses(mods: any[]): Sense[] {
  const senses: Sense[] = [];
  for (const subType of SENSE_SUBTYPES) {
    const base = mods
      .filter((m) => m.type === "set-base" && m.subType === subType && m.isGranted)
      .reduce((max, m) => Math.max(max, m.value ?? 0), 0);
    const bonus = mods
      .filter((m) => m.type === "sense" && m.subType === subType && m.isGranted)
      .reduce((sum, m) => sum + (m.value ?? 0), 0);
    const range = base + bonus;
    if (range > 0) senses.push({ name: titleCase(subType), range });
  }
  return senses;
}

/**
 * D&D Beyond's `baseHitPoints` only stores the sum of hit-die values rolled/taken
 * at each level — it excludes the Constitution modifier entirely. The Con
 * contribution (conMod * total level) has to be added back on top, along with
 * any flat or per-level HP bonuses (e.g. the Tough feat), matching the formula
 * used by MrPrimate/ddb-importer's character parser.
 *
 * Recomputed fresh on every sync — an explicit D&D Beyond HP override always
 * wins outright.
 */
function computeHp(data: any, mods: any[], conMod: number, totalLevel: number) {
  const perLevelBonus = mods
    .filter((m) => m.type === "bonus" && m.subType === "hit-points-per-level" && m.isGranted)
    .reduce((sum, m) => sum + (m.value ?? 0) * totalLevel, 0);
  const flatBonus = mods
    .filter((m) => m.type === "bonus" && m.subType === "hit-points" && m.isGranted)
    .reduce((sum, m) => sum + (m.value ?? 0), 0);

  const computedMax =
    conMod * totalLevel + (data.baseHitPoints ?? 0) + (data.bonusHitPoints ?? 0) + perLevelBonus + flatBonus;
  const maxHp = data.overrideHitPoints ?? computedMax;
  const hp = Math.max(0, maxHp - (data.removedHitPoints ?? 0));
  return { hp, maxHp, tempHp: data.temporaryHitPoints ?? 0 };
}

function computeClassSummary(data: any) {
  const classes = data.classes ?? [];
  const level = classes.reduce((sum: number, c: any) => sum + (c.level ?? 0), 0);
  const primary = classes.find((c: any) => c.isStartingClass) ?? classes[0];
  const className =
    classes.length > 1
      ? classes.map((c: any) => `${c.definition?.name ?? "?"} ${c.level}`).join(" / ")
      : classes[0]?.definition?.name ?? "";
  const subclass = classes.length === 1 ? primary?.subclassDefinition?.name ?? undefined : undefined;
  return { level, className, subclass };
}

/**
 * The race's base walking speed alone misses class/feat/item bonuses like a
 * Barbarian's Fast Movement (+10 ft while not wearing Heavy armor) —
 * confirmed on a real level-5 Barbarian export undercounting speed by
 * exactly that 10, since it only ever read `weightSpeeds`. These show up as
 * ordinary `type: "bonus", subType: "speed"` modifiers alongside AC/ability
 * bonuses; `isGranted` is D&D Beyond's own pre-computed signal for whether a
 * conditional bonus like this currently applies (e.g. the Heavy-armor
 * restriction), the same flag Unarmored Defense's bonus relies on above.
 */
function computeSpeed(data: any, mods: any[]): number {
  const base = data.race?.weightSpeeds?.normal?.walk ?? 30;
  const bonus = mods
    .filter((m) => m.type === "bonus" && m.subType === "speed" && m.isGranted)
    .reduce((sum, m) => sum + (m.value ?? 0), 0);
  return base + bonus;
}

/**
 * Barbarian's/Monk's Unarmored Defense (10 + Dex + another ability, only
 * while wearing no armor) is modeled by D&D Beyond as a `type: "set",
 * subType: "unarmored-armor-class"` modifier whose `statId` names the extra
 * ability (3 = Con for Barbarian, 5 = Wis for Monk) — confirmed on a real
 * Barbarian export, where omitting this was undercounting AC by exactly the
 * Con modifier. A shield can still be worn under Unarmored Defense, so
 * `shieldBonus` still applies on top.
 */
function computeUnarmoredAbilityBonus(mods: any[], abilities: AbilityScores): number {
  const seen = new Set<number>();
  let bonus = 0;
  for (const m of mods) {
    if (m.type !== "set" || m.subType !== "unarmored-armor-class" || !m.isGranted || !m.statId) continue;
    if (seen.has(m.statId)) continue;
    seen.add(m.statId);
    const key = ABILITY_BY_ID[m.statId];
    if (key) bonus += abilityModifier(abilities[key]);
  }
  return bonus;
}

/**
 * `characterValues` holds the misc-bonus text boxes a player can type a flat
 * number into directly on the D&D Beyond sheet (separate from computed
 * modifiers) — `typeId: 2` is the Armor Class box. Confirmed on a real
 * Sorcerer export: her AC of 14 (10 + 1 Dex, no armor) only resolves once
 * this +3 sheet value is added on top; every `modifiers` group was empty of
 * any armor-class entry, so this is D&D Beyond's only record of that bonus.
 */
function computeCustomAcBonus(data: any): number {
  return (data.characterValues ?? [])
    .filter((v: any) => v.typeId === 2 && typeof v.value === "number")
    .reduce((sum: number, v: any) => sum + v.value, 0);
}

function computeArmorClass(data: any, abilities: AbilityScores, mods: any[]): number {
  const dexMod = abilityModifier(abilities.dex);
  const inventory = data.inventory ?? [];
  const equippedArmor = inventory.filter(
    (i: any) => i.equipped && i.definition?.filterType === "Armor" && i.definition?.armorTypeId !== 4
  );
  const equippedShields = inventory.filter((i: any) => i.equipped && i.definition?.armorTypeId === 4);

  const flatBonus = mods
    .filter((m) => m.type === "bonus" && m.subType === "armor-class" && m.isGranted)
    .reduce((sum, m) => sum + (m.value ?? 0), 0);
  const shieldBonus = equippedShields.reduce(
    (sum: number, i: any) => sum + (i.definition?.armorClass ?? 0),
    0
  );
  const customBonus = computeCustomAcBonus(data);

  if (equippedArmor.length === 0) {
    const unarmoredBonus = computeUnarmoredAbilityBonus(mods, abilities);
    return 10 + dexMod + unarmoredBonus + shieldBonus + flatBonus + customBonus;
  }

  const armor = equippedArmor[0];
  const base = armor.definition?.armorClass ?? 10;
  // `definition.armorTypeId` (1 = Light, 2 = Medium, 3 = Heavy, 4 = Shield —
  // the same field already used above to separate shields) is the reliable
  // signal for the Dex cap. The human-readable `definition.type` string
  // ("Heavy Armor") isn't always populated — confirmed on a real Paladin
  // export where it was an empty string despite armorTypeId correctly being
  // 3, which silently let the full Dex mod through on Heavy Armor and
  // overcounted her AC by exactly that modifier.
  const armorTypeId = armor.definition?.armorTypeId;
  let dexContribution = dexMod;
  if (armorTypeId === 2) dexContribution = Math.min(dexMod, 2);
  else if (armorTypeId === 3) dexContribution = 0;

  return base + dexContribution + shieldBonus + flatBonus + customBonus;
}

function computePassiveSkill(abilityMod: number, profBonus: number, skill: string, mods: any[]): number {
  const proficient = mods.some((m) => m.type === "proficiency" && m.subType === skill && m.isGranted);
  const expert = mods.some((m) => m.type === "expertise" && m.subType === skill && m.isGranted);
  const profMultiplier = expert ? 2 : proficient ? 1 : 0;
  const flatBonus = mods
    .filter((m) => m.type === "bonus" && m.subType === `passive-${skill}` && m.isGranted)
    .reduce((sum, m) => sum + (m.value ?? 0), 0);
  return 10 + abilityMod + profBonus * profMultiplier + flatBonus;
}

function computeInitiative(dexMod: number, mods: any[]): number {
  const flatBonus = mods
    .filter((m) => m.type === "bonus" && m.subType === "initiative" && m.isGranted)
    .reduce((sum, m) => sum + (m.value ?? 0), 0);
  return dexMod + flatBonus;
}

/**
 * D&D Beyond's `snippet` is usually clean plain text but NOT always — some
 * (e.g. a Circle Spell feature's Cube-count text) embed raw HTML tags
 * unstripped, confirmed on a real export. So both `snippet` and the
 * HTML `description` fallback go through the same cleaning pass rather
 * than trusting snippet to already be safe.
 *
 * Bold/italic are preserved as markdown-lite `**bold**`/`*italic*` markers
 * (rendered back into real <strong>/<em> by the UI) instead of being
 * dropped like other tags, since D&D Beyond uses them to highlight the
 * one number in a sentence a player actually needs (e.g. "regain **1d10**
 * HP").
 */
function cleanRulesText(html: string): string {
  return html
    .replace(/&rsquo;/g, "’")
    .replace(/&lsquo;/g, "‘")
    .replace(/&rdquo;/g, "”")
    .replace(/&ldquo;/g, "“")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\[\/?(?:rules|skill|item|spell|condition)\]/gi, "")
    .replace(/<\/(?:p|div|li)>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    // Nested <strong><em>Label.</em></strong> (a common "bold sub-heading"
    // convention in these rules texts, confirmed on real Sorcerer/Barbarian/
    // Bard/feat descriptions) has to collapse to a single bold marker before
    // the two tags are converted independently below — otherwise **+* on one
    // side and *+** on the other stack up into a stray `***Label.***`, which
    // RichText's bold/italic parser can't split cleanly and leaves loose `*`
    // characters in the rendered tooltip.
    .replace(/<strong><em>([\s\S]*?)<\/em><\/strong>/gi, "**$1**")
    .replace(/<em><strong>([\s\S]*?)<\/strong><\/em>/gi, "**$1**")
    .replace(/<(?:strong|b)>/gi, "**")
    .replace(/<\/(?:strong|b)>/gi, "**")
    .replace(/<(?:em|i)>/gi, "*")
    .replace(/<\/(?:em|i)>/gi, "*")
    .replace(/<[^>]*>/g, "")
    // D&D Beyond's `snippet` field is often plain text rather than HTML, and
    // formats sub-points as a real newline + indentation + "•" (confirmed on
    // a real Bard's Dazzling Footwork) instead of proper list markup — mark
    // each with a placeholder *before* the general whitespace collapse below
    // (which would otherwise flatten the newlines into a single run-on
    // paragraph with bare "•" characters stranded mid-sentence), then restore
    // them as real line breaks afterward.
    .replace(/\s*(?:\r?\n\s*)+•\s*/g, "@@BULLET@@")
    .replace(/\s+/g, " ")
    .replace(/@@BULLET@@/g, "\n• ")
    .trim();
}

/** Prefers D&D Beyond's `snippet` over its longer `description` (both get the same HTML cleanup). */
function shortDescription(snippet?: string | null, description?: string | null): string | undefined {
  const raw = (snippet && snippet.trim()) || description;
  if (!raw) return undefined;
  const cleaned = cleanRulesText(raw);
  return cleaned || undefined;
}

/** Thrown for anything the placeholder evaluator below can't resolve — an unknown variable/modifier keyword, bad syntax, or `scalevalue`/`limiteduse` with no charge count available. Callers catch it and drop just that one placeholder. */
class TemplateEvalError extends Error {}

type TemplateMod =
  | { op: "rounddown" | "roundup" | "signed" | "unsigned" }
  | { op: "min" | "max"; value: number };

/**
 * D&D Beyond's rules-text placeholders aren't a fixed set of tags — they're a
 * small expression language: variables (`classlevel`, `proficiency`, `speed`,
 * `modifier:cha`, `abilityscore:str`, `savedc:wis`, `spellattack:int`,
 * `scalevalue`/`limiteduse`), arithmetic (`+ - * /`, parens), and postfix
 * modifier lists that clamp/round/format a value — `@list` applied inline to
 * the atom right before it (so the rest of the expression keeps computing
 * with a plain number), `#list` applied once to the whole expression's final
 * value (and, unlike `@`, allowed to include `signed`/`unsigned` to turn the
 * number into display text). Confirmed by tracing real examples pulled from
 * every sample export, e.g. `{{4+(classlevel-13)@min:0,max:1*4}}` (a level-13
 * step-up: clamp `classlevel-13` to 0..1 *before* multiplying by 4, so
 * `@` has to bind tighter than the surrounding `*`), and
 * `{{(12+classlevel)/7#rounddown,min:2,unsigned}}` (round/clamp/format the
 * *entire* division, not just the `7`). A hand-rolled recursive-descent
 * parser with standard `* /` before `+ -` precedence reproduces both without
 * special-casing either.
 */
function evaluateTemplatePlaceholder(
  expr: string,
  ctx: { level: number; abilities: AbilityScores; profBonus: number; maxUses?: number; speed?: number }
): string {
  let i = 0;
  const n = expr.length;

  const isDigit = (ch: string) => ch >= "0" && ch <= "9";
  const isIdentChar = (ch: string) => /[a-zA-Z]/.test(ch);
  const skipWs = () => {
    while (i < n && expr[i] === " ") i++;
  };

  function readIdent(): string {
    const start = i;
    while (i < n && isIdentChar(expr[i])) i++;
    if (i === start) throw new TemplateEvalError(`expected identifier at ${i}`);
    return expr.slice(start, i);
  }

  function readNumber(): number {
    const start = i;
    if (expr[i] === "-") i++;
    while (i < n && (isDigit(expr[i]) || expr[i] === ".")) i++;
    if (i === start || (i === start + 1 && expr[start] === "-")) throw new TemplateEvalError(`expected number at ${i}`);
    return Number(expr.slice(start, i));
  }

  function readModList(): TemplateMod[] {
    const mods: TemplateMod[] = [];
    for (;;) {
      skipWs();
      const key = readIdent().toLowerCase();
      if (key === "min" || key === "max") {
        if (expr[i] !== ":") throw new TemplateEvalError(`expected ':' after "${key}"`);
        i++;
        mods.push({ op: key, value: readNumber() });
      } else if (key === "rounddown" || key === "roundup" || key === "signed" || key === "unsigned") {
        mods.push({ op: key });
      } else {
        throw new TemplateEvalError(`unknown modifier "${key}"`);
      }
      skipWs();
      if (expr[i] === ",") {
        i++;
        continue;
      }
      break;
    }
    return mods;
  }

  function applyNumericMods(value: number, mods: TemplateMod[]): number {
    for (const mod of mods) {
      if (mod.op === "rounddown") value = Math.floor(value);
      else if (mod.op === "roundup") value = Math.ceil(value);
      else if (mod.op === "min") value = Math.max(value, mod.value);
      else if (mod.op === "max") value = Math.min(value, mod.value);
    }
    return value;
  }

  function abilityKey(arg: string | undefined): keyof AbilityScores {
    const key = (arg ?? "").toLowerCase();
    if (key === "str" || key === "dex" || key === "con" || key === "int" || key === "wis" || key === "cha") return key;
    throw new TemplateEvalError(`unknown ability "${arg}"`);
  }

  function resolveVariable(name: string, arg: string | undefined): number {
    switch (name) {
      case "classlevel":
      case "characterlevel":
        return ctx.level;
      case "proficiency":
        return ctx.profBonus;
      case "scalevalue":
      case "limiteduse":
        if (ctx.maxUses === undefined) throw new TemplateEvalError("scalevalue unavailable");
        return ctx.maxUses;
      case "speed":
        if (ctx.speed === undefined) throw new TemplateEvalError("speed unavailable");
        return ctx.speed;
      case "modifier":
        return abilityModifier(ctx.abilities[abilityKey(arg)]);
      case "abilityscore":
        return ctx.abilities[abilityKey(arg)];
      case "savedc":
        return 8 + ctx.profBonus + abilityModifier(ctx.abilities[abilityKey(arg)]);
      case "spellattack":
        return ctx.profBonus + abilityModifier(ctx.abilities[abilityKey(arg)]);
      default:
        throw new TemplateEvalError(`unknown variable "${name}"`);
    }
  }

  // Binds "@modlist" to the atom that directly precedes it (a number, a
  // variable, or a fully parenthesized group) before that atom's value ever
  // reaches a surrounding `*`/`/`/`+`/`-` — this is what makes
  // `(classlevel-13)@min:0,max:1*4` clamp first and multiply second.
  function parseAtom(): number {
    skipWs();
    let value: number;
    if (expr[i] === "(") {
      i++;
      value = parseExpr();
      skipWs();
      if (expr[i] !== (")" as string)) throw new TemplateEvalError("expected ')'");
      i++;
    } else if (isDigit(expr[i]) || (expr[i] === "-" && isDigit(expr[i + 1]))) {
      value = readNumber();
    } else {
      const name = readIdent().toLowerCase();
      let arg: string | undefined;
      if (expr[i] === ":") {
        i++;
        arg = readIdent();
      }
      value = resolveVariable(name, arg);
    }
    skipWs();
    while (expr[i] === "@") {
      i++;
      value = applyNumericMods(value, readModList());
      skipWs();
    }
    return value;
  }

  function parseTerm(): number {
    let value = parseAtom();
    skipWs();
    while (expr[i] === "*" || expr[i] === "/") {
      const op = expr[i];
      i++;
      const rhs = parseAtom();
      value = op === "*" ? value * rhs : value / rhs;
      skipWs();
    }
    return value;
  }

  function parseExpr(): number {
    let value = parseTerm();
    skipWs();
    while (expr[i] === "+" || expr[i] === "-") {
      const op = expr[i];
      i++;
      const rhs = parseTerm();
      value = op === "+" ? value + rhs : value - rhs;
      skipWs();
    }
    return value;
  }

  let value = parseExpr();
  skipWs();
  // "#modlist", if present, is a *final* wrapper applied once to the whole
  // expression's result — the only place `signed`/`unsigned` can appear,
  // since only here does the number turn into display text.
  let finalMods: TemplateMod[] = [];
  if (expr[i] === "#") {
    i++;
    finalMods = readModList();
  }
  skipWs();
  if (i !== n) throw new TemplateEvalError(`unexpected trailing input at ${i}`);

  value = applyNumericMods(
    value,
    finalMods.filter((m) => m.op !== "signed" && m.op !== "unsigned")
  );
  return finalMods.some((m) => m.op === "signed") ? formatModifier(value) : String(value);
}

/**
 * Resolves every `{{...}}` placeholder in a D&D Beyond snippet/description
 * via `evaluateTemplatePlaceholder`. A placeholder that fails to evaluate
 * (unknown future syntax, or `scalevalue`/`limiteduse` with no charge count
 * available) is dropped silently rather than left as a raw `{{...}}` tag or a
 * guessed number — same graceful-degradation behavior as before, now just
 * covering far fewer cases since the evaluator understands the actual
 * expression grammar instead of a fixed list of tags.
 */
function resolveSnippetTemplate(
  text: string,
  level: number,
  abilities: AbilityScores,
  profBonus: number,
  maxUses?: number,
  speed?: number
): string {
  return text
    .replace(/\{\{([^}]+)\}\}/g, (_match, expr) => {
      try {
        return evaluateTemplatePlaceholder(String(expr).trim(), { level, abilities, profBonus, maxUses, speed });
      } catch {
        return "";
      }
    })
    // Collapse horizontal whitespace only — a "\n• " line break inserted by
    // cleanRulesText's bullet-list handling must survive this step, or every
    // bullet point collapses back into one run-on line.
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();
}

/**
 * Shared by Resources, Spells, and (via cross-reference) Features — anywhere
 * D&D Beyond tracks a live charge pool via a `limitedUse` object (as opposed
 * to the unrelated, non-live-tracked `limitedUse` scaling table that also
 * appears directly on class-feature/racial-trait/feat *definitions*, which
 * has a completely different shape and isn't usable for this). Confirmed the
 * same rich shape (`maxUses`/`statModifierUsesId`/`useProficiencyBonus`/
 * `resetType`/`numberUsed`) appears both on `data.actions.*` entries and on
 * `data.spells.*` entries (an innate spell castable a few times/day without a
 * slot), so one calculation covers both.
 */
function computeLimitedUseCharges(
  lu: any,
  abilities: AbilityScores,
  profBonus: number
): { current: number; max: number; recovery: RecoveryType } | null {
  if (!lu || (!lu.maxUses && !lu.statModifierUsesId && !lu.useProficiencyBonus)) return null;
  const abilityById: Record<number, number> = {
    1: abilities.str,
    2: abilities.dex,
    3: abilities.con,
    4: abilities.int,
    5: abilities.wis,
    6: abilities.cha,
  };
  let maxUses = lu.maxUses && lu.maxUses !== -1 ? lu.maxUses : 0;
  if (lu.statModifierUsesId) {
    const mod = abilityModifier(abilityById[lu.statModifierUsesId] ?? 10);
    maxUses = lu.operator === 2 ? maxUses * mod : maxUses + mod;
  }
  if (lu.useProficiencyBonus) {
    maxUses = lu.proficiencyBonusOperator === 2 ? maxUses * profBonus : maxUses + profBonus;
  }
  maxUses = Math.max(0, maxUses);
  return {
    current: Math.max(0, maxUses - (lu.numberUsed ?? 0)),
    max: maxUses,
    recovery: RESET_TYPE_MAP[lu.resetType] ?? "manual",
  };
}

/**
 * D&D Beyond's own hint text states the die type (e.g. "You have 4
 * Superiority Dice, which are d8s") but that only lives in the *long*
 * `description` field — the short `snippet` this app prefers for resource
 * hints is a generic templated blurb ("You have {{scalevalue}} Superiority
 * Dice...") that never mentions the die size at all, and the die type itself
 * only shows up separately on the *action* node's own `dice` field (`{
 * diceValue: 8, ... }`), not in either text field. So rather than trying to
 * splice "d8" into whichever wording a given feature's snippet happens to
 * use, this appends one short, standalone sentence stating it plainly.
 * Scoped to names that say "die"/"dice" (Superiority Dice, Bardic
 * Inspiration Die...) rather than every resource with a `dice` field, since
 * for most actions that field is the action's *damage* roll (e.g. a weapon
 * attack), unrelated to the resource's own charge count.
 */
function diceTypeNote(name: string, dice: any): string {
  if (!dice?.diceValue || !/\b(die|dice)\b/i.test(name)) return "";
  return ` Each die is a d${dice.diceValue}.`;
}

function computeResources(data: any, abilities: AbilityScores, profBonus: number, level: number, speed: number): Resource[] {
  function fromLimitedUse(
    name: string,
    lu: any,
    keyPrefix: string,
    idx: number,
    rawDescription: string | undefined,
    source: string,
    dice?: any
  ): Resource | null {
    const charges = computeLimitedUseCharges(lu, abilities, profBonus);
    if (!charges) return null;
    const baseDescription = rawDescription
      ? resolveSnippetTemplate(rawDescription, level, abilities, profBonus, charges.max, speed)
      : "";
    const description = (baseDescription + diceTypeNote(name ?? "", dice)).trim() || undefined;
    return {
      id: `${keyPrefix}-${idx}`,
      name: name || "Resource",
      current: charges.current,
      max: charges.max,
      recovery: charges.recovery,
      source,
      ...(description ? { description } : {}),
    };
  }

  const resources: Resource[] = [];
  const actionGroups: Array<[string, string, any[]]> = [
    ["race", "Race", data.actions?.race ?? []],
    ["class", "Class", data.actions?.class ?? []],
    ["feat", "Feat", data.actions?.feat ?? []],
  ];
  for (const [group, source, actions] of actionGroups) {
    actions.forEach((action: any, idx: number) => {
      const resource = fromLimitedUse(
        action.name,
        action.limitedUse,
        `action-${group}`,
        idx,
        shortDescription(action.snippet, action.description),
        source,
        action.dice
      );
      if (resource) resources.push(resource);
    });
  }

  (data.inventory ?? [])
    .filter((item: any) => item.equipped && item.limitedUse)
    .forEach((item: any, idx: number) => {
      const resource = fromLimitedUse(
        item.definition?.name,
        item.limitedUse,
        "item",
        idx,
        shortDescription(item.definition?.snippet, item.definition?.description),
        "Item"
      );
      if (resource) resources.push(resource);
    });

  (data.pactMagic ?? []).forEach((pact: any) => {
    const max = (pact.available ?? 0) + (pact.used ?? 0);
    if (max > 0) {
      resources.push({
        id: `pact-${pact.level}`,
        name: `Pact Magic Slot L${pact.level}`,
        current: pact.available ?? 0,
        max,
        source: "Pact Magic",
        recovery: "short-rest",
      });
    }
  });

  return dedupeResourcesByName(resources);
}

/**
 * When a class feature is restated at a higher level (e.g. a Bard's
 * "Bardic Inspiration" being upgraded by level 5's Font of Inspiration,
 * which changes its recharge to Short or Long Rest), D&D Beyond doesn't
 * remove the original lower-level action entry — both stay in the actions
 * array, each independently flagged as limited-use, producing two resources
 * with the same name (confirmed on a real level 5 Bard export). The later
 * entry in the array reflects the character's current level, so it wins.
 */
function dedupeResourcesByName(resources: Resource[]): Resource[] {
  const byName = new Map<string, Resource>();
  for (const resource of resources) {
    byName.set(resource.name.trim().toLowerCase(), resource);
  }
  return resources.filter((r) => byName.get(r.name.trim().toLowerCase()) === r);
}

/**
 * Race, class, and feat data each carry D&D Beyond's own "don't show this on
 * the details/sheet page" flags (`hideOnDetailsPage`/`hideInSheet`) — used to
 * drop entries that are just restating stats already shown elsewhere (e.g. a
 * racial trait literally named "Speed") or a level-gated feature's
 * lower-level, now-superseded restatement (both copies share a name; only one
 * has `hideInSheet: false`). Class features are further filtered by
 * `requiredLevel` because D&D Beyond lists a class's *entire* feature table up
 * to level 20 regardless of the character's actual level. These are hard
 * excludes (never returned at all) — D&D Beyond's own flags, not a heuristic.
 *
 * Everything else used to go through a custom "is this actually useful"
 * heuristic (boilerplate/ability-score/subclass-announcement name matching).
 * That's gone now in favor of mirroring D&D Beyond's own Actions tab instead:
 * `data.actions.*` already carries an `activation.activationType` for every
 * genuinely-usable ability, which is a strictly better signal than guessing
 * from feature names/text — see `activationGroup` below. Anything not present
 * there (passive traits, proficiency grants, ability-score bumps, subclass
 * announcements, rulebook boilerplate) simply lands in the "other" group.
 */

/** Strips a trailing parenthetical (e.g. "Rage (Enter)" -> "rage") so a Feature can be matched against the same ability tracked elsewhere under a plainer name — used only for that cross-reference, never for de-duplication (two distinctly-suffixed actions like "Radiant Fire (Fire)"/"Radiant Fire (Radiant)" must not collide). */
function normalizeFeatureName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*$/, "");
}

/**
 * D&D Beyond's own `activationType` codes (confirmed against real exports):
 * 1/2/5 are all "action" variants, 3 is bonus action, 4 is reaction, 8 is
 * "special" (no action cost, e.g. a triggered passive-ish ability like a
 * racial "Relentless Endurance"). 0/6/7/missing (none, minute-, hour-long
 * activations) don't fit any of those and fall back to "other" alongside
 * everything that isn't in `actions.*` at all.
 */
function activationGroup(activationType: number | null | undefined): Feature["group"] {
  switch (activationType) {
    case 1:
    case 2:
    case 5:
      return "action";
    case 3:
      return "bonusAction";
    case 4:
      return "reaction";
    case 8:
      return "special";
    default:
      return "other";
  }
}

function computeFeatures(
  data: any,
  resources: Resource[],
  abilities: AbilityScores,
  profBonus: number,
  level: number,
  speed: number
): Feature[] {
  const features: Feature[] = [];
  const seen = new Set<string>();
  // Some abilities are described *twice* in D&D Beyond's data under genuinely
  // different names — a weapon mastery property shows up once via
  // `actions.*` as "Vex (Handaxe)" and again via `options.*` as "Handaxe
  // (Vex)" (word order swapped), and a chosen Metamagic option similarly
  // appears as both "Metamagic: Careful Spell" and bare "Careful Spell" —
  // confirmed on real exports, always with byte-identical rules text. Name
  // matching can't catch this (the strings genuinely differ), so the fully
  // resolved description text is the de-dupe signal instead; whichever copy
  // is processed first wins (actions are processed before classFeatures/
  // racialTraits/feats/options below, so the properly action-grouped copy
  // wins over the generic "other" one describing the same thing).
  const seenDescriptions = new Set<string>();

  // Lets an `options.*`/`actions.*` entry (see below) report the *specific*
  // feature that granted the choice — e.g. "Maneuvers" or "Metamagic
  // Options" — instead of just the broad group it came from, and inherit
  // that parent's real origin type. Confirmed on real exports: an option's
  // `componentId` matches the `definition.id` of its parent racial trait/
  // class feature/feat (a Battle Master's chosen maneuvers all share
  // `componentId` with the "Maneuvers" class feature; a Sorcerer's Metamagic
  // choices share it with "Metamagic Options", a *different* class feature
  // from the "Metamagic" one that's otherwise shown).
  //
  // But `componentId` doesn't always point at a definition's own `id` —
  // D&D Beyond implements *any* feature/trait/feat's internal "choose one of
  // these" mechanism via a generic, reusable `grantedFeats[].featIds[]` link
  // to an entity that's typed as a "feat" internally regardless of what
  // actually grants it, and that *same* entity is *also* separately listed as
  // its own entry in `data.feats[]` (confirmed on a real Fighter/Barbarian
  // export: the *class feature* "Weapon Mastery" has `grantedFeats:
  // [{featIds: [X]}]`, and `data.feats[]` independently contains its own
  // entry with `definition.id === X` and the *same* name "Weapon Mastery" —
  // a technical placeholder, not a real chosen feat). So a direct id/name
  // match in `data.feats[]` is *not* reliable ground truth here — the
  // `grantedFeats` link is, since it's the actual feature declaring "I own
  // this choice". Indirect (`grantedFeats`) registrations therefore win: they
  // run first, and the direct definition-id pass below only fills in ids
  // that indirect registration didn't already claim.
  const parentInfoById = new Map<number, { name: string; originType: Feature["originType"] }>();

  function registerGrantedFeatLinks(definition: any, name: string | undefined, originType: Feature["originType"]) {
    if (!name) return;
    for (const grant of definition?.grantedFeats ?? []) {
      for (const featId of grant.featIds ?? []) {
        parentInfoById.set(featId, { name, originType });
      }
    }
  }

  for (const trait of data.race?.racialTraits ?? []) {
    registerGrantedFeatLinks(trait.definition, trait.definition?.name, "species");
  }
  for (const cls of data.classes ?? []) {
    for (const cf of cls.classFeatures ?? []) {
      registerGrantedFeatLinks(cf.definition, cf.definition?.name, "class");
    }
  }
  for (const feat of data.feats ?? []) {
    registerGrantedFeatLinks(feat.definition, feat.definition?.name, "feat");
  }
  registerGrantedFeatLinks(data.background?.definition, data.background?.definition?.featureName, "background");

  function registerDirect(id: number | null | undefined, name: string | undefined, originType: Feature["originType"]) {
    if (id != null && name && !parentInfoById.has(id)) parentInfoById.set(id, { name, originType });
  }

  for (const trait of data.race?.racialTraits ?? []) {
    registerDirect(trait.definition?.id, trait.definition?.name, "species");
  }
  for (const cls of data.classes ?? []) {
    for (const cf of cls.classFeatures ?? []) {
      registerDirect(cf.definition?.id, cf.definition?.name, "class");
    }
  }
  for (const feat of data.feats ?? []) {
    registerDirect(feat.definition?.id, feat.definition?.name, "feat");
  }

  // "race"/"class"/"feat" here is D&D Beyond's own data grouping, not the
  // renamed 2024 terminology — the fallback `originType` for an action/option
  // whose `componentId` doesn't resolve via `parentInfoById` above.
  const originTypeByDdbGroup: Record<"race" | "class" | "feat", Feature["originType"]> = {
    race: "species",
    class: "class",
    feat: "feat",
  };

  // A charge pool's D&D Beyond `action` entry is very often named
  // differently from the Feature that grants it (a Fighter's "Superiority
  // Dice" action vs. its "Combat Superiority" classFeature; a Sorcerer's
  // "Font of Magic: Sorcery Points" action vs. its "Font of Magic"
  // classFeature) — name-matching alone misses these. Confirmed on real
  // exports: the action's `componentId` matches the `definition.id` of the
  // classFeature/racialTrait/feat that grants it, the same relationship
  // `options.*` uses above, so charges can be looked up by id instead.
  const actionChargesById = new Map<number, { current: number; max: number; recovery: RecoveryType }>();
  for (const group of ["race", "class", "feat"] as const) {
    for (const action of data.actions?.[group] ?? []) {
      if (action.componentId == null || !action.limitedUse) continue;
      const charges = computeLimitedUseCharges(action.limitedUse, abilities, profBonus);
      if (charges) actionChargesById.set(action.componentId, charges);
    }
  }

  function add(
    name: string | undefined,
    rawDescription: string | undefined,
    source: string,
    group: Feature["group"],
    originType: Feature["originType"],
    explicitCharges?: { current: number; max: number; recovery: RecoveryType },
    dice?: any
  ) {
    const trimmedName = (name || "").trim();
    // The exact (non-normalized) name is the de-dupe key — normalizing away a
    // trailing parenthetical here would collide two *distinct* abilities that
    // happen to share a base name (e.g. "Radiant Fire (Fire)" vs "Radiant
    // Fire (Radiant)"), silently dropping one. `normalizeFeatureName` is only
    // for the resource cross-reference below, where that's the point (e.g.
    // matching the classFeature "Rage" against the action "Rage (Enter)").
    const dedupeKey = trimmedName.toLowerCase();
    if (!dedupeKey || seen.has(dedupeKey)) return;
    seen.add(dedupeKey);

    const matchedResource = resources.find((r) => normalizeFeatureName(r.name) === normalizeFeatureName(trimmedName));
    const charges = explicitCharges ?? matchedResource;
    const description = rawDescription
      ? (resolveSnippetTemplate(rawDescription, level, abilities, profBonus, charges?.max, speed) +
          diceTypeNote(trimmedName, dice)
        ).trim()
      : undefined;

    if (description) {
      if (seenDescriptions.has(description)) return;
      seenDescriptions.add(description);
    }

    features.push({
      id: `feature-${features.length}`,
      name: trimmedName,
      source,
      group,
      originType,
      ...(description ? { description } : {}),
      ...(charges ? { current: charges.current, max: charges.max, recovery: charges.recovery } : {}),
    });
  }

  // D&D Beyond's own Actions tab entries — anything genuinely usable via an
  // Action/Bonus Action/Reaction/Special activation. Processed first so these
  // win the de-dupe against the more generic classFeature/racialTrait/option
  // entry describing the same umbrella ability (e.g. the "Rage" classFeature
  // vs. the "Rage (Enter)" action) when their names coincide exactly.
  const actionFallbackSource: Record<"race" | "class" | "feat", string> = {
    race: "Race",
    class: "Class",
    feat: "Feat",
  };
  for (const group of ["race", "class", "feat"] as const) {
    for (const action of data.actions?.[group] ?? []) {
      if (!action.name) continue;
      const parentInfo = parentInfoById.get(action.componentId);
      const source = parentInfo?.name || actionFallbackSource[group];
      const originType = parentInfo?.originType ?? originTypeByDdbGroup[group];
      const charges = action.limitedUse ? computeLimitedUseCharges(action.limitedUse, abilities, profBonus) ?? undefined : undefined;
      add(
        action.name,
        shortDescription(action.snippet, action.description),
        source,
        activationGroup(action.activation?.activationType),
        originType,
        charges,
        action.dice
      );
    }
  }

  for (const trait of data.race?.racialTraits ?? []) {
    const df = trait.definition ?? {};
    if (df.hideOnDetailsPage || df.hideInSheet) continue;
    add(df.name, shortDescription(df.snippet, df.description), "Race", "other", "species", actionChargesById.get(df.id));
  }

  for (const cls of data.classes ?? []) {
    const subclassId = cls.subclassDefinition?.id;
    const className = cls.definition?.name || "Class";
    const subclassName = cls.subclassDefinition?.name || className;
    for (const cf of cls.classFeatures ?? []) {
      const df = cf.definition ?? {};
      if (df.hideInSheet) continue;
      if (df.requiredLevel != null && df.requiredLevel > (cls.level ?? 0)) continue;
      const isSubclassFeature = subclassId != null && df.classId === subclassId;
      add(
        df.name,
        shortDescription(df.snippet, df.description),
        isSubclassFeature ? subclassName : className,
        "other",
        "class",
        actionChargesById.get(df.id)
      );
    }
  }

  for (const feat of data.feats ?? []) {
    const df = feat.definition ?? {};
    add(df.name, shortDescription(df.snippet, df.description), "Feat", "other", "feat", actionChargesById.get(df.id));
  }

  // The *specific* choices a player made for a feature that offers options —
  // which Battle Master maneuvers, which Fighting Style, which Metamagic,
  // which racial lineage — live here, separately from the classFeatures/
  // racialTraits/feats definitions above (which only describe the umbrella
  // feature, e.g. "Maneuvers", not which ones were picked). Without this,
  // exactly the specific abilities a DM most wants to know about a character
  // were the ones missing.
  const optionGroups: Array<["race" | "class" | "feat", string]> = [
    ["race", "Race"],
    ["class", "Class"],
    ["feat", "Feat"],
  ];
  for (const [group, fallbackSource] of optionGroups) {
    for (const opt of data.options?.[group] ?? []) {
      const df = opt.definition ?? {};
      const parentInfo = parentInfoById.get(opt.componentId);
      const source = parentInfo?.name || fallbackSource;
      const originType = parentInfo?.originType ?? originTypeByDdbGroup[group];
      add(df.name, shortDescription(df.snippet, df.description), source, "other", originType, actionChargesById.get(df.id));
    }
  }

  const bg = data.background?.definition;
  if (bg?.featureName && bg?.featureDescription && !bg?.featureIsFeat) {
    add(bg.featureName, shortDescription(undefined, bg.featureDescription), "Background", "other", "background");
  }

  return features;
}

/**
 * A character's full known-spell list is split across two independent
 * sources that must be merged, not chosen between: `classSpells` (this
 * class's spell list — `countsAsKnownSpell`/`alwaysPrepared`/`prepared` mark
 * the ones actually known/prepared rather than just eligible) and
 * `spells.{race,class,background,item,feat}` (bonus spells granted outside
 * the class list, e.g. a subclass's bonus spells — confirmed on a real
 * export to contain spells entirely absent from `classSpells`). Within
 * `spells.*`, `countsAsKnownSpell` is uniformly false even for genuinely-
 * granted spells, so presence there is itself taken as the inclusion signal;
 * the same group can also list the same spell twice differing only in
 * `limitedUse` (an at-will/charges casting mode vs. a spell-slot mode) —
 * confirmed on a real export the entry actually carrying charge data can
 * appear in either array position, so a later duplicate that has
 * `limitedUse` upgrades an earlier duplicate that lacked it, rather than
 * always keeping whichever copy came first.
 *
 * `countsAsKnownSpell` only covers "fixed spellbook" casters (Wizard-style —
 * every spell copied into the book is known regardless of what's prepared
 * today) and `alwaysPrepared` only covers the handful of spells a subclass
 * grants automatically (e.g. domain/oath spells). Neither one is set for a
 * "prepare from the full class list" caster's (Cleric/Druid/Paladin) actual
 * daily choices — those live on the same entry under `prepared`, which is
 * why a Cleric's manually-selected prepared spells were silently dropped
 * without checking it too.
 */
const COMPONENT_LABELS: Record<number, string> = { 1: "V", 2: "S", 3: "M" };

function computeSpells(data: any, abilities: AbilityScores, profBonus: number, level: number, speed: number): KnownSpell[] {
  const spells: KnownSpell[] = [];
  const byName = new Map<string, KnownSpell>();

  function add(entry: any, source: string) {
    const df = entry?.definition;
    const key = (df?.name || "").trim().toLowerCase();
    if (!key) return;
    const charges = computeLimitedUseCharges(entry?.limitedUse, abilities, profBonus);

    const existing = byName.get(key);
    if (existing) {
      if (charges && existing.max === undefined) Object.assign(existing, charges);
      return;
    }

    const rawDescription = shortDescription(df.snippet, df.description);
    const components: number[] = df.components ?? [];
    const spell: KnownSpell = {
      id: `spell-${spells.length}`,
      name: df.name.trim(),
      level: df.level ?? 0,
      school: df.school || undefined,
      description: rawDescription
        ? resolveSnippetTemplate(rawDescription, level, abilities, profBonus, charges?.max, speed)
        : undefined,
      source,
      ...(components.length > 0
        ? { components: components.map((c) => COMPONENT_LABELS[c]).filter(Boolean).join(", ") }
        : {}),
      ...(df.componentsDescription ? { materialComponent: df.componentsDescription.trim() } : {}),
      ...(charges ? charges : {}),
    };
    byName.set(key, spell);
    spells.push(spell);
  }

  for (const group of data.classSpells ?? []) {
    for (const entry of group.spells ?? []) {
      if (entry.countsAsKnownSpell || entry.alwaysPrepared || entry.prepared) add(entry, "Class");
    }
  }

  const bonusGroups: Array<[string, string]> = [
    ["race", "Race"],
    ["class", "Class"],
    ["background", "Background"],
    ["item", "Item"],
    ["feat", "Feat"],
  ];
  for (const [key, source] of bonusGroups) {
    for (const entry of data.spells?.[key] ?? []) {
      add(entry, source);
    }
  }

  return spells;
}

/**
 * D&D Beyond's `spellSlots[].available` is NOT "slots remaining" — in every
 * real export it's 0 regardless of how many slots are actually free, while
 * `used` tracks consumption against the class's own slot table. The real
 * per-level max comes from `class.definition.spellRules.levelSpellSlots`
 * (indexed by that class's level), which D&D Beyond already computes
 * correctly including the standard full/half/third-caster progression.
 * Multiclass casters are combined via `multiClassSpellSlotDivisor` (1 for
 * full casters, 2 for half, 3 for third) per the normal 5e multiclassing
 * spellcasting rule, then looked up in the same shared table. Warlocks are
 * excluded — their Pact Magic slots are handled separately as a resource.
 */
function computeSpellSlots(data: any): SpellSlotLevel[] {
  const casterClasses = (data.classes ?? []).filter(
    (c: any) =>
      c.definition?.canCastSpells &&
      c.definition?.name !== "Warlock" &&
      Array.isArray(c.definition?.spellRules?.levelSpellSlots)
  );
  if (casterClasses.length === 0) return [];

  let combinedLevel = 0;
  let table: number[][] = casterClasses[0].definition.spellRules.levelSpellSlots;
  for (const c of casterClasses) {
    const divisor = c.definition.spellRules.multiClassSpellSlotDivisor || 1;
    combinedLevel += Math.floor((c.level ?? 0) / divisor);
    if (c.definition.spellRules.levelSpellSlots.length > table.length) {
      table = c.definition.spellRules.levelSpellSlots;
    }
  }
  combinedLevel = Math.min(combinedLevel, table.length - 1);
  const maxes: number[] = table[combinedLevel] ?? [];

  const usedByLevel: Record<number, number> = {};
  for (const slot of data.spellSlots ?? []) {
    usedByLevel[slot.level] = slot.used ?? 0;
  }

  const slots: SpellSlotLevel[] = [];
  maxes.forEach((max, idx) => {
    if (max > 0) {
      const level = idx + 1;
      const used = usedByLevel[level] ?? 0;
      slots.push({ level, current: Math.max(0, max - used), max });
    }
  });
  return slots;
}

/**
 * Unlike computeSpellSlots, Warlocks are NOT excluded here — Spell Attack
 * and Save DC apply to Pact Magic casters too, only the slot table differs.
 * For multiclass casters with different spellcasting abilities per class,
 * this picks the first caster class found (matching this codebase's existing
 * "known limitations" pattern of not fully modeling multiclass edge cases).
 */
function computeSpellcastingStats(
  data: any,
  abilities: AbilityScores,
  profBonus: number
): { modifier: number; attack: number; saveDc: number } | undefined {
  const casterClass = (data.classes ?? []).find((c: any) => c.definition?.canCastSpells && c.definition?.spellCastingAbilityId);
  if (!casterClass) return undefined;
  const ability = ABILITY_BY_ID[casterClass.definition.spellCastingAbilityId];
  if (!ability) return undefined;
  const modifier = abilityModifier(abilities[ability]);
  return { modifier, attack: modifier + profBonus, saveDc: 8 + modifier + profBonus };
}

export class DdbParseError extends Error {}

/** Maps a raw D&D Beyond `character/v5/character/{id}` response onto our Character shape. */
export function parseDdbCharacter(rawResponse: any, existing: Character): Character {
  const data = rawResponse?.data;
  if (!rawResponse?.success || !data) {
    throw new DdbParseError("Unexpected D&D Beyond response format.");
  }

  const mods = collectModifiers(data);
  const abilities = computeAbilityScores(data, mods);
  const dexMod = abilityModifier(abilities.dex);
  const wisMod = abilityModifier(abilities.wis);
  const conMod = abilityModifier(abilities.con);
  const intMod = abilityModifier(abilities.int);
  const { level, className, subclass } = computeClassSummary(data);
  const profBonus = proficiencyBonus(level);
  const { hp, maxHp, tempHp } = computeHp(data, mods, conMod, level);
  const { conditions, exhaustion } = computeConditionsAndExhaustion(data);
  const speed = computeSpeed(data, mods);
  const resources = computeResources(data, abilities, profBonus, level, speed);
  const senses = computeSenses(mods);

  return {
    ...existing,
    name: data.name || existing.name,
    avatarUrl: data.decorations?.avatarUrl || data.race?.avatarUrl || existing.avatarUrl,
    race: data.race?.fullName || existing.race,
    className: className || existing.className,
    subclass,
    level: level || existing.level,
    heroicInspiration: Boolean(data.inspiration),
    initiative: computeInitiative(dexMod, mods),
    combat: {
      hp,
      maxHp,
      tempHp,
      ac: computeArmorClass(data, abilities, mods),
      speed,
      passivePerception: computePassiveSkill(wisMod, profBonus, "perception", mods),
      passiveInvestigation: computePassiveSkill(intMod, profBonus, "investigation", mods),
      passiveInsight: computePassiveSkill(wisMod, profBonus, "insight", mods),
      conditions,
      exhaustion,
      deathSaves:
        hp <= 0
          ? {
              successes: data.deathSaves?.successCount ?? 0,
              failures: data.deathSaves?.failCount ?? 0,
            }
          : undefined,
    },
    stats: abilities,
    resources,
    spellSlots: computeSpellSlots(data),
    spellcasting: computeSpellcastingStats(data, abilities, profBonus),
    knownSpells: computeSpells(data, abilities, profBonus, level, speed),
    features: computeFeatures(data, resources, abilities, profBonus, level, speed),
    savingThrowProficiencies: computeSavingThrowProficiencies(mods),
    skillProficiencies: computeSkillProficiencies(mods, hasArmorStealthDisadvantage(data)),
    ...computeDamageModifiers(mods),
    advantages: computeAdvantages(mods),
    senses,
    inventory: computeInventory(data),
    currency: computeCurrency(data),
    synced: true,
    lastSyncedAt: new Date().toISOString(),
  };
}
