"use client";

import { AbilityScores, CreatureAoeShape, CreatureEffect, CreatureEffectKind, CreatureTrait } from "@/lib/types";
import { formatModifier } from "@/lib/format";
import { GROUP_LABELS, GROUP_ORDER } from "./CreatureStatBlock";
import { MECHANIC_STYLE } from "./creatureForm/TraitMechanicsEditor";
import { AbilityHintPanel } from "./ui/AbilityHintPanel";
import { CHIP_TONE_CLASSES } from "./ui/chipTones";
import { HINT_FACT_ROW_CLS, TRAILING_ROW_CLS } from "./ui/containerStyles";
import { HintFact } from "./ui/HintFact";
import { MetaBadge } from "./ui/MetaBadge";
import { TrailingDot, TrailingValue } from "./ui/RowTrailingValue";
import { MICRO_LABEL_STRONG_CLS } from "./ui/typography";

/**
 * Trait/action rendering pieces shared by `CreatureDetailsModal` (the
 * Features tab) and `creatureReminders`/`aiGlossary` (the same hint for a
 * flagged trait elsewhere in the app) — no `CreatureAbilitiesPanel`
 * component here anymore. It used to own its own `TabStrip`/tab state for
 * Features/Spells, nested one level below `CreatureDetailsModal`; that made
 * a creature's tabs (and, worse, where its Notes/Quick Notes ended up)
 * structurally different from a character's, built by a genuinely
 * different component instead of the same shape with different tab
 * content. `CreatureDetailsModal` now builds its own `tabs`/`activeTab`
 * exactly like `CharacterDetailsModal` does — Features/Spells/Notes all as
 * peers in one switch — and imports `groupTraits`/`AbilityTraitTrailing`/
 * `CreatureAbilityHintPanel` from here for the Features tab's content.
 */

/** "5" or "80/320" → "5 ft." / "80/320 ft." — the unit is never hand-typed (see `CreatureAttack.range`'s own doc comment), so every place `range` is shown adds it here instead. */
function formatRange(range: string | undefined): string | undefined {
  return range ? `${range} ft.` : undefined;
}

const EFFECT_KIND_LABELS: Record<CreatureEffectKind, string> = {
  heal: "Heal",
  tempHp: "Temp HP",
  acBonus: "AC",
  other: "",
};

/**
 * `heal`/`tempHp` share one cyan tone (shown as a single "Heal / Temp HP"
 * chip family) and `acBonus` gets emerald (freed up now that weapon mastery
 * no longer needs violet) — all three draw from the same `CHIP_TONE_CLASSES`
 * map every other chip in the details modal uses. `other` keeps borrowing
 * its color straight from `MECHANIC_STYLE` (the creature-edit form's
 * mechanic palette) instead of duplicating the class string by hand — it
 * has no equivalent among the named tones above.
 */
const EFFECT_KIND_COLOR: Record<CreatureEffectKind, string> = {
  heal: CHIP_TONE_CLASSES.cyan,
  tempHp: CHIP_TONE_CLASSES.cyan,
  acBonus: CHIP_TONE_CLASSES.emerald,
  other: MECHANIC_STYLE.custom.badge,
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

/** A single non-damage effect badge (heal/temp HP/AC bonus/other) — same visual weight as the recharge badge, colored per kind so a DM can tell them apart at a glance in a row that mixes several. */
function EffectBadge({ effect }: { effect: CreatureEffect }) {
  const label = effect.kind === "other" ? effect.label || "Effect" : EFFECT_KIND_LABELS[effect.kind];
  return <MetaBadge label={`${label} ${effect.amount}`} uppercase={false} colorClassName={EFFECT_KIND_COLOR[effect.kind]} />;
}

/**
 * Every short colored pill tied to a trait — recharge, non-damage effects
 * (heal/temp HP/AC bonus/other), and the spell it casts — rendered right
 * next to the trait's name, same placement `ChargeBadge`
 * (`CharacterDetailsModal.tsx`) gets for a Feature/Spell with its own charge
 * pool. These describe *what the trait is/does* (a recurring resource, a
 * status it applies, a spell it casts) rather than *how much*, so they read
 * as part of the name, not as a number buried among the row's damage/DC on
 * the far right — split out of `AbilityTraitTrailing` (which used to lump
 * every one of these in with the trailing damage) for exactly that reason.
 */
export function AbilityTraitChips({ trait }: { trait: CreatureTrait }) {
  return (
    <>
      {trait.recharge && <MetaBadge label={trait.recharge} uppercase={false} colorClassName={CHIP_TONE_CLASSES.gold} />}
      {(trait.effects ?? []).map((effect, i) => (
        <EffectBadge key={i} effect={effect} />
      ))}
      {trait.spell && (
        <MetaBadge label={trait.spell} uppercase={false} colorClassName="border-fuchsia-700 bg-fuchsia-950/30 text-fuchsia-300" />
      )}
    </>
  );
}

/**
 * Bonus/damage (attack) and DC (save) — the fast-glance numbers a DM needs
 * mid-combat without reading `trait.description`, same visual weight as
 * `AttackTrailing`/`SpellTrailing` on the character side: built from the
 * same shared `TrailingValue`/`TrailingDot` atoms (`ui/RowTrailingValue.tsx`)
 * those two use, so a size/color change to any of the three reaches all of
 * them at once. Every colored pill (recharge, effects, spell cast) is NOT
 * here — see `AbilityTraitChips`.
 */
export function AbilityTraitTrailing({ trait }: { trait: CreatureTrait }) {
  return (
    <span className={`${TRAILING_ROW_CLS} flex-wrap justify-end gap-2`}>
      {trait.attack && trait.attack.damage.length > 0 && (
        <span className="flex items-center gap-1">
          {trait.attack.attackBonus !== undefined && (
            <>
              <TrailingValue value={formatModifier(trait.attack.attackBonus)} />
              <TrailingDot />
            </>
          )}
          {trait.attack.damage.map((roll, i) => (
            <span key={i} className="flex items-baseline gap-1">
              {i > 0 && <span className="text-slate-500">+</span>}
              <TrailingValue value={roll.dice} label={roll.damageType} />
            </span>
          ))}
        </span>
      )}
      {trait.save && <TrailingValue value={`DC ${trait.save.dc}`} label={trait.save.ability.toUpperCase()} />}
    </span>
  );
}

const ABILITY_FULL_NAMES: Record<keyof AbilityScores, string> = {
  str: "Strength",
  dex: "Dexterity",
  con: "Constitution",
  int: "Intelligence",
  wis: "Wisdom",
  cha: "Charisma",
};

/**
 * The hover-hint for a trait row — same idea as `AttackHintPanel`/
 * `SpellHintPanel` on the character side: the row's trailing content
 * (`AbilityTraitTrailing`) is a fast-glance summary, not the whole picture,
 * so the hint fills in what the row has no room for. Exported so
 * `creatureReminders` (`reminders.tsx`) can show the exact same hint for a
 * flagged trait in the Reminders panel/FAB — those used to build their own,
 * much thinner `AbilityHintPanel` call with no attack/save/effects data at
 * all, so the same trait's hint read differently depending on where a DM
 * saw it.
 *
 * Block 1 (`metaLines`) is just the trait's group (`Action`/`Bonus
 * Action`/.../`Trait`) — the same "identity" role a spell's `source` plays.
 * Everything else — type/range, the to-hit/damage/save-DC numbers,
 * recharge, effects, spell, area — lives together in block 2 (`status`),
 * matching how `AttackHintPanel` keeps a weapon's own type/range meta line
 * in the same group as its numbers rather than splitting it into its own
 * identity block (previously this trait's type/range sat in block 1 next
 * to the group, the one place on the character *or* creature side where
 * that meta line didn't travel with its numbers). Every "label: value" line
 * here (To Hit, Damage, Save DC, Recharge, Effect, Casts, Area) is a shared
 * `HintFact` — the same primitive `AttackHintPanel`/`SpellHintPanel`/
 * `recoveryStatusLine` build their own fact lines from, so a color/weight
 * change to that one component reaches every hint in the app at once
 * instead of drifting per file. `HintFact` defaults to the `sky-400`
 * "trackable fact" color; nothing here opts into a different tone, so
 * Casts/Area/Effect read the same accent as To Hit/Damage/Save DC/Recharge
 * — previously plain white, indistinguishable from a descriptive aside
 * like "Not proficient". `recharge` gets its own labeled line ("Recharge
 * **5-6**") right after the numbers, the same `HintFact` grammar
 * `recoveryStatusLine` gives a spell's charge pool — previously `recharge`
 * only showed as the row's own trailing badge and was invisible in the
 * hint itself. A damage-only attack with no `attackBonus` (a save-based
 * breath weapon) skips the type/range meta line entirely — "Ranged Weapon"
 * means nothing without a to-hit roll to attach it to.
 *
 * Two fields are editable (via `EditCreatureModal`) but had nowhere to show
 * at all before this — `attack.attackType`/`attack.attackKind` (e.g. "Melee
 * Weapon"/"Ranged Spell") and `attack.range`. `save.ability` also gets
 * spelled out in full ("Dexterity") here, since the row itself only has
 * room for the three-letter abbreviation. Any non-damage `effects`
 * (heal/temp HP/AC bonus/other) get their own line too, same "amount +
 * optional note" shape as the row's own `EffectBadge` — an "other" effect
 * (a push, a condition) uses its own `label` as the fact's label instead
 * of a fixed kind name, since there's no fixed vocabulary for it.
 */
export function CreatureAbilityHintPanel({ trait }: { trait: CreatureTrait }) {
  const attack = trait.attack;
  // A damage-only attack (no `attackBonus` — a save-based breath weapon) has
  // no real "type" to report: Melee/Ranged Weapon/Spell describes a to-hit
  // roll that doesn't exist here, so the meta line would just mislead.
  const showAttackMeta = Boolean(attack) && attack!.attackBonus !== undefined;
  const showNumbers = Boolean(attack && attack.damage.length > 0) || Boolean(trait.save);
  const hasStatus =
    showAttackMeta || showNumbers || Boolean(trait.recharge) || Boolean(trait.spell) || Boolean(trait.aoe) || (trait.effects ?? []).length > 0;
  return (
    <AbilityHintPanel
      name={trait.name}
      metaLines={[GROUP_LABELS[trait.group ?? "trait"]]}
      status={
        hasStatus && (
          <span className="block space-y-1.5">
            {showAttackMeta && (
              <span className={`block ${MICRO_LABEL_STRONG_CLS}`}>
                {[
                  `${attack!.attackType === "melee" ? "Melee" : "Ranged"} ${attack!.attackKind === "spell" ? "Spell" : "Weapon"}`,
                  formatRange(attack!.range),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            )}
            {showNumbers && (
              <span className={HINT_FACT_ROW_CLS}>
                {attack && attack.damage.length > 0 && (
                  <>
                    {attack.attackBonus !== undefined && <HintFact label="To Hit" value={formatModifier(attack.attackBonus)} />}
                    <HintFact
                      label="Damage"
                      tone="raw"
                      value={attack.damage.map((roll, i) => (
                        <span key={i}>
                          {i > 0 && <span className="text-slate-500"> + </span>}
                          <span className="font-semibold text-sky-400">{roll.dice}</span>
                          {roll.damageType && <span> {roll.damageType}</span>}
                        </span>
                      ))}
                    />
                  </>
                )}
                {trait.save && (
                  <HintFact label="Save DC" value={trait.save.dc} trailing={` ${ABILITY_FULL_NAMES[trait.save.ability]}`} />
                )}
              </span>
            )}
            {trait.recharge && <HintFact label="Recharge" value={trait.recharge.replace(/^Recharge\s+/i, "")} />}
            {(trait.effects ?? []).map((effect, i) =>
              effect.kind === "other" ? (
                <HintFact key={i} label="Effect" value={effect.label ? `${effect.label} ${effect.amount}` : effect.amount} />
              ) : (
                <HintFact key={i} label={EFFECT_KIND_LABELS[effect.kind]} value={effect.amount} trailing={effect.label && ` — ${effect.label}`} />
              )
            )}
            {trait.spell && <HintFact label="Casts" value={trait.spell} />}
            {trait.aoe && <HintFact label="Area" value={formatAoe(trait.aoe)} />}
          </span>
        )
      }
      description={trait.description}
    />
  );
}

/** Groups the full trait list by `GROUP_ORDER`, dropping empty groups. */
export function groupTraits(traits: CreatureTrait[]) {
  return GROUP_ORDER.map((group) => ({
    group,
    items: traits.filter((t) => (t.group ?? "trait") === group),
  })).filter((g) => g.items.length > 0);
}
