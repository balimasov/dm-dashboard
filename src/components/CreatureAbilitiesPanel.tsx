"use client";

import { useState } from "react";
import { Creature, CreatureTrait } from "@/lib/types";
import { abilityModifier } from "@/lib/characterMath";
import { formatModifier } from "@/lib/format";
import { CONTENT_KIND_ICON } from "@/lib/contentKindIcons";
import { GROUP_LABELS, GROUP_ORDER } from "./CreatureStatBlock";
import { AbilityHintPanel } from "./ui/AbilityHintPanel";
import { FlaggableRow } from "./ui/FlaggableRow";
import { InfoTooltip } from "./InfoTooltip";
import { RichText } from "./RichText";
import { SectionDivider } from "./ui/SectionDivider";
import { StatBox } from "./ui/StatBox";
import { TabBar } from "./ui/TabBar";

type AbilitiesTab = "traits" | "attacks" | "spellcasting";

/** Bonus/damage (attack), DC (save), and a recharge badge — the fast-glance numbers a DM needs mid-combat without reading `trait.description`, same visual weight as `AttackTrailing`/`SpellTrailing` on the character side. */
function AbilityTraitTrailing({ trait }: { trait: CreatureTrait }) {
  return (
    <span className="flex shrink-0 items-center gap-2 whitespace-nowrap text-xs">
      {trait.attack && (
        <span className="flex items-center gap-1">
          <span className="font-semibold text-slate-100">{formatModifier(trait.attack.attackBonus)}</span>
          <span className="text-sm font-bold leading-none text-slate-500">·</span>
          <span className="flex items-baseline gap-1">
            <span className="font-semibold text-slate-100">{trait.attack.damage}</span>
            {trait.attack.damageType && <span className="text-[10px] text-slate-500">{trait.attack.damageType}</span>}
          </span>
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
    </span>
  );
}

/** Groups a trait list by `GROUP_ORDER`, dropping empty groups — shared by the "Traits & Actions" tab (every trait) and the "Attacks" tab (only ones with structured data). */
function groupTraits(traits: CreatureTrait[]) {
  return GROUP_ORDER.map((group) => ({
    group,
    items: traits.filter((t) => (t.group ?? "trait") === group),
  })).filter((g) => g.items.length > 0);
}

/**
 * One frequency-group line (e.g. `"At will: mage hand, minor illusion"`,
 * `"3/day each: charm person, invisibility"`) split into its label and the
 * individual spell names — so the Spellcasting tab can render a short
 * bulleted list per cantrip/spell-slot bucket instead of one comma-packed
 * sentence per line (a wall of text otherwise, per DM feedback). A line with
 * no ": " separator (a DM just typed one bare spell name) still renders fine
 * as a single-item, label-less group.
 */
function parseSpellFrequencyLine(line: string): { label: string; spells: string[] } {
  const separatorIndex = line.indexOf(":");
  if (separatorIndex === -1) {
    return { label: "", spells: [line.trim()].filter(Boolean) };
  }
  return {
    label: line.slice(0, separatorIndex).trim(),
    spells: line
      .slice(separatorIndex + 1)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  };
}

/**
 * A creature's tabbed "how do its abilities actually work" view — everything
 * a DM needs at a glance mid-combat, without rereading prose
 * (`proficiencyBonus` already shows in `CreatureStatBlock`'s own icon-stat
 * row, not here). Mirrors `CharacterDetailsModal`'s own tab pattern — same
 * `TabBar`, same "renders nothing with under 2 populated tabs" rule.
 *
 * "Traits & Actions" is every trait/action/bonus action/reaction/legendary
 * action, same content and grouping the stat block used to always show
 * inline — moved here as this panel's first tab instead, so a creature's
 * full narrative text and its structured combat numbers live in one place
 * instead of the free-text block always showing above a separate structured
 * section. "Attacks" narrows that same list down to just the entries that
 * carry `.attack`/`.save`/`.recharge`, with those numbers as trailing
 * content instead of buried in `description`.
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
  const abilityGroups = groupTraits(creature.traits.filter((t) => t.attack || t.save || t.recharge));
  const hasTraits = allGroups.length > 0;
  const hasAttacks = abilityGroups.length > 0;
  const hasSpellcasting = Boolean(creature.spellcasting);

  const tabs: Array<{ key: AbilitiesTab; icon: string; text: string }> = [
    ...(hasTraits ? [{ key: "traits" as const, icon: CONTENT_KIND_ICON.features, text: "Traits & Actions" }] : []),
    ...(hasAttacks ? [{ key: "attacks" as const, icon: CONTENT_KIND_ICON.weapons, text: "Attacks" }] : []),
    ...(hasSpellcasting ? [{ key: "spellcasting" as const, icon: CONTENT_KIND_ICON.spells, text: "Spellcasting" }] : []),
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
              <p className="text-[10px] uppercase tracking-wide text-slate-600">{GROUP_LABELS[group]}</p>
              {items.map((trait, index) => {
                const flagged = flaggedTraits.includes(trait.name);
                return (
                  <FlaggableRow key={`${group}-${index}`} flagged={flagged} onToggleFlag={() => toggleFlag(trait.name)}>
                    <span className="font-semibold">{trait.name}.</span>{" "}
                    {trait.description && <RichText text={trait.description} />}
                  </FlaggableRow>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {currentTab === "attacks" && (
        <div className="space-y-3">
          {abilityGroups.map(({ group, items }) => (
            <div key={group} className="space-y-1">
              <p className="text-[10px] uppercase tracking-wide text-slate-600">{GROUP_LABELS[group]}</p>
              {items.map((trait, index) => {
                const flagged = flaggedTraits.includes(trait.name);
                return (
                  <FlaggableRow
                    key={`${group}-${index}`}
                    flagged={flagged}
                    onToggleFlag={() => toggleFlag(trait.name)}
                    trailing={<AbilityTraitTrailing trait={trait} />}
                  >
                    <InfoTooltip panel={<AbilityHintPanel name={trait.name} description={trait.description} />}>
                      {trait.name}
                    </InfoTooltip>
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
          {creature.spellcasting.spells.length > 0 && (
            <div className="space-y-2">
              {creature.spellcasting.spells.map((line, i) => {
                const { label, spells } = parseSpellFrequencyLine(line);
                if (spells.length === 0) return null;
                return (
                  <div key={i}>
                    {label && <p className="text-[10px] uppercase tracking-wide text-slate-600">{label}</p>}
                    <ul className="mt-0.5 space-y-0.5 text-sm text-slate-300">
                      {spells.map((spell, j) => (
                        <li key={j}>{spell}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </SectionDivider>
  );
}
