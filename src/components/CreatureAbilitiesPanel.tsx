"use client";

import { useState } from "react";
import { AbilityScores, Creature, CreatureAoeShape, CreatureEffect, CreatureEffectKind, CreatureTrait } from "@/lib/types";
import { abilityModifier } from "@/lib/characterMath";
import { formatModifier } from "@/lib/format";
import { CONTENT_KIND_ICON } from "@/lib/contentKindIcons";
import { GROUP_LABELS, GROUP_ORDER } from "./CreatureStatBlock";
import { MECHANIC_STYLE } from "./creatureForm/TraitMechanicsEditor";
import { AbilityHintPanel } from "./ui/AbilityHintPanel";
import { FlaggableRow } from "./ui/FlaggableRow";
import { MICRO_ITEM_LABEL_CLS } from "./ui/typography";
import { InfoTooltip } from "./InfoTooltip";
import { SectionDivider } from "./ui/SectionDivider";
import { StatBox } from "./ui/StatBox";
import { TabBar } from "./ui/TabBar";

type AbilitiesTab = "traits" | "spellcasting";

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

/** `heal`/`other` borrow their color straight from `MECHANIC_STYLE` (the creature-edit form's mechanic palette) instead of duplicating the class strings by hand — `tempHp`/`acBonus` have no `Mechanic` equivalent (the edit form's "Effect" mechanic covers both under one color), so this read view keeps its own colors for those two. */
const EFFECT_KIND_COLOR: Record<CreatureEffectKind, string> = {
  heal: MECHANIC_STYLE.heal.badge,
  tempHp: "border-cyan-700 bg-cyan-950/30 text-cyan-300",
  acBonus: "border-violet-700 bg-violet-950/30 text-violet-300",
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
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${EFFECT_KIND_COLOR[effect.kind]}`}>
      {label} {effect.amount}
    </span>
  );
}

/** Bonus/damage (attack), DC (save), a recharge badge, and any non-damage effects — the fast-glance numbers a DM needs mid-combat without reading `trait.description`, same visual weight as `AttackTrailing`/`SpellTrailing` on the character side. */
function AbilityTraitTrailing({ trait }: { trait: CreatureTrait }) {
  return (
    <span className="flex shrink-0 flex-wrap items-center justify-end gap-2 text-xs">
      {trait.attack && trait.attack.damage.length > 0 && (
        <span className="flex items-center gap-1">
          {trait.attack.attackBonus !== undefined && (
            <>
              <span className="font-semibold text-slate-100">{formatModifier(trait.attack.attackBonus)}</span>
              <span className="text-sm font-bold leading-none text-slate-500">·</span>
            </>
          )}
          {trait.attack.damage.map((roll, i) => (
            <span key={i} className="flex items-baseline gap-1">
              {i > 0 && <span className="text-slate-500">+</span>}
              <span className="font-semibold text-slate-100">{roll.dice}</span>
              {roll.damageType && <span className="text-[10px] text-slate-500">{roll.damageType}</span>}
            </span>
          ))}
        </span>
      )}
      {trait.save && (
        <span className="font-semibold text-slate-100">
          DC {trait.save.dc} <span className="text-slate-500">{trait.save.ability.toUpperCase()}</span>
        </span>
      )}
      {trait.recharge && (
        <span className="rounded border border-sky-700 bg-sky-950/30 px-1.5 py-0.5 text-[10px] font-semibold text-sky-300">
          {trait.recharge}
        </span>
      )}
      {(trait.effects ?? []).map((effect, i) => (
        <EffectBadge key={i} effect={effect} />
      ))}
      {trait.spell && (
        <span className="rounded border border-fuchsia-700 bg-fuchsia-950/30 px-1.5 py-0.5 text-[10px] font-semibold text-fuchsia-300">
          {trait.spell}
        </span>
      )}
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
 * saw it. The group (`Action`/`Bonus Action`/.../`Trait`) always leads the
 * meta lines now too — previously only `creatureReminders` showed it (since
 * the Features tab already had a group section header to lean on, Reminders
 * doesn't), so a trait's hint was missing its own type in the one place a
 * DM has no other cue for it. Two fields are editable (via
 * `EditCreatureModal`) but had nowhere to show at all before this —
 * `attack.attackType`/`attack.attackKind` (e.g. "Melee Weapon"/"Ranged
 * Spell") and `attack.range` — both surface here as a meta line, same
 * "Melee Weapon · 5 ft." convention `AttackHintPanel` uses.
 * `save.ability` also gets spelled out in full ("Wisdom saving throw")
 * here, since the row itself only has room for the three-letter
 * abbreviation. Any non-damage `effects` (heal/temp HP/AC bonus/other) get
 * their own line too, same "amount + optional note" shape as the row's own
 * `EffectBadge`.
 */
export function CreatureAbilityHintPanel({ trait }: { trait: CreatureTrait }) {
  const metaLines: Array<string | undefined> = [GROUP_LABELS[trait.group ?? "trait"]];
  if (trait.attack) {
    const range = formatRange(trait.attack.range);
    const type = trait.attack.attackType === "melee" ? "Melee" : "Ranged";
    const kind = trait.attack.attackKind === "spell" ? "Spell" : "Weapon";
    metaLines.push(`${type} ${kind}${range ? ` · ${range}` : ""}`);
  }
  const hasStatus = trait.attack || trait.save || trait.spell || trait.aoe || (trait.effects ?? []).length > 0;
  return (
    <AbilityHintPanel
      name={trait.name}
      metaLines={metaLines}
      status={
        hasStatus && (
          <span className="block space-y-0.5">
            {trait.attack && trait.attack.damage.length > 0 && (
              <span className="block">
                {trait.attack.attackBonus !== undefined && (
                  <>
                    <span className="text-slate-500">To Hit</span>{" "}
                    <span className="font-semibold text-slate-100">{formatModifier(trait.attack.attackBonus)}</span>
                    {" · "}
                  </>
                )}
                <span className="text-slate-500">Damage</span>{" "}
                <span className="font-semibold text-slate-100">
                  {trait.attack.damage
                    .map((roll) => (roll.damageType ? `${roll.dice} ${roll.damageType}` : roll.dice))
                    .join(" + ")}
                </span>
              </span>
            )}
            {trait.save && (
              <span className="block">
                <span className="font-semibold text-slate-100">DC {trait.save.dc}</span>{" "}
                {ABILITY_FULL_NAMES[trait.save.ability]} saving throw
              </span>
            )}
            {(trait.effects ?? []).map((effect, i) => (
              <span key={i} className="block">
                <span className="font-semibold text-slate-100">
                  {effect.kind === "other" ? effect.label || "Effect" : EFFECT_KIND_LABELS[effect.kind]} {effect.amount}
                </span>
                {effect.kind !== "other" && effect.label && ` — ${effect.label}`}
              </span>
            ))}
            {trait.spell && (
              <span className="block">
                <span className="font-semibold text-slate-100">Casts:</span> {trait.spell}
              </span>
            )}
            {trait.aoe && (
              <span className="block">
                <span className="font-semibold text-slate-100">Area:</span> {formatAoe(trait.aoe)}
              </span>
            )}
          </span>
        )
      }
      description={trait.description}
    />
  );
}

/** Groups the full trait list by `GROUP_ORDER`, dropping empty groups. */
function groupTraits(traits: CreatureTrait[]) {
  return GROUP_ORDER.map((group) => ({
    group,
    items: traits.filter((t) => (t.group ?? "trait") === group),
  })).filter((g) => g.items.length > 0);
}

/**
 * A creature's tabbed "how do its abilities actually work" view — everything
 * a DM needs at a glance mid-combat, without rereading prose
 * (`proficiencyBonus` already shows in `CreatureStatBlock`'s own icon-stat
 * row, not here). Mirrors `CharacterDetailsModal`'s own tab pattern — same
 * `TabBar`, same "renders nothing with under 2 populated tabs" rule, and the
 * same tab names ("Features"/"Spells") so the two entity types read as one
 * consistent convention rather than two similar-but-differently-labeled ones.
 *
 * "Features" is every trait/action/bonus action/reaction/legendary action,
 * one row per trait — name + hover-hint (the full description text lives in
 * the hint, not inline in the row, same "no wall of text" reasoning that
 * drove this whole feature). A single row shape for every trait rather than
 * a separate "Attacks" tab for the subset with structured data: one shape to
 * maintain, and a trait's `.attack`/`.save`/`.recharge`/`.effects` (if any)
 * just show as trailing content on its own already-existing row instead of
 * duplicating that row into a second tab. "Spells" stays a separate,
 * optional tab — a creature's spell list doesn't fit this same per-trait row
 * shape; its own group/spell-list layout mirrors the character Spells tab's
 * per-level grouping instead (uppercase label line, then one row per spell).
 */
export function CreatureAbilitiesPanel({
  creature,
  onUpdate,
}: {
  creature: Creature;
  onUpdate?: (id: string, updates: Partial<Creature>) => void;
}) {
  const flaggedTraits = creature.flaggedTraits ?? [];
  function toggleFlag(name: string) {
    if (!onUpdate) return;
    const next = flaggedTraits.includes(name) ? flaggedTraits.filter((n) => n !== name) : [...flaggedTraits, name];
    onUpdate(creature.id, { flaggedTraits: next });
  }

  const allGroups = groupTraits(creature.traits);
  const hasTraits = allGroups.length > 0;
  const hasSpellcasting = Boolean(creature.spellcasting);

  const tabs: Array<{ key: AbilitiesTab; icon: string; text: string }> = [
    ...(hasTraits ? [{ key: "traits" as const, icon: CONTENT_KIND_ICON.features, text: "Features" }] : []),
    ...(hasSpellcasting ? [{ key: "spellcasting" as const, icon: CONTENT_KIND_ICON.spells, text: "Spells" }] : []),
  ];
  const [activeTab, setActiveTab] = useState<AbilitiesTab | undefined>(tabs[0]?.key);
  const currentTab = tabs.some((t) => t.key === activeTab) ? activeTab : tabs[0]?.key;

  if (tabs.length === 0) return null;

  return (
    <SectionDivider>
      <TabBar tabs={tabs} current={currentTab} onChange={setActiveTab} className="mb-3" />

      {currentTab === "traits" && (
        <div className="space-y-3">
          {allGroups.map(({ group, items }) => (
            <div key={group} className="space-y-1">
              <p className={MICRO_ITEM_LABEL_CLS}>{GROUP_LABELS[group]}</p>
              {items.map((trait, index) => {
                const flagged = flaggedTraits.includes(trait.name);
                return (
                  <FlaggableRow
                    key={`${group}-${index}`}
                    flagged={flagged}
                    onToggleFlag={() => toggleFlag(trait.name)}
                    trailing={<AbilityTraitTrailing trait={trait} />}
                  >
                    <InfoTooltip panel={<CreatureAbilityHintPanel trait={trait} />}>{trait.name}</InfoTooltip>
                  </FlaggableRow>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {currentTab === "spellcasting" && creature.spellcasting && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-1.5">
            <StatBox
              label={creature.spellcasting.ability.toUpperCase()}
              value={formatModifier(abilityModifier(creature.stats[creature.spellcasting.ability]))}
            />
            <StatBox label="Attack" value={formatModifier(creature.spellcasting.attackBonus)} />
            <StatBox label="Save DC" value={String(creature.spellcasting.saveDc)} />
          </div>
          {creature.spellcasting.spellGroups.map((group, i) => {
            if (group.spells.length === 0) return null;
            return (
              <div key={i}>
                {group.label && <p className={MICRO_ITEM_LABEL_CLS}>{group.label}</p>}
                {/* Same plain-row shape as the character Spells tab's own per-level list, but flaggable —
                    a creature's spells previously had no reminder flame at all, unlike its traits above, even
                    though "the DM forgets this creature can cast X" is exactly the kind of thing worth
                    flagging. There's no richer per-spell data to show here (just a name, unlike a trait's
                    attack/save/effects), so the hint stays a minimal "Spell" tag rather than going hint-less
                    — `ReminderEntry.panel` always needs *something* to show in the Reminders panel/FAB. */}
                <div className="mt-1 space-y-1">
                  {group.spells.map((spell, j) => {
                    const flagged = flaggedTraits.includes(spell);
                    return (
                      <FlaggableRow key={j} flagged={flagged} onToggleFlag={() => toggleFlag(spell)}>
                        <InfoTooltip panel={<AbilityHintPanel name={spell} metaLines={["Spell"]} />}>{spell}</InfoTooltip>
                      </FlaggableRow>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionDivider>
  );
}
