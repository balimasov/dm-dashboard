import { AbilityScores, KnownSpell, SpellcastingStats, SpellSlotLevel } from "../types";
import { formatModifier } from "../format";
import { ABILITY_BY_ID, abilityModifier, computeLimitedUseCharges, resolveSnippetTemplate, shortDescription, titleCase } from "./shared";
import { RawDdbAny, RawDdbData } from "./rawTypes";

const ABILITY_ABBR: Record<number, string> = { 1: "STR", 2: "DEX", 3: "CON", 4: "INT", 5: "WIS", 6: "CHA" };

/** D&D Beyond's own `activation.activationType` codes for a spell's casting time — 1/2 are both plain "action" (2, "no action", is rare enough on real spells not to distinguish), 3 is bonus action, 4 is reaction, 6/7 are minute-/hour-long rituals and long castings. Same convention `Feature.group`'s activation grouping uses, just kept as a real duration string here instead of a bucket name since a spell's hint has room to say "1 bonus action" outright. */
const ACTIVATION_UNIT: Record<number, string> = {
  1: "action",
  2: "action",
  3: "bonus action",
  4: "reaction",
  6: "minute",
  7: "hour",
};

function formatCastingTime(activation: RawDdbAny): string | undefined {
  const unit = ACTIVATION_UNIT[activation?.activationType];
  if (!unit) return undefined;
  const time = activation.activationTime || 1;
  return `${time} ${unit}${time === 1 ? "" : "s"}`;
}

/** `origin` is "Self"/"Touch" for those two special cases, otherwise a plain distance in `rangeValue` — an area spell (`aoeType`/`aoeValue` set, e.g. Fireball's 20 ft. Sphere) appends its shape/size, matching the parenthetical D&D Beyond itself shows next to the base range. */
function formatRange(range: RawDdbAny): string | undefined {
  if (!range) return undefined;
  const base: string | undefined =
    range.origin === "Self" ? "Self" : range.origin === "Touch" ? "Touch" : range.rangeValue ? `${range.rangeValue} ft.` : range.origin || undefined;
  if (!base) return undefined;
  return range.aoeType && range.aoeValue ? `${base} (${range.aoeValue} ft. ${range.aoeType})` : base;
}

/**
 * A spell's own `saveDcAbilityId` names *which ability the target rolls* (a
 * fixed rule per spell, e.g. Fireball is always a Dex save) — it's not the
 * caster's spellcasting ability, so it only supplies the ability-abbreviation
 * half of the DC text. The DC *number* itself always comes from the caster's
 * own `spellcasting.saveDc` (computed once per character in
 * `computeSpellcastingStats`), the same for every spell they know.
 */
function formatHitOrDc(df: RawDdbAny, spellcasting: SpellcastingStats | undefined): string | undefined {
  if (!spellcasting) return undefined;
  if (df.requiresAttackRoll) return formatModifier(spellcasting.attack);
  if (df.requiresSavingThrow) {
    const abbr = ABILITY_ABBR[df.saveDcAbilityId as number];
    return abbr ? `DC ${spellcasting.saveDc} ${abbr}` : `DC ${spellcasting.saveDc}`;
  }
  return undefined;
}

/**
 * D&D Beyond's spell definitions never carry a plain "damage dice" field —
 * the actual roll lives inside `modifiers`, as a `type: "damage"` entry (its
 * `die.diceString` + `friendlySubtypeName` giving e.g. "8d6 Fire" for
 * Fireball) or, for healing, a `type: "bonus", subType: "hit-points"` entry
 * (confirmed on Cure Wounds: "2d8" with no damage type, hence the plain
 * "Healing" label). A spell with neither — most buffs, control, and utility
 * effects — falls back to its first D&D Beyond classification tag (e.g.
 * "Buff", "Control") as the closest one-word summary this data offers.
 */
function formatEffect(df: RawDdbAny): { value: string; type?: string } | undefined {
  const mods: RawDdbAny[] = df.modifiers ?? [];
  const damageMod = mods.find((m) => m.type === "damage" && m.die?.diceString);
  if (damageMod) {
    const type = damageMod.friendlySubtypeName || titleCase(damageMod.subType ?? "");
    return { value: damageMod.die.diceString, ...(type ? { type } : {}) };
  }
  const healMod = mods.find((m) => m.type === "bonus" && m.subType === "hit-points" && m.die?.diceString);
  if (healMod) return { value: healMod.die.diceString, type: "Healing" };
  const tag = (df.tags ?? [])[0];
  return tag ? { value: tag } : undefined;
}

/** D&D Beyond's "Notes" column, duration half (components/material already surface separately via `components`/`materialComponent`) — `durationType` "Instantaneous" and the open-ended "Until Dispelled(...)" cases stand alone, everything else pairs `durationInterval`+`durationUnit` into a real duration string, prefixed "Concentration, " when `durationType` is "Concentration". */
function formatDuration(duration: RawDdbAny): string | undefined {
  if (!duration?.durationType) return undefined;
  if (duration.durationType === "Instantaneous") return "Instantaneous";
  if (duration.durationUnit && duration.durationInterval) {
    const unit = String(duration.durationUnit).toLowerCase();
    const time = `${duration.durationInterval} ${unit}${duration.durationInterval === 1 ? "" : "s"}`;
    return duration.durationType === "Concentration" ? `Concentration, ${time}` : time;
  }
  return duration.durationType;
}

/**
 * A third-caster subclass (Arcane Trickster, Eldritch Knight) is where
 * `canCastSpells` actually lives — the base class definition (Rogue,
 * Fighter) has it `false`, since a Rogue without that subclass casts
 * nothing. Confirmed on a real level 8 Arcane Trickster export: reading
 * only `definition.canCastSpells` excluded the class entirely, showing no
 * spell slots at all despite `definition.spellRules.levelSpellSlots` (still
 * on the base class) already having the correct third-caster progression.
 */
export function classCastsSpells(c: RawDdbAny): boolean {
  return Boolean(c.definition?.canCastSpells || c.subclassDefinition?.canCastSpells);
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
 * the same group can also list the same spell twice, differing only in
 * `limitedUse` — a feat like Fey Touched grants both an at-will-ish free
 * cast (its own charge pool, e.g. once per Long Rest) *and* the ability to
 * cast the same spell normally using a spell slot, and D&D Beyond represents
 * that as two separate entries (`usesSpellSlot`/`alwaysPrepared` true on one,
 * `limitedUse` set on the other). These used to be merged into one row under
 * the assumption they were the same grant listed twice — confirmed on a real
 * export that they're two genuinely different casting modes the player can
 * choose between, so both are kept as separate spells (keyed on name *and*
 * whether the entry actually resolves to a charge pool, not name alone).
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

export function computeSpells(
  data: RawDdbData,
  abilities: AbilityScores,
  profBonus: number,
  level: number,
  speed: number,
  spellSlots: SpellSlotLevel[],
  spellcasting: SpellcastingStats | undefined
): KnownSpell[] {
  const spells: KnownSpell[] = [];
  const seenKeys = new Set<string>();

  function add(entry: RawDdbAny, source: string) {
    const df = entry?.definition;
    const name = (df?.name || "").trim().toLowerCase();
    if (!name) return;
    const charges = computeLimitedUseCharges(entry?.limitedUse, abilities, profBonus);
    // An entry with `usesSpellSlot: true` and no charge pool of its own means
    // "cast this using one of your normal spell slots" — meaningless for a
    // character with no spell slots at all (e.g. a non-caster race granted
    // an innate spell like Darkness that D&D Beyond also lists a
    // spell-slot-cast variant of, alongside the 1/day charge variant).
    // Confirmed on a real non-caster Fighter export ("Alor"): without this
    // check, the card offered a "cast as a spell" option that could never
    // actually be used. At-will entries (`usesSpellSlot: false`, also no
    // charges — e.g. Dancing Lights) are unaffected, since they never needed
    // a slot to begin with.
    if (entry?.usesSpellSlot && spellSlots.length === 0) return;
    // Keyed on name *and* casting mode, not name alone — a free-cast/charge
    // entry and a spell-slot entry for the same spell are different modes to
    // show separately, but two identical-mode entries (e.g. the same known
    // spell appearing in more than one source group) still collapse to one.
    const key = `${name}|${charges ? "limited" : "slot"}`;
    if (seenKeys.has(key)) return;
    seenKeys.add(key);

    const rawDescription = shortDescription(df.snippet, df.description);
    const components: number[] = df.components ?? [];
    const tags: string[] = df.tags ?? [];
    const effect = formatEffect(df);
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
      ...(tags.length > 0 ? { tags } : {}),
      ...(df.range?.aoeType ? { isAreaEffect: true } : {}),
      // Same `activationType` convention `Feature.group`'s "reaction" case
      // uses (see `ddbParser/features.ts`'s own doc comment) — 4 is reaction,
      // confirmed on real Shield/Counterspell exports.
      ...(df.activation?.activationType === 4 ? { isReaction: true } : {}),
      ...(formatCastingTime(df.activation) ? { castingTime: formatCastingTime(df.activation) } : {}),
      ...(formatRange(df.range) ? { range: formatRange(df.range) } : {}),
      ...(formatHitOrDc(df, spellcasting) ? { hitOrDc: formatHitOrDc(df, spellcasting) } : {}),
      ...(effect ? { effect: effect.value, ...(effect.type ? { effectType: effect.type } : {}) } : {}),
      ...(formatDuration(df.duration) ? { duration: formatDuration(df.duration) } : {}),
    };
    spells.push(spell);
  }

  for (const group of data.classSpells ?? []) {
    for (const entry of group.spells ?? []) {
      if (entry.countsAsKnownSpell || entry.alwaysPrepared || entry.prepared) add(entry, "Class");
    }
  }

  const bonusGroups: Array<[keyof NonNullable<RawDdbData["spells"]>, string]> = [
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
export function computeSpellSlots(data: RawDdbData): SpellSlotLevel[] {
  const casterClasses = (data.classes ?? []).filter(
    (c) =>
      classCastsSpells(c) &&
      c.definition?.name !== "Warlock" &&
      Array.isArray(c.definition?.spellRules?.levelSpellSlots)
  );
  if (casterClasses.length === 0) return computePactMagicSlots(data);

  // The divisor only applies when actually combining *multiple* casting
  // classes — a solo Artificer (divisor 2, since that's its contribution
  // when multiclassed with something else) was getting its own level halved
  // against its own single-class table, undercounting every slot level and
  // dropping some entirely (e.g. a level 8 Artificer solo was computed as
  // level 4, losing its 2nd-level slots outright).
  let combinedLevel = 0;
  let table: number[][] = casterClasses[0].definition.spellRules.levelSpellSlots;
  for (const c of casterClasses) {
    const divisor = casterClasses.length > 1 ? c.definition.spellRules.multiClassSpellSlotDivisor || 1 : 1;
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
  return [...slots, ...computePactMagicSlots(data)];
}

/**
 * Warlocks don't use the normal per-level spell slot pool at all — Pact
 * Magic is a single, separate pool that's always at the character's current
 * max slot level (e.g. two 3rd-level slots at character level 6, not a
 * blend of 1st/2nd/3rd like a full caster). D&D Beyond exposes the Warlock
 * class's own progression through the exact same `spellRules.levelSpellSlots`
 * table read above, just scoped to the Warlock class/level alone rather than
 * combined with any other class. We deliberately don't read
 * `data.pactMagic[].available` for the same reason `spellSlots[].available`
 * isn't trusted anywhere else in this file — it's 0 in every real export;
 * only `used` against the table is reliable. The table only ever has one
 * non-zero level per row (the current pact slot level), so this always
 * returns at most one entry.
 */
export function computePactMagicSlots(data: RawDdbData): SpellSlotLevel[] {
  const warlock = (data.classes ?? []).find(
    (c) => c.definition?.name === "Warlock" && Array.isArray(c.definition?.spellRules?.levelSpellSlots)
  );
  if (!warlock) return [];
  const table: number[][] = warlock.definition.spellRules.levelSpellSlots;
  const charLevel = Math.min(warlock.level ?? 0, table.length - 1);
  const maxes: number[] = table[charLevel] ?? [];

  let slotLevel = 0;
  let max = 0;
  maxes.forEach((count, idx) => {
    if (count > 0) {
      slotLevel = idx + 1;
      max = count;
    }
  });
  if (max === 0) return [];

  const used = (data.pactMagic ?? []).find((p) => p.level === slotLevel)?.used ?? 0;
  return [{ level: slotLevel, current: Math.max(0, max - used), max }];
}

/**
 * Unlike computeSpellSlots, Warlocks are NOT excluded here — Spell Attack
 * and Save DC apply to Pact Magic casters too, only the slot table differs.
 * For multiclass casters with different spellcasting abilities per class,
 * this picks the first caster class found (matching this codebase's existing
 * "known limitations" pattern of not fully modeling multiclass edge cases).
 */
export function computeSpellcastingStats(
  data: RawDdbData,
  abilities: AbilityScores,
  profBonus: number
): { modifier: number; attack: number; saveDc: number } | undefined {
  const casterClass = (data.classes ?? []).find(
    (c) => classCastsSpells(c) && (c.definition?.spellCastingAbilityId || c.subclassDefinition?.spellCastingAbilityId)
  );
  if (!casterClass) return undefined;
  const abilityId = casterClass.definition?.spellCastingAbilityId ?? casterClass.subclassDefinition?.spellCastingAbilityId;
  const ability = ABILITY_BY_ID[abilityId];
  if (!ability) return undefined;
  const modifier = abilityModifier(abilities[ability]);
  return { modifier, attack: modifier + profBonus, saveDc: 8 + modifier + profBonus };
}
