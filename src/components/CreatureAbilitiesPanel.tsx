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
import { SectionDivider } from "./ui/SectionDivider";
import { StatBox } from "./ui/StatBox";
import { TabBar } from "./ui/TabBar";

type AbilitiesTab = "attacks" | "spellcasting";

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

/**
 * The "one more tab" the DM asked for — everything new and structured
 * (`proficiencyBonus` already shows in `CreatureStatBlock`'s own icon-stat
 * row, not here) laid out for a fast glance, next to (not replacing) the
 * existing free-text Traits/Actions/Reactions/Legendary Actions block in
 * `CreatureStatBlock`. Mirrors `CharacterDetailsModal`'s own tab pattern —
 * same `TabBar`, same "renders nothing with under 2 populated tabs" rule.
 *
 * "Attacks" only lists traits that actually carry `.attack`/`.save`/
 * `.recharge` — a creature with none of those (most NPCs, most companions)
 * shows no tab at all rather than an empty one.
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

  const abilityTraits = creature.traits.filter((t) => t.attack || t.save || t.recharge);
  const groups = GROUP_ORDER.map((group) => ({
    group,
    items: abilityTraits.filter((t) => (t.group ?? "trait") === group),
  })).filter((g) => g.items.length > 0);
  const hasAttacks = groups.length > 0;
  const hasSpellcasting = Boolean(creature.spellcasting);

  const tabs: Array<{ key: AbilitiesTab; icon: string; text: string }> = [
    ...(hasAttacks ? [{ key: "attacks" as const, icon: CONTENT_KIND_ICON.weapons, text: "Attacks" }] : []),
    ...(hasSpellcasting ? [{ key: "spellcasting" as const, icon: CONTENT_KIND_ICON.spells, text: "Spellcasting" }] : []),
  ];
  const [activeTab, setActiveTab] = useState<AbilitiesTab | undefined>(tabs[0]?.key);
  const currentTab = tabs.some((t) => t.key === activeTab) ? activeTab : tabs[0]?.key;

  if (tabs.length === 0) return null;

  return (
    <SectionDivider>
      <TabBar tabs={tabs} current={currentTab} onChange={setActiveTab} className="mb-3" />

      {currentTab === "attacks" && (
        <div className="space-y-3">
          {groups.map(({ group, items }) => (
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
            <ul className="space-y-1 text-sm text-slate-300">
              {creature.spellcasting.spells.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </SectionDivider>
  );
}
