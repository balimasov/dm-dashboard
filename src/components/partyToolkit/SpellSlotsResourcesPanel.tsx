"use client";

import { useState } from "react";
import { Attack, Character, RARITY_COLOR, RECOVERY_LABELS } from "@/lib/types";
import { CONTENT_KIND_ICON } from "@/lib/contentKindIcons";
import { ordinalLevel } from "@/lib/format";
import {
  HeroicInspirationSummary,
  PartyCharacterAttacks,
  PartyConsumableEntry,
  PartyResourceEntry,
  PartySpellEntry,
  computeHeroicInspirationSummary,
  computePartyAttacks,
  computePartyConsumables,
  computePartyResourceSummary,
  computePartySpellSlotSummary,
  computePartySpellsByLevel,
  groupConsumablesByType,
} from "@/lib/partyToolkit";
import { InfoTooltip } from "../InfoTooltip";
import { AbilityHintPanel } from "../ui/AbilityHintPanel";
import { AttackName, AttackTrailing } from "../ui/AttackDisplay";
import { CharacterChip, CharacterChipRow } from "../ui/CharacterChip";
import { ConsumableQuantity } from "../ui/ConsumableQuantity";
import { ItemHintPanel } from "../ui/ItemHintPanel";
import { RecoveryBadge } from "../ui/RecoveryBadge";
import { TabBar } from "../ui/TabBar";
import { SectionLabel, ToolkitCard } from "../ui/ToolkitCard";
import { HEROIC_INSPIRATION_DESCRIPTION, HolderListPanel, SpellSlotLevelPanel, usageColorClass } from "./shared";

function HeroicInspirationRow({ summary }: { summary: HeroicInspirationSummary }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <InfoTooltip
        panel={<HolderListPanel label="Heroic Inspiration" description={HEROIC_INSPIRATION_DESCRIPTION} holders={summary.holders} />}
      >
        <span className="text-slate-300">Heroic Inspiration</span>
      </InfoTooltip>
      <span className={`font-medium ${usageColorClass(summary.withInspiration, summary.partySize)}`}>
        {summary.withInspiration}/{summary.partySize}
      </span>
    </div>
  );
}

function ResourceRow({ entry }: { entry: PartyResourceEntry }) {
  return (
    <div className="flex items-center gap-3 py-1 text-sm">
      <div className="min-w-0 flex-1">
        <InfoTooltip
          panel={
            <AbilityHintPanel
              name={entry.resourceName}
              metaLines={[entry.source]}
              status={<span className="text-sky-400">{RECOVERY_LABELS[entry.recovery]} recovery</span>}
              description={entry.description}
            />
          }
        >
          <span className="text-slate-300">{entry.resourceName}</span>
        </InfoTooltip>
      </div>
      <RecoveryBadge recovery={entry.recovery} />
      <span className={`shrink-0 whitespace-nowrap font-medium ${usageColorClass(entry.current, entry.max)}`}>
        {entry.current}/{entry.max}
      </span>
      <CharacterChip name={entry.characterName} avatarUrl={entry.avatarUrl} />
    </div>
  );
}

/** "Cantrips" / "1st Level" / ... — same label D&D Beyond's own Spells tab uses, matched here so a DM reads the party-wide list the same way as any character's own. */
function spellLevelLabel(level: number): string {
  return level === 0 ? "Cantrips" : `${ordinalLevel(level)} Level`;
}

/** One row per known spell, deduped across the whole party — its level already reads off the group header above it, so the row itself is just the name (with the same `AbilityHintPanel` hover hint a character's own Spells tab shows for the same spell) and `CharacterChipRow` for who knows it. */
function PartySpellRow({ spell }: { spell: PartySpellEntry }) {
  return (
    <div className="flex items-center gap-2 py-1 text-sm">
      <div className="min-w-0 flex-1">
        <InfoTooltip
          panel={
            <AbilityHintPanel
              name={spell.name}
              subtitle={spell.school}
              metaLines={[[spell.source, spell.components].filter(Boolean).join(" · ")]}
              note={spell.materialComponent && `Material: ${spell.materialComponent}`}
              description={spell.description}
            />
          }
        >
          <span className="text-slate-300">{spell.name}</span>
        </InfoTooltip>
      </div>
      <CharacterChipRow holders={spell.holders} />
    </div>
  );
}

/** One attack row inside a character's group in the Weapons tab — same flex-row shape `ResourceRow`/`PartySpellRow` use (name flex-1 on the left, numbers shrink-0 on the right), built from the exact same `AttackName`/`AttackTrailing` pieces `CharacterDetailsModal`'s own Weapons tab renders, so a DM sees the identical bonus/damage/mastery numbers here as on that character's own card. */
function PartyAttackRow({ attack }: { attack: Attack }) {
  return (
    <div className="flex items-center gap-3 py-1 text-sm">
      <div className="min-w-0 flex-1">
        <AttackName attack={attack} />
      </div>
      <AttackTrailing attack={attack} />
    </div>
  );
}

/** One character's own group of attacks — an avatar+name header (same shape `RemindersPanel`'s per-character groups use) above that character's own attack list, `divide-y`'d the same way every other grouped list in this panel is. */
function PartyCharacterWeapons({ entry, isFirst }: { entry: PartyCharacterAttacks; isFirst: boolean }) {
  return (
    <div className={isFirst ? "" : "mt-4"}>
      <div className="mb-1 flex items-center gap-2">
        <CharacterChip name={entry.characterName} avatarUrl={entry.avatarUrl} showTitle={false} />
        <p title={entry.characterName} className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-100">
          {entry.characterName}
        </p>
      </div>
      <div className="divide-y divide-slate-800/60">
        {entry.attacks.map((attack) => (
          <PartyAttackRow key={attack.id} attack={attack} />
        ))}
      </div>
    </div>
  );
}

/** One consumable row inside the Consumables tab's type groups — name (rarity-colored, with the same title/weight/cost/description hint every item hint in the app uses) on the left, remaining count and who's carrying it on the right. */
function PartyConsumableRow({ entry }: { entry: PartyConsumableEntry }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1 text-sm">
      <div className="min-w-0 flex-1">
        <InfoTooltip
          panel={
            <ItemHintPanel name={entry.name} rarity={entry.rarity} weight={entry.weight} cost={entry.cost} description={entry.description} />
          }
        >
          <span className={`min-w-0 truncate ${RARITY_COLOR[entry.rarity]}`}>{entry.name}</span>
        </InfoTooltip>
      </div>
      <span className="flex shrink-0 items-center gap-2">
        <ConsumableQuantity quantity={entry.totalQuantity} />
        <CharacterChipRow
          holders={entry.holders}
          chipTitle={(h) => (h.quantity > 1 ? `${h.characterName} x${h.quantity}` : h.characterName)}
        />
      </span>
    </div>
  );
}

/** One D&D Beyond type's group of consumables — same shape `PartyCharacterWeapons` uses for a character's own attack group, just headed by the type label instead of a character chip. */
function PartyConsumableTypeGroup({ label, entries, isFirst }: { label: string; entries: PartyConsumableEntry[]; isFirst: boolean }) {
  return (
    <div className={isFirst ? "" : "mt-4"}>
      <SectionLabel>{label}</SectionLabel>
      <div className="divide-y divide-slate-800/60">
        {entries.map((entry) => (
          <PartyConsumableRow key={entry.name} entry={entry} />
        ))}
      </div>
    </div>
  );
}

type PartyDetailsTab = "weapons" | "features" | "spells" | "consumables";

/**
 * Actions & Resources — tabbed the same way `CharacterDetailsModal` tabs a
 * single character's own Weapons/Features and Traits/Spells/Consumables —
 * "Features and Traits" keeps this panel's existing Heroic Inspiration +
 * Limited Use content unchanged, "Spells" is every known spell across the
 * party, grouped by level like a character's own Spells tab and deduped by
 * name (a spell several characters share shows as one row with several
 * avatar chips instead of once per character). "Consumables" is the same
 * deduped-by-name, grouped-by-D&D-Beyond-type list the old standalone
 * `ConsumablesPanel` card used to show directly, before that card was
 * removed in favor of just the compact per-type histogram now living in
 * `PartyChartsPanel` ("Rest & Spell Slots") — this tab is where the
 * itemized breakdown moved to. "Weapons" is different from
 * "Spells"/"Consumables" on purpose: it groups
 * by *character* instead of deduping across the party (see
 * `computePartyAttacks`'s own doc comment for why). No tab switcher (and no
 * tab at all) for content nobody has — same "don't show an empty tab" rule
 * the character modal already follows.
 *
 * Used to open with its own copy of the Rest Recovery/Spell Slots charts
 * (`ResourceCoveragePanel` showed the exact same pair above its own listing)
 * — both moved into their own `PartyChartsPanel` under Party Vitals instead,
 * since rendering the identical numbers twice just cost vertical space
 * without showing anything new. Started life as "Spell Slots & Resources"
 * (hence `SpellSlotsResourcesPanel`'s own file/component name, kept
 * unchanged since renaming it would ripple into every import for no
 * behavioral gain) — the visible title moved to "Actions & Resources" once
 * Weapons joined Spells as a second kind of "what can this character DO"
 * content sitting alongside the resource/slot tracking.
 */
export function SpellSlotsResourcesPanel({ characters }: { characters: Character[] }) {
  const spellSlots = computePartySpellSlotSummary(characters);
  const inspiration = computeHeroicInspirationSummary(characters);
  const resources = computePartyResourceSummary(characters);
  const spellLevelGroups = computePartySpellsByLevel(characters);
  const partyAttacks = computePartyAttacks(characters);
  const partyConsumables = computePartyConsumables(characters);
  const consumableGroups = groupConsumablesByType(partyConsumables);

  const tabs: Array<{ key: PartyDetailsTab; icon: string; text: string }> = [
    ...(partyAttacks.length > 0 ? [{ key: "weapons" as const, icon: CONTENT_KIND_ICON.weapons, text: "Weapons" }] : []),
    { key: "features", icon: CONTENT_KIND_ICON.features, text: "Features and Traits" },
    ...(spellLevelGroups.length > 0 ? [{ key: "spells" as const, icon: CONTENT_KIND_ICON.spells, text: "Spells" }] : []),
    ...(partyConsumables.length > 0 ? [{ key: "consumables" as const, icon: CONTENT_KIND_ICON.consumables, text: "Consumables" }] : []),
  ];
  const [activeTab, setActiveTab] = useState<PartyDetailsTab | undefined>(tabs[0]?.key);
  const currentTab = tabs.some((t) => t.key === activeTab) ? activeTab : tabs[0]?.key;

  return (
    <ToolkitCard title="Actions & Resources">
      {/* `mb-1.5` (not the more typical `mb-3`) matches the Skills panel's
          own `gap-1.5` between its avatar-chip row and "Passives" — the two
          panels sit side by side in a `lg:grid-cols-2` row, and this tab
          bar is this panel's equivalent "chrome before the first section
          label" to that avatar row, so the same gap keeps "Heroic
          Inspiration" level with "Passives" instead of landing 6px lower. */}
      <TabBar tabs={tabs} current={currentTab} onChange={setActiveTab} className="mb-1.5 mt-4" />

      {currentTab === "weapons" &&
        partyAttacks.map((entry, index) => <PartyCharacterWeapons key={entry.characterId} entry={entry} isFirst={index === 0} />)}

      {currentTab === "features" && (
        <>
          <SectionLabel className={tabs.length > 1 ? "" : "mt-4"}>Heroic Inspiration</SectionLabel>
          <HeroicInspirationRow summary={inspiration} />

          <SectionLabel className="mt-4">Limited Use</SectionLabel>
          {resources.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">No limited-use resources tracked.</p>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {resources.map((entry) => (
                <ResourceRow key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </>
      )}

      {currentTab === "spells" &&
        spellLevelGroups.map((group, index) => {
          const slotLevel = spellSlots?.levels.find((l) => l.level === group.level);
          return (
            <div key={group.level}>
              <SectionLabel className={`flex items-center justify-between gap-3 ${index === 0 ? "" : "mt-4"}`}>
                <span>{spellLevelLabel(group.level)}</span>
                {slotLevel && (
                  <InfoTooltip hoverOnly panel={<SpellSlotLevelPanel level={slotLevel.level} holders={slotLevel.holders} />}>
                    <span className={`text-sm font-medium normal-case tracking-normal ${usageColorClass(slotLevel.current, slotLevel.max)}`}>
                      {slotLevel.current}/{slotLevel.max}
                    </span>
                  </InfoTooltip>
                )}
              </SectionLabel>
              <div className="divide-y divide-slate-800/60">
                {group.spells.map((spell) => (
                  <PartySpellRow key={spell.name} spell={spell} />
                ))}
              </div>
            </div>
          );
        })}

      {currentTab === "consumables" &&
        consumableGroups.map((group, index) => (
          <PartyConsumableTypeGroup key={group.label} label={group.label} entries={group.entries} isFirst={index === 0} />
        ))}
    </ToolkitCard>
  );
}
