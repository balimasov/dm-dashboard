"use client";

import { useState } from "react";
import { Character, SKILL_LABELS, ordinalLevel } from "@/lib/types";
import {
  CriticalItemCategory,
  CriticalItemEntry,
  DefenseCoverageEntry,
  HeroicInspirationSummary,
  LanguageCoverageEntry,
  PARTY_TOOLKIT_COMPACT_SKILLS,
  PartyPassiveSummary,
  PartyResourceEntry,
  ResourceStatus,
  SenseCoverageEntry,
  SkillCoverageStatus,
  SkillOverviewEntry,
  ToolCoverageEntry,
  UtilitySpellAvailability,
  computeConditionProtectionCoverage,
  computeCriticalInventoryHighlights,
  computeHeroicInspirationSummary,
  computeLanguageCoverage,
  computePartyPassiveSummary,
  computePartyResourceSummary,
  computePartySkillOverview,
  computePartySpellSlotSummary,
  computeResistanceCoverage,
  computeSensesCoverage,
  computeToolCoverage,
  computeUtilitySpellAvailability,
  formatSkillScore,
} from "@/lib/partyToolkit";
import { DotMeter } from "./ResourceMeter";

const STATUS_CLASS: Record<SkillCoverageStatus, string> = {
  Strong: "border-emerald-700 bg-emerald-950/30 text-emerald-300",
  Medium: "border-amber-700 bg-amber-950/30 text-amber-300",
  Weak: "border-slate-700 bg-slate-800/40 text-slate-400",
};

function StatusPill({ status }: { status: SkillCoverageStatus }) {
  return (
    <span className={`shrink-0 rounded-md border px-2 py-0.5 text-center text-xs font-medium ${STATUS_CLASS[status]}`}>
      {status}
    </span>
  );
}

function SkillRow({ entry }: { entry: SkillOverviewEntry }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-200">{SKILL_LABELS[entry.skill]}</p>
        <p className="truncate text-xs text-slate-500">
          {entry.best ? `Best: ${formatSkillScore(entry.best)}` : "No one in the party"}
          {entry.weakest && ` · Weakest: ${formatSkillScore(entry.weakest)}`}
        </p>
      </div>
      <span className="shrink-0 whitespace-nowrap text-xs text-slate-500">{entry.proficientCount} proficient</span>
      <StatusPill status={entry.status} />
    </div>
  );
}

/** Union of the always-shown compact skills and the "show all" full 18 — Skills is the left/wide half of the Party Toolkit content grid. */
function SkillOverviewPanel({ characters }: { characters: Character[] }) {
  const [showAll, setShowAll] = useState(false);
  const all = computePartySkillOverview(characters);
  const entries = showAll ? all : all.filter((e) => PARTY_TOOLKIT_COMPACT_SKILLS.includes(e.skill));

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-black/20">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Skills</h3>
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="shrink-0 text-xs text-sky-400 hover:text-sky-300"
        >
          {showAll ? "Show fewer" : `Show all ${all.length} skills`}
        </button>
      </div>
      <div className="divide-y divide-slate-800/60">
        {entries.map((entry) => (
          <SkillRow key={entry.skill} entry={entry} />
        ))}
      </div>
    </div>
  );
}

function PassiveRow({ label, best, average, lowest }: { label: string; best: string; average?: string; lowest?: string }) {
  return (
    <p className="text-sm">
      <span className="text-slate-200">{label}: </span>
      <span className="text-slate-400">
        Best {best}
        {average && ` · Avg ${average}`}
        {lowest && ` · Lowest ${lowest}`}
      </span>
    </p>
  );
}

function PassivesPanel({ summary }: { summary: PartyPassiveSummary }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-black/20">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Passives</h3>
      <div className="space-y-1.5">
        <PassiveRow
          label="Passive Perception"
          best={`${summary.perception.best.value} — ${summary.perception.best.characterName}`}
          average={String(summary.perception.average)}
          lowest={String(summary.perception.lowest.value)}
        />
        <PassiveRow label="Passive Insight" best={`${summary.insight.value} — ${summary.insight.characterName}`} />
        <PassiveRow
          label="Passive Investigation"
          best={`${summary.investigation.value} — ${summary.investigation.characterName}`}
        />
      </div>
    </div>
  );
}

/** Party-wide totals per spell slot level — never a per-character breakdown, that already lives on each character's own card. */
function SpellSlotsPanel({ characters }: { characters: Character[] }) {
  const summary = computePartySpellSlotSummary(characters);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-black/20">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Spell Slots</h3>
      {!summary ? (
        <p className="text-sm text-slate-600">No spell slots in the party.</p>
      ) : (
        <>
          <div className="space-y-1">
            {summary.levels.map((l) => (
              <div key={l.level} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-300">{ordinalLevel(l.level)} Level</span>
                {l.max <= 6 ? (
                  <DotMeter current={l.current} max={l.max} colorClass="bg-violet-400" />
                ) : (
                  <span className="font-medium text-slate-100">
                    {l.current}/{l.max}
                  </span>
                )}
              </div>
            ))}
          </div>
          <p className="mt-2 border-t border-slate-800 pt-2 text-sm text-slate-400">
            Spell Power:{" "}
            <span className="font-medium text-slate-100">
              {summary.totalCurrent} / {summary.totalMax}
            </span>{" "}
            slots available
            {summary.highestAvailableLevel && ` · Highest: ${ordinalLevel(summary.highestAvailableLevel)}`}
          </p>
        </>
      )}
    </div>
  );
}

const RESOURCE_STATUS_CLASS: Record<ResourceStatus, string> = {
  empty: "text-red-400",
  low: "text-amber-400",
  normal: "text-slate-100",
};

function HeroicInspirationRow({ summary }: { summary: HeroicInspirationSummary }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2 text-sm">
      <span className="text-slate-300">Heroic Inspiration</span>
      <span className="font-medium text-slate-100">
        {summary.withInspiration} / {summary.partySize}
      </span>
    </div>
  );
}

function ResourceRow({ entry }: { entry: PartyResourceEntry }) {
  return (
    <div className="flex items-center gap-3 py-1 text-sm">
      <span className="min-w-0 flex-1 truncate text-slate-300">{entry.resourceName}</span>
      <span className={`shrink-0 whitespace-nowrap font-medium ${RESOURCE_STATUS_CLASS[entry.status]}`}>
        {entry.current}/{entry.max}
      </span>
      <span title={entry.characterName} className="w-24 shrink-0 truncate text-right text-xs text-slate-500">
        {entry.characterName}
      </span>
    </div>
  );
}

/** Heroic Inspiration is tracked separately from `resources` — always shown, even at 0 — since it's a boolean on the character rather than a class/feat resource. */
function ResourcesPanel({ characters }: { characters: Character[] }) {
  const inspiration = computeHeroicInspirationSummary(characters);
  const resources = computePartyResourceSummary(characters);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-black/20">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Resources</h3>
      <HeroicInspirationRow summary={inspiration} />
      {resources.length === 0 ? (
        <p className="mt-2 text-sm text-slate-600">No limited-use resources tracked.</p>
      ) : (
        <div className="divide-y divide-slate-800/60">
          {resources.map((entry) => (
            <ResourceRow key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

function CriticalItemRow({ entry }: { entry: CriticalItemEntry }) {
  const holdersText = entry.holders
    .map((h) => (h.quantity > 1 ? `${h.characterName} x${h.quantity}` : h.characterName))
    .join(", ");
  return (
    <div className="flex items-center gap-3 py-1 text-sm">
      <span className="min-w-0 flex-1 truncate text-slate-300">{entry.name}</span>
      <span className="shrink-0 font-medium text-slate-100">x{entry.totalQuantity}</span>
      <span title={holdersText} className="w-28 shrink-0 truncate text-right text-xs text-slate-500">
        {holdersText}
      </span>
    </div>
  );
}

/** Grouped by category (see `computeCriticalInventoryHighlights`) — deliberately not the full party inventory, `InventoryOverview` already covers that. */
function CriticalItemsPanel({ characters }: { characters: Character[] }) {
  const entries = computeCriticalInventoryHighlights(characters);
  const byCategory = new Map<CriticalItemCategory, CriticalItemEntry[]>();
  for (const entry of entries) {
    if (!byCategory.has(entry.category)) byCategory.set(entry.category, []);
    byCategory.get(entry.category)!.push(entry);
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-black/20">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Critical Items</h3>
      {entries.length === 0 ? (
        <p className="text-sm text-slate-600">No critical items found in the party&apos;s inventory.</p>
      ) : (
        <div className="space-y-3">
          {Array.from(byCategory.entries()).map(([category, items]) => (
            <div key={category}>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">{category}</p>
              <div className="divide-y divide-slate-800/60">
                {items.map((item) => (
                  <CriticalItemRow key={item.name} entry={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SenseRow({ entry }: { entry: SenseCoverageEntry }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-300">{entry.name}</span>
      {entry.count === 0 ? (
        <span className="text-slate-600">none</span>
      ) : (
        <span className="text-right">
          <span className="font-medium text-slate-100">
            {entry.count}/{entry.partySize}
          </span>
          {entry.best && (
            <span className="ml-2 text-xs text-slate-500">
              Best: {entry.best.characterName} {entry.best.range} ft
            </span>
          )}
        </span>
      )}
    </div>
  );
}

function UtilitySpellRow({ entry }: { entry: UtilitySpellAvailability }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-300">{entry.name} available</span>
      <span className={entry.available ? "font-medium text-emerald-400" : "text-slate-600"}>
        {entry.available ? `Yes — ${entry.characterNames.join(", ")}` : "No"}
      </span>
    </div>
  );
}

function SensesPanel({ characters }: { characters: Character[] }) {
  const senses = computeSensesCoverage(characters);
  const utility = computeUtilitySpellAvailability(characters);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-black/20">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Senses</h3>
      <div className="space-y-1.5">
        {senses.map((entry) => (
          <SenseRow key={entry.name} entry={entry} />
        ))}
      </div>
      <div className="mt-3 space-y-1.5 border-t border-slate-800 pt-2">
        {utility.map((entry) => (
          <UtilitySpellRow key={entry.name} entry={entry} />
        ))}
      </div>
    </div>
  );
}

function DefenseRow({ entry }: { entry: DefenseCoverageEntry }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-300">{entry.name}</span>
      <span className={entry.count === 0 ? "text-slate-600" : "font-medium text-slate-100"}>
        {entry.count} / {entry.partySize}
      </span>
    </div>
  );
}

/** Pinned damage types + condition protections, not a full damage-type table — see `computeResistanceCoverage`/`computeConditionProtectionCoverage`. */
function DefensesPanel({ characters }: { characters: Character[] }) {
  const resistances = computeResistanceCoverage(characters);
  const conditions = computeConditionProtectionCoverage(characters);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-black/20">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Defense Coverage</h3>
      <div className="space-y-1.5">
        {resistances.map((entry) => (
          <DefenseRow key={entry.name} entry={entry} />
        ))}
      </div>
      <p className="mb-1.5 mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
        Condition Protection
      </p>
      <div className="space-y-1.5">
        {conditions.map((entry) => (
          <DefenseRow key={entry.name} entry={entry} />
        ))}
      </div>
    </div>
  );
}

function LanguageRow({ entry }: { entry: LanguageCoverageEntry }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-300">{entry.name}</span>
      <span className="font-medium text-slate-100">{entry.count}</span>
    </div>
  );
}

function ToolRow({ entry }: { entry: ToolCoverageEntry }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-300">{entry.name}</span>
      <span className={entry.characterNames.length === 0 ? "text-slate-600" : "font-medium text-slate-100"}>
        {entry.characterNames.length === 0 ? "none" : entry.characterNames.join(", ")}
      </span>
    </div>
  );
}

/** Languages actually present in the party, plus a handful of commonly-relevant tool proficiencies pinned even at 0 — see `computeLanguageCoverage`/`computeToolCoverage`. */
function LanguagesToolsPanel({ characters }: { characters: Character[] }) {
  const languages = computeLanguageCoverage(characters);
  const tools = computeToolCoverage(characters);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-black/20">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Languages &amp; Tools</h3>
      {languages.length === 0 ? (
        <p className="text-sm text-slate-600">No languages tracked.</p>
      ) : (
        <div className="space-y-1.5">
          {languages.map((entry) => (
            <LanguageRow key={entry.name} entry={entry} />
          ))}
        </div>
      )}
      <p className="mb-1.5 mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-600">Tools</p>
      <div className="space-y-1.5">
        {tools.map((entry) => (
          <ToolRow key={entry.name} entry={entry} />
        ))}
      </div>
    </div>
  );
}

/**
 * Party Toolkit — Iterations 1-3: Skills, Passives, Spell Slots, Resources,
 * Critical Items, Senses, Defenses, Languages & Tools. Reference-only: no
 * dice roller, no roll buttons, no success/fail resolution. `characters` is
 * expected to already be filtered to the visible roster (same set shown in
 * the Party row above it).
 */
export function PartyToolkit({ characters }: { characters: Character[] }) {
  const passives = computePartyPassiveSummary(characters);

  if (characters.length === 0 || !passives) {
    return <p className="text-sm text-slate-600">No characters yet.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <SkillOverviewPanel characters={characters} />
        <PassivesPanel summary={passives} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SpellSlotsPanel characters={characters} />
        <ResourcesPanel characters={characters} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <CriticalItemsPanel characters={characters} />
        <SensesPanel characters={characters} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DefensesPanel characters={characters} />
        <LanguagesToolsPanel characters={characters} />
      </div>
    </div>
  );
}
