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
 * modifiers keyed by `subType`, but the `type` field is inconsistent across
 * real character exports (`"set-base"` in one sample, `"sense"` in another)
 * — so both are accepted, keying only off the known `subType` names. When
 * more than one source grants the same sense (e.g. race + an item), the
 * larger range wins.
 */
function computeSenses(mods: any[]): Sense[] {
  const senses: Sense[] = [];
  for (const subType of SENSE_SUBTYPES) {
    const range = mods
      .filter((m) => (m.type === "sense" || m.type === "set-base") && m.subType === subType && m.isGranted)
      .reduce((max, m) => Math.max(max, m.value ?? 0), 0);
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
 * This retroactive formula only holds while a character's Constitution has
 * never changed — if it's raised or lowered later (ASI, a curse, a DM
 * ruling...), recomputing with the *current* modifier silently rewrites HP
 * gained at old levels under a different modifier, drifting the total in
 * either direction with no way to recover the real history from a snapshot.
 * So the computed value is only used to seed max HP the first time a
 * character is synced (or whenever `maxHpLocked` is off); every sync after
 * that defaults to treating max HP as DM-owned and only refreshes current HP
 * against it using D&D Beyond's damage tracker (`removedHitPoints`), which is
 * safe to trust every time. An explicit D&D Beyond HP override always wins
 * outright, regardless of the lock.
 */
function computeHp(data: any, mods: any[], conMod: number, totalLevel: number, existing: Character) {
  const perLevelBonus = mods
    .filter((m) => m.type === "bonus" && m.subType === "hit-points-per-level" && m.isGranted)
    .reduce((sum, m) => sum + (m.value ?? 0) * totalLevel, 0);
  const flatBonus = mods
    .filter((m) => m.type === "bonus" && m.subType === "hit-points" && m.isGranted)
    .reduce((sum, m) => sum + (m.value ?? 0), 0);

  const computedMax =
    conMod * totalLevel + (data.baseHitPoints ?? 0) + (data.bonusHitPoints ?? 0) + perLevelBonus + flatBonus;
  const shouldLockMax = existing.maxHpLocked ?? existing.synced ?? false;
  const maxHp = data.overrideHitPoints ?? (shouldLockMax ? existing.combat.maxHp : computedMax);
  const hp = Math.max(0, maxHp - (data.removedHitPoints ?? 0));
  return { hp, maxHp, tempHp: data.temporaryHitPoints ?? 0, maxHpLocked: true };
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

function computeSpeed(data: any): number {
  return data.race?.weightSpeeds?.normal?.walk ?? 30;
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

/**
 * Resolves the D&D Beyond snippet template placeholders we can fill in from
 * data we have. Covers every simple, single-concept placeholder confirmed
 * across real Resource/Feature/Spell descriptions (`classlevel`, ability
 * `modifier`, `proficiency`, and the `savedc`/`spellattack` shorthands for
 * "8 + prof + mod" / "prof + mod"), plus `scalevalue`/`limiteduse` when a
 * charge count is available (only meaningful for a Resource, or a Feature/
 * Spell that turned out to have its own charge pool).
 *
 * Deliberately does NOT attempt the compound arithmetic expressions that
 * also show up in the wild (e.g. `{{(12+classlevel)/7#rounddown,min:2,
 * unsigned}}`, or the genuinely idiosyncratic `{{4+(classlevel-13)@min:0,
 * max:1*4}}`) — the syntax for those isn't fully reverse-engineered from the
 * handful of real examples seen so far, and a wrong guess would print a
 * confidently incorrect number, which is worse than the catch-all below
 * silently dropping it.
 */
function resolveSnippetTemplate(
  text: string,
  level: number,
  abilities: AbilityScores,
  profBonus: number,
  maxUses?: number
): string {
  return text
    .replace(/\{\{(?:scalevalue|limiteduse)\}\}/gi, () => (maxUses !== undefined ? String(maxUses) : ""))
    .replace(/\{\{classlevel\}\}/gi, String(level))
    .replace(/\{\{proficiency(?:#(signed|unsigned))?\}\}/gi, (_match, sign) =>
      sign === "signed" ? formatModifier(profBonus) : String(profBonus)
    )
    .replace(/\{\{savedc:(\w+)\}\}/gi, (_match, abilityKey) => {
      const ability = String(abilityKey).toLowerCase() as keyof AbilityScores;
      return String(8 + profBonus + abilityModifier(abilities[ability] ?? 10));
    })
    .replace(/\{\{spellattack:(\w+)\}\}/gi, (_match, abilityKey) => {
      const ability = String(abilityKey).toLowerCase() as keyof AbilityScores;
      return String(profBonus + abilityModifier(abilities[ability] ?? 10));
    })
    .replace(/\{\{modifier:(\w+)(?:@min:(-?\d+))?#(signed|unsigned)\}\}/gi, (_match, abilityKey, min, sign) => {
      const ability = String(abilityKey).toLowerCase() as keyof AbilityScores;
      let mod = abilityModifier(abilities[ability] ?? 10);
      if (min !== undefined) mod = Math.max(mod, Number(min));
      return sign === "signed" ? formatModifier(mod) : String(mod);
    })
    .replace(/\{\{[^}]+\}\}/g, "")
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

function computeResources(data: any, abilities: AbilityScores, profBonus: number, level: number): Resource[] {
  function fromLimitedUse(
    name: string,
    lu: any,
    keyPrefix: string,
    idx: number,
    rawDescription: string | undefined,
    source: string
  ): Resource | null {
    const charges = computeLimitedUseCharges(lu, abilities, profBonus);
    if (!charges) return null;
    const description = rawDescription
      ? resolveSnippetTemplate(rawDescription, level, abilities, profBonus, charges.max)
      : undefined;
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
        source
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
 * excludes (never returned at all) — D&D Beyond's own flags, not a heuristic,
 * and not something worth a DM reviewing.
 *
 * Beyond that, real exports still surface plenty of entries that are
 * technically "features" but aren't actionable abilities — organizational
 * boilerplate (a class's "Core X Traits" grant-everything wrapper, a
 * "{Class} Subclass"/"Martial Archetype" subclass-choice announcement,
 * "Ability Score Improvement") or flat rulebook reference dumps
 * ("Proficiencies", "Hit Points", "Languages") that `hideOnDetailsPage`
 * doesn't reliably catch (confirmed inconsistent between two real exports —
 * one Race correctly hides "Creature Type"/"Size"/"Speed", another leaves
 * them all visible). Unlike the hard excludes above, these are *heuristics*
 * being validated against real characters, so instead of dropping them they
 * get tagged with `filteredReason` and stay in the returned array — the UI
 * decides whether to show them in a separate review area.
 */
const LEGACY_SUBCLASS_ANNOUNCEMENT_NAMES = new Set([
  "martial archetype",
  "divine domain",
  "sacred oath",
  "otherworldly patron",
  "primal path",
  "roguish archetype",
  "monastic tradition",
  "arcane tradition",
  "divine order",
]);

const BOILERPLATE_FEATURE_NAMES = new Set([
  "proficiencies",
  "hit points",
  "languages",
  "creature type",
  "size",
  "speed",
  // Generic wrapper features that exist on nearly every class/feat but whose
  // real content is already shown elsewhere with more specific detail —
  // "Spellcasting" duplicates the whole Spells section, "Expertise" duplicates
  // the amber Skills pills, "Skilled" (an origin feat) duplicates whichever
  // skills the player picked, already visible as ordinary skill proficiencies.
  "spellcasting",
  "expertise",
  "skilled",
]);

/** Strips a trailing parenthetical (e.g. "Rage (Enter)" -> "rage") so a Feature can be matched against the same ability tracked elsewhere under a plainer name. */
function normalizeFeatureName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*$/, "");
}

/**
 * Beyond name-based rules, some `data.options.*` entries (see computeFeatures
 * below) are themselves just a trivial sub-note about a choice already made
 * elsewhere — e.g. a feat's "which ability score does this use" pointer
 * ("Charisma is the ability score you use for this feat") or a racial
 * lineage's "which ability powers these spells" note ("Your High Elf Lineage
 * spells use Intelligence") — confirmed verbatim on real Sorcerer/Bard
 * exports. Neither describes an action; both are already implied by the
 * parent feature/spell they modify.
 */
function classifyFeatureFilter(name: string, rawDescription?: string): Feature["filteredReason"] {
  const n = normalizeFeatureName(name);
  if (/ability score (improvement|increase)s?\b/.test(n)) return "ability-score";
  if (/^increase (one|two|a) scores?\b/.test(n)) return "ability-score";
  if (/subclass$/.test(n) || LEGACY_SUBCLASS_ANNOUNCEMENT_NAMES.has(n)) return "subclass-announcement";
  if (/^core .+ traits$/.test(n)) return "core-traits";
  if (BOILERPLATE_FEATURE_NAMES.has(n)) return "boilerplate";
  // "Weapon Mastery" (and its later re-announcements, e.g. "4: Weapon
  // Mastery", "10: Weapon Mastery") only describes that mastery properties
  // exist — the specific properties a player actually chose (e.g. "Handaxe
  // (Vex)") are already shown as their own Feature entries via `options`.
  if (/^(\d+:\s*)?weapon mastery$/.test(n)) return "boilerplate";
  const d = rawDescription?.trim();
  if (d) {
    // Covers both "Charisma is the ability score you use for this feat" and
    // "Wisdom is your ability score increased by this feat..." / "Charisma is
    // your spellcasting ability for..." — all just a one-line pointer to an
    // ability score already implied by the feature/spell they modify.
    if (/^(strength|dexterity|constitution|intelligence|wisdom|charisma) is (?:the|your) (?:ability score|spellcasting ability)\b/i.test(d))
      return "ability-score";
    if (/^your .+ uses? \w+\.?$/i.test(d)) return "boilerplate";
    // A trait/feat whose entire effect is granting proficiency with some
    // armor/weapon/tool/skill (e.g. "You gain proficiency with one type of
    // artisan's tools.") isn't an actionable ability on its own — confirmed on
    // real exports (Fighter's "Student of War", Elf's "Keen Senses").
    if (/^you (?:(?:have|gain) proficiency|are proficient) (?:with|in) [^.]+\.?$/i.test(d)) return "boilerplate";
  }
  return undefined;
}

function computeFeatures(
  data: any,
  resources: Resource[],
  senses: Sense[],
  abilities: AbilityScores,
  profBonus: number,
  level: number
): Feature[] {
  const features: Feature[] = [];
  const seen = new Set<string>();

  // Lets an `options.*` entry (see below) report the *specific* feature that
  // granted the choice — e.g. "Maneuvers" or "Metamagic Options" — instead of
  // just the broad group it came from, and inherit that parent's exact
  // category (a Battle Master's maneuvers should land in the Subclass
  // sub-section, not the generic Class one). Confirmed on real exports: an
  // option's `componentId` matches the `definition.id` of its parent racial
  // trait/class feature/feat (a Battle Master's chosen maneuvers all share
  // `componentId` with the "Maneuvers" class feature; a Sorcerer's Metamagic
  // choices share it with "Metamagic Options", a *different* class feature
  // from the "Metamagic" one that's otherwise shown). Built from the raw,
  // unfiltered definitions so a hidden/filtered parent still resolves.
  const parentInfoById = new Map<number, { name: string; category: Feature["category"] }>();
  for (const trait of data.race?.racialTraits ?? []) {
    const df = trait.definition;
    if (df?.id != null && df?.name) parentInfoById.set(df.id, { name: df.name, category: "race" });
  }
  for (const cls of data.classes ?? []) {
    const subclassId = cls.subclassDefinition?.id;
    for (const cf of cls.classFeatures ?? []) {
      const df = cf.definition;
      if (df?.id == null || !df?.name) continue;
      const category: Feature["category"] = subclassId != null && df.classId === subclassId ? "subclass" : "class";
      parentInfoById.set(df.id, { name: df.name, category });
    }
  }
  for (const feat of data.feats ?? []) {
    const df = feat.definition;
    if (df?.id != null && df?.name) parentInfoById.set(df.id, { name: df.name, category: "feat" });
  }

  function add(
    name: string | undefined,
    rawDescription: string | undefined,
    source: string,
    category: Feature["category"]
  ) {
    const key = normalizeFeatureName(name || "");
    if (!key || seen.has(key)) return;
    seen.add(key);

    const isDuplicateSense = senses.some((s) => normalizeFeatureName(s.name) === key);
    const filteredReason = isDuplicateSense
      ? "duplicate-of-sense"
      : classifyFeatureFilter(name!, rawDescription);
    const matchedResource = resources.find((r) => normalizeFeatureName(r.name) === key);
    const description = rawDescription
      ? resolveSnippetTemplate(rawDescription, level, abilities, profBonus, matchedResource?.max)
      : undefined;

    features.push({
      id: `feature-${features.length}`,
      name: name!.trim(),
      source,
      category,
      ...(description ? { description } : {}),
      ...(filteredReason ? { filteredReason } : {}),
      ...(matchedResource
        ? { current: matchedResource.current, max: matchedResource.max, recovery: matchedResource.recovery }
        : {}),
    });
  }

  for (const trait of data.race?.racialTraits ?? []) {
    const df = trait.definition ?? {};
    if (df.hideOnDetailsPage || df.hideInSheet) continue;
    add(df.name, shortDescription(df.snippet, df.description), "Race", "race");
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
        isSubclassFeature ? "subclass" : "class"
      );
    }
  }

  for (const feat of data.feats ?? []) {
    const df = feat.definition ?? {};
    add(df.name, shortDescription(df.snippet, df.description), "Feat", "feat");
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
      add(df.name, shortDescription(df.snippet, df.description), source, parentInfo?.category ?? group);
    }
  }

  const bg = data.background?.definition;
  if (bg?.featureName && bg?.featureDescription && !bg?.featureIsFeat) {
    add(bg.featureName, shortDescription(undefined, bg.featureDescription), "Background", "background");
  }

  return features;
}

/**
 * A character's full known-spell list is split across two independent
 * sources that must be merged, not chosen between: `classSpells` (this
 * class's spell list — `countsAsKnownSpell`/`alwaysPrepared` mark the ones
 * actually known rather than just eligible) and `spells.{race,class,
 * background,item,feat}` (bonus spells granted outside the class list, e.g.
 * a subclass's bonus spells — confirmed on a real export to contain spells
 * entirely absent from `classSpells`). Within `spells.*`, `countsAsKnownSpell`
 * is uniformly false even for genuinely-granted spells, so presence there is
 * itself taken as the inclusion signal; the same group can also list the same
 * spell twice differing only in `limitedUse` (an at-will/charges casting mode
 * vs. a spell-slot mode) — confirmed on a real export the entry actually
 * carrying charge data can appear in either array position, so a later
 * duplicate that has `limitedUse` upgrades an earlier duplicate that lacked
 * it, rather than always keeping whichever copy came first.
 */
const COMPONENT_LABELS: Record<number, string> = { 1: "V", 2: "S", 3: "M" };

function computeSpells(data: any, abilities: AbilityScores, profBonus: number, level: number): KnownSpell[] {
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
        ? resolveSnippetTemplate(rawDescription, level, abilities, profBonus, charges?.max)
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
      if (entry.countsAsKnownSpell || entry.alwaysPrepared) add(entry, "Class");
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
  const { hp, maxHp, tempHp, maxHpLocked } = computeHp(data, mods, conMod, level, existing);
  const { conditions, exhaustion } = computeConditionsAndExhaustion(data);
  const resources = computeResources(data, abilities, profBonus, level);
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
    maxHpLocked,
    combat: {
      hp,
      maxHp,
      tempHp,
      ac: computeArmorClass(data, abilities, mods),
      speed: computeSpeed(data),
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
    knownSpells: computeSpells(data, abilities, profBonus, level),
    features: computeFeatures(data, resources, senses, abilities, profBonus, level),
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
