"use client";

import { useState } from "react";
import {
  CREATURE_AOE_SHAPES,
  CreatureAoeShape,
  CreatureDamageRoll,
  CreatureEffect,
  CreatureEffectKind,
  CreatureTrait,
  STAT_ORDER,
} from "@/lib/types";
import { inferStructuredTraitFields } from "@/lib/creatureStructuredInfer";
import { addBtnCls, AutoGrowTextarea, CHECKBOX_BASE_CLS, Field, groupInputCls, inputCls } from "./shared";
import { MetaBadge } from "@/components/ui/MetaBadge";
import { IconButton } from "@/components/ui/IconButton";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { DIM_ROW_CARD_CLS } from "@/components/ui/containerStyles";
import { FORM_SECTION_HEADING_CLS, HINT_TEXT_CLS } from "@/components/ui/typography";

const TRAIT_GROUPS: Array<{ value: NonNullable<CreatureTrait["group"]>; label: string }> = [
  { value: "trait", label: "Trait" },
  { value: "action", label: "Action" },
  { value: "bonusAction", label: "Bonus Action" },
  { value: "reaction", label: "Reaction" },
  { value: "legendary", label: "Legendary Action" },
];

/**
 * `attackType` ("melee"/"ranged") and `attackKind` ("weapon"/"spell") are two
 * independent axes on `CreatureAttack`, but a stat block always names them
 * together ("Melee Weapon Attack", "Ranged Spell Attack") and there's no
 * value in editing them as two separate dropdowns — so the form combines
 * them into one 4-option select, encoding/decoding both fields from the one
 * choice. `decodeAttackKindKey`'s fallback to "meleeWeapon" mirrors
 * `attackKind`'s own "defaults to weapon" convention for attacks written
 * before this field existed.
 */
type AttackKindKey = "meleeWeapon" | "rangedWeapon" | "meleeSpell" | "rangedSpell";

const ATTACK_KIND_OPTIONS: Array<{ value: AttackKindKey; label: string }> = [
  { value: "meleeWeapon", label: "Melee Weapon Attack" },
  { value: "rangedWeapon", label: "Ranged Weapon Attack" },
  { value: "meleeSpell", label: "Melee Spell Attack" },
  { value: "rangedSpell", label: "Ranged Spell Attack" },
];

function encodeAttackKindKey(attackType: "melee" | "ranged", attackKind: "weapon" | "spell" | undefined): AttackKindKey {
  const kind = attackKind ?? "weapon";
  return `${attackType}${kind === "spell" ? "Spell" : "Weapon"}` as AttackKindKey;
}

function decodeAttackKindKey(key: AttackKindKey): { attackType: "melee" | "ranged"; attackKind: "weapon" | "spell" } {
  return {
    attackType: key.startsWith("melee") ? "melee" : "ranged",
    attackKind: key.endsWith("Spell") ? "spell" : "weapon",
  };
}

const EFFECT_KIND_LABELS: Record<CreatureEffectKind, string> = {
  heal: "Heal",
  tempHp: "Temp HP",
  acBonus: "AC",
  other: "",
};

const AOE_SHAPE_LABELS: Record<CreatureAoeShape, string> = {
  cone: "Cone",
  cube: "Cube",
  cylinder: "Cylinder",
  line: "Line",
  sphere: "Sphere",
};

/** e.g. "20-ft. Sphere" or, for a line's two dimensions, "60 ft. × 5 ft. Line". */
function formatAoe(aoe: NonNullable<CreatureTrait["aoe"]>): string {
  if (aoe.shape === "line" && aoe.width) return `${aoe.size} ft. × ${aoe.width} ft. Line`;
  return `${aoe.size}-ft. ${AOE_SHAPE_LABELS[aoe.shape]}`;
}

/**
 * The seven "what kind of thing does this action do" mechanics a DM picks
 * from — deliberately a fixed checklist (multi-select: an action can be an
 * Attack *and* grant an Effect, e.g. a bite that also knocks prone) rather
 * than a free-form list, since real stat blocks describe an action's
 * mechanics as a small closed set, not an arbitrary pile of line items.
 * `heal`/`effect`/`custom` all key off `CreatureTrait.effects[].kind`
 * (`"heal"`, `"tempHp"`/`"acBonus"`, `"other"` respectively) since they
 * share that one array under the hood — only `attack`/`save`/`spell`/`aoe`
 * get their own dedicated trait field. `aoe` is a bit different from the
 * other six — it's a targeting shape, not a "what happens", so it can (and
 * often does, e.g. Ice Knife) apply on top of whichever of the other six are
 * also checked, rather than being an alternative to them.
 */
export type Mechanic = "attack" | "save" | "heal" | "effect" | "spell" | "custom" | "aoe";

export const MECHANIC_ORDER: Mechanic[] = ["attack", "save", "heal", "effect", "spell", "custom", "aoe"];

export const MECHANIC_LABELS: Record<Mechanic, string> = {
  attack: "Attack",
  save: "Saving Throw",
  heal: "Healing",
  effect: "Effect",
  spell: "Spell",
  custom: "Custom",
  aoe: "Area of Effect",
};

/**
 * Which mechanics a trait currently has data for — derived straight from its
 * fields rather than tracked as separate state, so the checkboxes can never
 * drift out of sync with what the trait actually holds.
 */
function traitMechanics(t: CreatureTrait): Set<Mechanic> {
  const effects = t.effects ?? [];
  const mechanics = new Set<Mechanic>();
  if (t.attack) mechanics.add("attack");
  if (t.save) mechanics.add("save");
  if (effects.some((e) => e.kind === "heal")) mechanics.add("heal");
  if (effects.some((e) => e.kind === "tempHp" || e.kind === "acBonus")) mechanics.add("effect");
  if (t.spell !== undefined) mechanics.add("spell");
  if (effects.some((e) => e.kind === "other")) mechanics.add("custom");
  if (t.aoe) mechanics.add("aoe");
  return mechanics;
}

/**
 * One color per mechanic, reused for its checkbox accent, its field group's
 * left-accent border/label, and its collapsed-row summary badge — the same
 * color shows up in all three places for a given mechanic, so "which fields
 * belong to Effect" is answered by color alone, not by re-reading labels.
 * `heal`/`spell`/`custom` intentionally match the emerald/fuchsia/amber
 * already used for their equivalent read-only badges in
 * `CreatureAbilitiesPanel` (heal/spell/"other" effect) — that panel imports
 * `heal`/`custom` straight from here instead of hand-duplicating the class
 * strings, so the two can never drift apart again. `attack`/`save`/`effect`
 * have no existing read-view color to match, so rose/indigo/cyan were
 * picked simply to stay visually distinct from every other one here.
 */
export const MECHANIC_STYLE: Record<Mechanic, { border: string; label: string; accent: string; badge: string }> = {
  attack: {
    border: "border-rose-700",
    label: "text-rose-400",
    accent: "accent-rose-600",
    badge: "border-rose-700 bg-rose-950/30 text-rose-300",
  },
  save: {
    border: "border-indigo-700",
    label: "text-indigo-400",
    accent: "accent-indigo-600",
    badge: "border-indigo-700 bg-indigo-950/30 text-indigo-300",
  },
  heal: {
    border: "border-emerald-700",
    label: "text-emerald-400",
    accent: "accent-emerald-600",
    badge: "border-emerald-700 bg-emerald-950/30 text-emerald-300",
  },
  effect: {
    border: "border-cyan-700",
    label: "text-cyan-400",
    accent: "accent-cyan-600",
    badge: "border-cyan-700 bg-cyan-950/30 text-cyan-300",
  },
  spell: {
    border: "border-fuchsia-700",
    label: "text-fuchsia-400",
    accent: "accent-fuchsia-600",
    badge: "border-fuchsia-700 bg-fuchsia-950/30 text-fuchsia-300",
  },
  custom: {
    border: "border-amber-700",
    label: "text-amber-400",
    accent: "accent-amber-600",
    badge: "border-amber-700 bg-amber-950/30 text-amber-300",
  },
  aoe: {
    border: "border-orange-700",
    label: "text-orange-400",
    accent: "accent-orange-600",
    badge: "border-orange-700 bg-orange-950/30 text-orange-300",
  },
};

/**
 * Wraps one mechanic's field group with its color's left-accent border and
 * an uppercase label naming the mechanic — the visual container that ties
 * a checked checkbox to "these specific fields are the ones it added".
 * Fields inside use `groupInputCls` (no per-field border) rather than the
 * form's usual `inputCls`: the colored border + tinted background of the
 * group itself is what separates one mechanic's fields from the next now,
 * so a border on every individual input inside would just be redundant
 * boxes-within-boxes.
 */
function MechanicGroup({ mechanic, children }: { mechanic: Mechanic; children: React.ReactNode }) {
  const style = MECHANIC_STYLE[mechanic];
  return (
    <div className={`space-y-2 rounded-r-md border-l-2 bg-slate-950/40 py-2 pl-3 pr-2 ${style.border}`}>
      <p className={`text-[10px] font-semibold uppercase tracking-wide ${style.label}`}>{MECHANIC_LABELS[mechanic]}</p>
      {children}
    </div>
  );
}

/**
 * Colored-badge replacement for the old plain-text summary line — same
 * information (attack bonus/damage, save DC, heal/effect amounts, spell
 * list), but each badge borrows its mechanic's color from `MECHANIC_STYLE`
 * so a collapsed row reads at a glance without needing to expand it, and
 * without repeating recharge (already its own always-visible input).
 */
function TraitSummaryBadges({ trait }: { trait: CreatureTrait }) {
  const badges: Array<{ key: string; className: string; text: string }> = [];
  if (trait.attack) {
    const damageText = trait.attack.damage.map((d) => (d.damageType ? `${d.dice} ${d.damageType}` : d.dice)).join(" + ");
    const bonusText =
      trait.attack.attackBonus !== undefined
        ? `${trait.attack.attackBonus >= 0 ? "+" : ""}${trait.attack.attackBonus}`
        : undefined;
    const text = [bonusText, damageText].filter(Boolean).join(" · ");
    if (text) badges.push({ key: "attack", className: MECHANIC_STYLE.attack.badge, text });
  }
  if (trait.save) {
    badges.push({ key: "save", className: MECHANIC_STYLE.save.badge, text: `DC ${trait.save.dc} ${trait.save.ability.toUpperCase()}` });
  }
  (trait.effects ?? []).forEach((e, i) => {
    const style = e.kind === "heal" ? MECHANIC_STYLE.heal : e.kind === "other" ? MECHANIC_STYLE.custom : MECHANIC_STYLE.effect;
    const label = e.kind === "other" ? e.label || "Effect" : EFFECT_KIND_LABELS[e.kind];
    badges.push({ key: `effect-${i}`, className: style.badge, text: `${label} ${e.amount}` });
  });
  if (trait.spell) {
    badges.push({ key: "spell", className: MECHANIC_STYLE.spell.badge, text: trait.spell });
  }
  if (trait.aoe) {
    badges.push({ key: "aoe", className: MECHANIC_STYLE.aoe.badge, text: formatAoe(trait.aoe) });
  }
  if (badges.length === 0) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5 pl-1">
      {badges.map((b) => (
        <MetaBadge key={b.key} label={b.text} uppercase={false} colorClassName={b.className} />
      ))}
    </div>
  );
}

/**
 * The full "Traits & Actions" editor — every trait's name/recharge/
 * description plus its per-mechanic fields (Attack/Save/Heal/Effect/Spell/
 * Custom/AOE). Split out of `CreatureFormFields` (which had grown past
 * 1300 lines) as a self-contained unit: it owns its own expanded-rows and
 * auto-detect-message state and talks to the parent only through
 * `traits`/`onChange`, the same shape `CreatureFormFields` already read/
 * wrote `value.traits` with.
 */
export function TraitMechanicsEditor({
  traits,
  onChange,
}: {
  traits: CreatureTrait[];
  onChange: (traits: CreatureTrait[]) => void;
}) {
  // Pre-expanded for any trait that already has structured data set — a DM
  // opening the form to check/tweak an existing creature shouldn't have to
  // click open every row just to see what's already configured. Lazy
  // initializer, so this only looks at the traits present on first render;
  // a trait added afterward still starts collapsed like any blank one.
  const [expandedTraits, setExpandedTraits] = useState<Set<number>>(
    () =>
      new Set(
        traits
          .map((t, i) =>
            t.attack || t.save || t.spell !== undefined || t.aoe || (t.effects && t.effects.length > 0) ? i : -1
          )
          .filter((i) => i !== -1)
      )
  );
  const [autoDetectMessage, setAutoDetectMessage] = useState<string | null>(null);

  function updateTrait(index: number, updates: Partial<CreatureTrait>) {
    onChange(traits.map((t, i) => (i === index ? { ...t, ...updates } : t)));
  }

  /** `null` clears the attack entirely (the "— None —" option); any other patch merges onto the existing attack, creating one with sensible defaults the first time a field on it is touched. */
  function updateTraitAttack(index: number, patch: Partial<CreatureTrait["attack"]> | null) {
    if (patch === null) {
      updateTrait(index, { attack: undefined });
      return;
    }
    const current = traits[index].attack;
    updateTrait(index, { attack: { attackType: "melee", damage: [], ...current, ...patch } });
  }

  function addTraitAttackDamage(index: number) {
    const current = traits[index].attack;
    if (!current) return;
    updateTraitAttack(index, { damage: [...current.damage, { dice: "", damageType: undefined }] });
  }

  function updateTraitAttackDamage(index: number, damageIndex: number, patch: Partial<CreatureDamageRoll>) {
    const current = traits[index].attack;
    if (!current) return;
    updateTraitAttack(index, {
      damage: current.damage.map((d, i) => (i === damageIndex ? { ...d, ...patch } : d)),
    });
  }

  function removeTraitAttackDamage(index: number, damageIndex: number) {
    const current = traits[index].attack;
    if (!current) return;
    updateTraitAttack(index, { damage: current.damage.filter((_, i) => i !== damageIndex) });
  }

  /** Same "null clears, otherwise merge with defaults" convention as `updateTraitAttack`. */
  function updateTraitSave(index: number, patch: Partial<CreatureTrait["save"]> | null) {
    if (patch === null) {
      updateTrait(index, { save: undefined });
      return;
    }
    const current = traits[index].save;
    updateTrait(index, { save: { ability: "dex", dc: 10, ...current, ...patch } });
  }

  function updateTraitEffect(index: number, effectIndex: number, patch: Partial<CreatureEffect>) {
    const current = traits[index].effects ?? [];
    updateTrait(index, { effects: current.map((e, i) => (i === effectIndex ? { ...e, ...patch } : e)) });
  }

  function removeTraitEffect(index: number, effectIndex: number) {
    const current = traits[index].effects ?? [];
    updateTrait(index, { effects: current.filter((_, i) => i !== effectIndex) });
  }

  /**
   * Every Mechanic that shares `effects` (Healing/Effect/Custom) filters this
   * same array down to the kinds it owns, paired with each entry's real
   * index in the full array — `updateTraitEffect`/`removeTraitEffect`
   * address by position there, not within a filtered view. A trait can carry
   * more than one entry of the same kind (a stat block section imported as
   * several distinct "other" effects, e.g. two separately-triggered
   * vulnerabilities), and the read-only card view already renders every one
   * of them as its own badge — this list must show all of them too, not just
   * the first, or an import round-trip silently loses the rest the moment a
   * DM opens edit mode and saves.
   */
  function effectEntriesOfKinds(t: CreatureTrait, kinds: CreatureEffectKind[]): Array<{ index: number; effect: CreatureEffect }> {
    return (t.effects ?? [])
      .map((effect, index) => ({ index, effect }))
      .filter(({ effect }) => kinds.includes(effect.kind));
  }

  function healEffectEntries(t: CreatureTrait) {
    return effectEntriesOfKinds(t, ["heal"]);
  }

  function genericEffectEntries(t: CreatureTrait) {
    return effectEntriesOfKinds(t, ["tempHp", "acBonus"]);
  }

  function customEffectEntries(t: CreatureTrait) {
    return effectEntriesOfKinds(t, ["other"]);
  }

  function addEffect(index: number, effect: CreatureEffect) {
    const current = traits[index].effects ?? [];
    updateTrait(index, { effects: [...current, effect] });
  }

  /** Same "null clears, otherwise merge with defaults" convention as `updateTraitAttack`/`updateTraitSave`. */
  function updateTraitAoe(index: number, patch: Partial<CreatureTrait["aoe"]> | null) {
    if (patch === null) {
      updateTrait(index, { aoe: undefined });
      return;
    }
    const current = traits[index].aoe;
    updateTrait(index, { aoe: { shape: "sphere", size: 20, ...current, ...patch } });
  }

  /**
   * Checking a Mechanic seeds its field(s) with sensible defaults (mirroring
   * `updateTraitAttack`/`updateTraitSave`'s own "create with defaults on
   * first touch" convention); unchecking clears them. Healing/Effect/Custom
   * all share the trait's one `effects` array, partitioned by `kind` — so
   * "on" appends an entry of that kind and "off" strips every entry of it.
   */
  function toggleMechanic(index: number, mechanic: Mechanic, enabled: boolean) {
    if (mechanic === "attack") {
      updateTraitAttack(index, enabled ? {} : null);
      return;
    }
    if (mechanic === "save") {
      updateTraitSave(index, enabled ? {} : null);
      return;
    }
    if (mechanic === "spell") {
      updateTrait(index, { spell: enabled ? "" : undefined });
      return;
    }
    if (mechanic === "aoe") {
      updateTraitAoe(index, enabled ? {} : null);
      return;
    }
    const current = traits[index].effects ?? [];
    if (mechanic === "heal") {
      updateTrait(index, {
        effects: enabled ? [...current, { kind: "heal", amount: "" }] : current.filter((e) => e.kind !== "heal"),
      });
    } else if (mechanic === "custom") {
      updateTrait(index, {
        effects: enabled ? [...current, { kind: "other", amount: "", label: "" }] : current.filter((e) => e.kind !== "other"),
      });
    } else {
      updateTrait(index, {
        effects: enabled
          ? [...current, { kind: "tempHp", amount: "" }]
          : current.filter((e) => e.kind !== "tempHp" && e.kind !== "acBonus"),
      });
    }
  }

  function toggleTraitExpanded(index: number) {
    setExpandedTraits((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function addTrait() {
    onChange([...traits, { name: "", group: "trait" }]);
  }

  function removeTrait(index: number) {
    onChange(traits.filter((_, i) => i !== index));
  }

  /**
   * The "convert an old creature" mini-tool: best-effort regex extraction of
   * attack/save/recharge out of each trait's existing name/description (see
   * `inferStructuredTraitFields`'s own doc comment for exactly what it
   * matches). Never overwrites a field a trait already has, and everything
   * it fills in stays fully editable below before Save — this is a
   * starting point, not a silent one-shot conversion.
   */
  function autoDetectStructuredFields() {
    let matched = 0;
    const nextTraits = traits.map((t) => {
      const inferred = inferStructuredTraitFields(t);
      if (Object.keys(inferred).length === 0) return t;
      matched += 1;
      return { ...t, ...inferred };
    });
    onChange(nextTraits);
    setAutoDetectMessage(
      matched > 0
        ? `Знайдено структуровані дані для ${matched} із ${traits.length} — перевір і збережи.`
        : "Нічого не знайдено — заповни атаку/рятівний кидок/recharge вручну нижче."
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className={FORM_SECTION_HEADING_CLS}>Traits &amp; Actions</h2>
        <div className="flex items-center gap-3">
          {traits.length > 0 && (
            <button
              type="button"
              onClick={autoDetectStructuredFields}
              className={addBtnCls}
              title="Best-effort: extracts attack/save/recharge out of each trait's existing name/description — for creatures added before these fields existed. Never overwrites a field a trait already has."
            >
              🪄 Auto-detect attack/save/recharge
            </button>
          )}
          <button type="button" onClick={addTrait} className={addBtnCls}>
            + Trait
          </button>
        </div>
      </div>
      {autoDetectMessage && <p className="text-[11px] text-slate-500">{autoDetectMessage}</p>}
      <div className="space-y-3">
        {traits.map((t, index) => {
          const expanded = expandedTraits.has(index);
          const mechanics = traitMechanics(t);
          return (
            <div key={index} className={`p-3 ${DIM_ROW_CARD_CLS}`}>
              {/* Top level, row 1 — what this is (type/name), when it comes back (recharge), and the
                  controls to expand/remove — kept to single-line fields only so this row never wraps
                  to a second line of its own; the description (which does need room to wrap) gets its
                  own row below instead of competing for space here. */}
              <div className="flex flex-wrap items-center gap-2">
                <SelectMenu
                  className="shrink-0"
                  value={t.group ?? "trait"}
                  onChange={(v) => updateTrait(index, { group: v })}
                  options={TRAIT_GROUPS}
                />
                <input
                  className={`${inputCls} min-w-[120px] flex-1`}
                  placeholder="Name (e.g. Charge)"
                  value={t.name}
                  onChange={(e) => updateTrait(index, { name: e.target.value })}
                />
                {/* Widened from the original w-32 — a real recharge string ("Recharges after a Short
                    or Long Rest") didn't fit and was silently clipped. */}
                <input
                  className={`${inputCls} w-56 shrink-0`}
                  placeholder='e.g. "5-6" or "1/Day"'
                  value={t.recharge ?? ""}
                  onChange={(e) => updateTrait(index, { recharge: e.target.value || undefined })}
                />
                <button
                  type="button"
                  onClick={() => toggleTraitExpanded(index)}
                  className="shrink-0 text-xs text-sky-400 hover:underline"
                >
                  {expanded ? "▾" : "▸"} Mechanics
                </button>
                <IconButton tone="danger" onClick={() => removeTrait(index)} aria-label="Remove trait">
                  ✕
                </IconButton>
              </div>
              {/* Row 2 — description, full width and on its own line so it can wrap freely instead of
                  fighting Name/Recharge for horizontal space. */}
              <AutoGrowTextarea
                className={`${inputCls} mt-2 w-full text-slate-300`}
                placeholder="Short description"
                value={t.description ?? ""}
                onChange={(v) => updateTrait(index, { description: v })}
              />
              {!expanded && <TraitSummaryBadges trait={t} />}
              {expanded && (
                <div className="mt-3 space-y-3 border-t border-slate-800 pt-3">
                  {/* Second level — which mechanics this action has (multi-select: an action can be an
                      Attack *and* grant an Effect); each checkbox is tinted with its mechanic's own
                      color, the same color that then outlines the field group it reveals below and the
                      badge it shows when collapsed — one color per mechanic, everywhere that mechanic
                      shows up. */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                    {MECHANIC_ORDER.map((m) => (
                      <label
                        key={m}
                        className={`flex cursor-pointer items-center gap-1.5 text-xs ${
                          mechanics.has(m) ? MECHANIC_STYLE[m].label : "text-slate-500"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className={`${CHECKBOX_BASE_CLS} ${MECHANIC_STYLE[m].accent}`}
                          checked={mechanics.has(m)}
                          onChange={(e) => toggleMechanic(index, m, e.target.checked)}
                        />
                        {MECHANIC_LABELS[m]}
                      </label>
                    ))}
                  </div>

                  {mechanics.has("attack") && (
                    <MechanicGroup mechanic="attack">
                      <div className="grid grid-cols-3 gap-2">
                        <Field label="Attack Type">
                          <SelectMenu
                            variant="group"
                            className="w-full"
                            value={encodeAttackKindKey(t.attack?.attackType ?? "melee", t.attack?.attackKind)}
                            onChange={(v) => updateTraitAttack(index, decodeAttackKindKey(v))}
                            options={ATTACK_KIND_OPTIONS}
                          />
                        </Field>
                        <Field label="Attack Bonus" hint="Optional — blank hides it instead of showing +0.">
                          <input
                            className={`${groupInputCls} w-full`}
                            type="number"
                            placeholder="e.g. 7"
                            value={t.attack?.attackBonus ?? ""}
                            onChange={(e) =>
                              updateTraitAttack(index, {
                                attackBonus: e.target.value === "" ? undefined : Number(e.target.value),
                              })
                            }
                          />
                        </Field>
                        <Field label="Range (ft)">
                          <input
                            className={`${groupInputCls} w-full`}
                            placeholder="5 or 100/400"
                            value={t.attack?.range ?? ""}
                            onChange={(e) => updateTraitAttack(index, { range: e.target.value || undefined })}
                          />
                        </Field>
                      </div>
                      {/* Damage — a list rather than one dice+type pair, since a single attack can deal
                          several at once (e.g. "1d6 +3 bludgeoning plus 2d8 cold"). */}
                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-xs text-slate-400">Damage</span>
                          <button type="button" onClick={() => addTraitAttackDamage(index)} className={addBtnCls}>
                            + Damage Roll
                          </button>
                        </div>
                        <div className="space-y-1.5">
                          {(t.attack?.damage ?? []).map((roll, damageIndex) => (
                            <div key={damageIndex} className="flex items-center gap-2">
                              <input
                                className={`${groupInputCls} min-w-[100px] flex-1`}
                                placeholder='Dice, e.g. "2d6 +4"'
                                value={roll.dice}
                                onChange={(e) => updateTraitAttackDamage(index, damageIndex, { dice: e.target.value })}
                              />
                              <input
                                className={`${groupInputCls} min-w-[100px] flex-1`}
                                placeholder="Damage type"
                                value={roll.damageType ?? ""}
                                onChange={(e) =>
                                  updateTraitAttackDamage(index, damageIndex, { damageType: e.target.value || undefined })
                                }
                              />
                              <IconButton
                                tone="danger"
                                onClick={() => removeTraitAttackDamage(index, damageIndex)}
                                aria-label="Remove damage roll"
                              >
                                ✕
                              </IconButton>
                            </div>
                          ))}
                          {(t.attack?.damage ?? []).length === 0 && (
                            <p className={HINT_TEXT_CLS}>No damage rolls yet.</p>
                          )}
                        </div>
                      </div>
                    </MechanicGroup>
                  )}

                  {mechanics.has("save") && (
                    <MechanicGroup mechanic="save">
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <Field label="Save Ability">
                          <SelectMenu
                            variant="group"
                            className="w-full"
                            value={t.save?.ability ?? "dex"}
                            onChange={(v) => updateTraitSave(index, { ability: v })}
                            options={STAT_ORDER.map((key) => ({ value: key, label: key.toUpperCase() }))}
                          />
                        </Field>
                        <Field label="Save DC">
                          <input
                            className={`${groupInputCls} w-full`}
                            type="number"
                            value={t.save?.dc ?? 0}
                            onChange={(e) => updateTraitSave(index, { dc: Number(e.target.value) })}
                          />
                        </Field>
                      </div>
                    </MechanicGroup>
                  )}

                  {mechanics.has("heal") && (
                    <MechanicGroup mechanic="heal">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs text-slate-400">Healing</span>
                        <button
                          type="button"
                          onClick={() => addEffect(index, { kind: "heal", amount: "" })}
                          className={addBtnCls}
                        >
                          + Add Heal
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {healEffectEntries(t).map(({ index: hi, effect }) => (
                          <div key={hi} className="flex items-center gap-2">
                            <input
                              className={`${groupInputCls} w-28 shrink-0`}
                              placeholder='e.g. "2d8 +4"'
                              value={effect.amount}
                              onChange={(e) => updateTraitEffect(index, hi, { amount: e.target.value })}
                            />
                            <input
                              className={`${groupInputCls} min-w-[140px] flex-1`}
                              placeholder='Note (optional), e.g. "self only"'
                              value={effect.label ?? ""}
                              onChange={(e) => updateTraitEffect(index, hi, { label: e.target.value || undefined })}
                            />
                            <IconButton tone="danger" onClick={() => removeTraitEffect(index, hi)} aria-label="Remove heal effect">
                              ✕
                            </IconButton>
                          </div>
                        ))}
                        {healEffectEntries(t).length === 0 && (
                          <p className={HINT_TEXT_CLS}>No heal effects yet.</p>
                        )}
                      </div>
                    </MechanicGroup>
                  )}

                  {mechanics.has("effect") && (
                    <MechanicGroup mechanic="effect">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs text-slate-400">Temp HP / AC Bonus</span>
                        <button
                          type="button"
                          onClick={() => addEffect(index, { kind: "tempHp", amount: "" })}
                          className={addBtnCls}
                        >
                          + Add Effect
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {genericEffectEntries(t).map(({ index: ei, effect }) => (
                          <div key={ei} className="flex items-center gap-2">
                            <SelectMenu
                              variant="group"
                              value={effect.kind as "tempHp" | "acBonus"}
                              onChange={(v) => updateTraitEffect(index, ei, { kind: v })}
                              options={[
                                { value: "tempHp", label: "Temp HP" },
                                { value: "acBonus", label: "AC Bonus (Shield)" },
                              ]}
                            />
                            <input
                              className={`${groupInputCls} w-24 shrink-0`}
                              placeholder='e.g. "10"'
                              value={effect.amount}
                              onChange={(e) => updateTraitEffect(index, ei, { amount: e.target.value })}
                            />
                            <input
                              className={`${groupInputCls} min-w-[140px] flex-1`}
                              placeholder="Note (optional)"
                              value={effect.label ?? ""}
                              onChange={(e) => updateTraitEffect(index, ei, { label: e.target.value || undefined })}
                            />
                            <IconButton tone="danger" onClick={() => removeTraitEffect(index, ei)} aria-label="Remove effect">
                              ✕
                            </IconButton>
                          </div>
                        ))}
                        {genericEffectEntries(t).length === 0 && (
                          <p className={HINT_TEXT_CLS}>No effects yet.</p>
                        )}
                      </div>
                    </MechanicGroup>
                  )}

                  {mechanics.has("spell") && (
                    <MechanicGroup mechanic="spell">
                      <Field label="Spell(s)">
                        <input
                          className={`${groupInputCls} w-full`}
                          placeholder='e.g. "Fireball, Suggestion"'
                          value={t.spell ?? ""}
                          onChange={(e) => updateTrait(index, { spell: e.target.value })}
                        />
                      </Field>
                    </MechanicGroup>
                  )}

                  {mechanics.has("custom") && (
                    <MechanicGroup mechanic="custom">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs text-slate-400">Custom Effects</span>
                        <button
                          type="button"
                          onClick={() => addEffect(index, { kind: "other", amount: "", label: "" })}
                          className={addBtnCls}
                        >
                          + Add Custom
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {customEffectEntries(t).map(({ index: ci, effect }) => (
                          <div key={ci} className="flex items-center gap-2">
                            <input
                              className={`${groupInputCls} min-w-[110px] flex-1`}
                              placeholder='Name, e.g. "Push"'
                              value={effect.label ?? ""}
                              onChange={(e) => updateTraitEffect(index, ci, { label: e.target.value })}
                            />
                            <input
                              className={`${groupInputCls} min-w-[110px] flex-1`}
                              placeholder='Value/Note, e.g. "10 ft."'
                              value={effect.amount}
                              onChange={(e) => updateTraitEffect(index, ci, { amount: e.target.value })}
                            />
                            <IconButton tone="danger" onClick={() => removeTraitEffect(index, ci)} aria-label="Remove custom effect">
                              ✕
                            </IconButton>
                          </div>
                        ))}
                        {customEffectEntries(t).length === 0 && (
                          <p className={HINT_TEXT_CLS}>No custom effects yet.</p>
                        )}
                      </div>
                    </MechanicGroup>
                  )}

                  {mechanics.has("aoe") && (
                    <MechanicGroup mechanic="aoe">
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <Field label="Shape">
                          <SelectMenu
                            variant="group"
                            className="w-full"
                            value={t.aoe?.shape ?? "sphere"}
                            onChange={(v) => updateTraitAoe(index, { shape: v })}
                            options={CREATURE_AOE_SHAPES.map((shape) => ({ value: shape, label: AOE_SHAPE_LABELS[shape] }))}
                          />
                        </Field>
                        <Field label={t.aoe?.shape === "cube" ? "Edge (ft)" : "Size (ft)"}>
                          <input
                            className={`${groupInputCls} w-full`}
                            type="number"
                            value={t.aoe?.size ?? 20}
                            onChange={(e) => updateTraitAoe(index, { size: Number(e.target.value) })}
                          />
                        </Field>
                        {t.aoe?.shape === "line" && (
                          <Field label="Width (ft)">
                            <input
                              className={`${groupInputCls} w-full`}
                              type="number"
                              placeholder="e.g. 5"
                              value={t.aoe?.width ?? ""}
                              onChange={(e) =>
                                updateTraitAoe(index, { width: e.target.value === "" ? undefined : Number(e.target.value) })
                              }
                            />
                          </Field>
                        )}
                      </div>
                    </MechanicGroup>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
