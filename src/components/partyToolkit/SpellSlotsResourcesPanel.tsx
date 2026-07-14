"use client";

import { useState } from "react";
import { Character, RECOVERY_LABELS } from "@/lib/types";
import { ordinalLevel } from "@/lib/format";
import {
  HeroicInspirationSummary,
  PartyResourceEntry,
  PartySpellEntry,
  computeHeroicInspirationSummary,
  computePartyResourceSummary,
  computePartyRestRecoveryGauge,
  computePartySpellSlotSummary,
  computePartySpellsByLevel,
} from "@/lib/partyToolkit";
import { InfoTooltip } from "../InfoTooltip";
import { RichText } from "../RichText";
import { CharacterChip, CharacterChipRow } from "../ui/CharacterChip";
import { RecoveryBadge } from "../ui/RecoveryBadge";
import { SectionLabel, ToolkitCard } from "../ui/ToolkitCard";
import { CANTRIP_HINT, CHART_AREA_MIN_HEIGHT_CLASS, HEROIC_INSPIRATION_DESCRIPTION, HolderListPanel, SpellChartsRow, usageColorClass } from "./shared";

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

/** Same hover-hint content as `ResourceMeter` on the character card (name/source/description) — resources aren't duplicated data here, just a different view of the same fields. */
function ResourceHintPanel({ entry }: { entry: PartyResourceEntry }) {
  return (
    <div className="space-y-1">
      <p className="font-medium text-white">{entry.resourceName}</p>
      {entry.source && <p className="text-xs uppercase tracking-wide text-slate-500">{entry.source}</p>}
      <p>{RECOVERY_LABELS[entry.recovery]} recovery</p>
      {entry.description && <p>{entry.description}</p>}
    </div>
  );
}

function ResourceRow({ entry }: { entry: PartyResourceEntry }) {
  return (
    <div className="flex items-center gap-3 py-1 text-sm">
      <div className="min-w-0 flex-1">
        <InfoTooltip panel={<ResourceHintPanel entry={entry} />}>
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

/** Same "name + short rules blurb" hint every other trackable row in the Party Toolkit shows (`TrackableHintPanel` in `ResourceCoveragePanel`) — a cantrip also gets the same `CANTRIP_HINT` line the Resources tab's cantrip badge used to show, since removing that badge here shouldn't lose the "no slot needed" fact entirely. */
function PartySpellHintPanel({ spell }: { spell: PartySpellEntry }) {
  return (
    <div className="space-y-1">
      <p className="font-medium text-white">{spell.name}</p>
      {spell.isCantrip && CANTRIP_HINT}
      {spell.description && (
        <p className="text-slate-300">
          <RichText text={spell.description} />
        </p>
      )}
    </div>
  );
}

/** One row per known spell, deduped across the whole party — its level already reads off the group header above it, so the row itself is just the name (with a hover hint for its rules text) and `CharacterChipRow` for who knows it. */
function PartySpellRow({ spell }: { spell: PartySpellEntry }) {
  return (
    <div className="flex items-center gap-2 py-1 text-sm">
      <div className="min-w-0 flex-1">
        <InfoTooltip panel={<PartySpellHintPanel spell={spell} />}>
          <span className="text-slate-300">{spell.name}</span>
        </InfoTooltip>
      </div>
      <CharacterChipRow holders={spell.holders} />
    </div>
  );
}

type PartyDetailsTab = "features" | "spells";

/**
 * Spell Slots & Resources — the same Rest Recovery/Spell Slots charts
 * `ResourceCoveragePanel` shows (via the shared `SpellChartsRow`), so both
 * panels read as one consistent instrument instead of this one showing an
 * older, different chart style.
 *
 * Below that, tabbed the same way `CharacterDetailsModal` tabs a single
 * character's own Features and Traits / Spells — "Features and Traits"
 * keeps this panel's existing Heroic Inspiration + Resources content
 * unchanged, "Spells" is new: every known spell across the party, grouped
 * by level like a character's own Spells tab, deduped by name so a spell
 * several characters share shows as one row with several avatar chips
 * instead of once per character. No tab switcher (and no "Spells" tab at
 * all) for an all-martial party with nothing to show there — same "don't
 * show an empty tab" rule the character modal already follows.
 */
export function SpellSlotsResourcesPanel({ characters }: { characters: Character[] }) {
  const spellSlots = computePartySpellSlotSummary(characters);
  const inspiration = computeHeroicInspirationSummary(characters);
  const resources = computePartyResourceSummary(characters);
  const restRecovery = computePartyRestRecoveryGauge(characters);
  const spellLevelGroups = computePartySpellsByLevel(characters);

  const tabs: Array<{ key: PartyDetailsTab; label: string }> = [
    { key: "features", label: "Features and Traits" },
    ...(spellLevelGroups.length > 0 ? [{ key: "spells" as const, label: "Spells" }] : []),
  ];
  const [activeTab, setActiveTab] = useState<PartyDetailsTab>("features");
  const currentTab = tabs.some((t) => t.key === activeTab) ? activeTab : "features";

  return (
    <ToolkitCard title="Spell Slots & Resources">
      <div className={CHART_AREA_MIN_HEIGHT_CLASS}>
        <SpellChartsRow restRecovery={restRecovery} spellSlots={spellSlots} />
      </div>

      {tabs.length > 1 && (
        <div className="mb-3 mt-4 flex gap-1 rounded-lg bg-slate-800/60 p-1 text-sm">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 rounded-md px-2 py-1 font-medium transition-colors ${
                currentTab === tab.key ? "bg-slate-700 text-slate-100" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {currentTab === "features" && (
        <>
          <SectionLabel className={tabs.length > 1 ? "" : "mt-4"}>Heroic Inspiration</SectionLabel>
          <HeroicInspirationRow summary={inspiration} />

          <SectionLabel className="mt-4">Resources</SectionLabel>
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
                  <span className={`normal-case tracking-normal ${usageColorClass(slotLevel.current, slotLevel.max)}`}>
                    {slotLevel.current}/{slotLevel.max}
                  </span>
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
    </ToolkitCard>
  );
}
