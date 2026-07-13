"use client";

import { useState } from "react";
import { Character, RECOVERY_LABELS, SKILL_LABELS, formatModifier, ordinalLevel } from "@/lib/types";
import {
  COVERAGE_CATEGORY_ORDER,
  CoverageCategory,
  CoverageEntry,
  CriticalItemCategory,
  CriticalItemEntry,
  DefenseCoverageEntry,
  DefenseHolder,
  HeroicInspirationSummary,
  LanguageCoverageEntry,
  PartyPassiveSummary,
  PartyResourceEntry,
  PassiveCharacterScore,
  PassiveStatSummary,
  ResourceStatus,
  SenseCoverageEntry,
  SenseHolder,
  SkillCharacterScore,
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
  computeSpellAbilityCoverage,
  computeToolCoverage,
  computeUtilitySpellAvailability,
} from "@/lib/partyToolkit";
import { InfoTooltip } from "./InfoTooltip";
import { CharacterChip } from "./ui/CharacterChip";
import { RecoveryBadge } from "./ui/RecoveryBadge";

/** Same green/amber/red family as `HpBar`'s danger-tier colors — one shared "how worried should I be" palette across the whole app instead of coverage inventing its own. */
const STATUS_BADGE_CLASS: Record<SkillCoverageStatus, string> = {
  Strong: "border-emerald-700 bg-emerald-950/30 text-emerald-400",
  Medium: "border-amber-700 bg-amber-950/30 text-amber-400",
  Weak: "border-red-800 bg-red-950/30 text-red-400",
};

const STATUS_LABEL: Record<SkillCoverageStatus, string> = {
  Strong: "Strong coverage",
  Medium: "Medium coverage",
  Weak: "Weak coverage",
};

/**
 * Replaces the old Strong/Medium/Weak text chip (too wide) and the dot that
 * replaced it (too small to read anything from at a glance) — the actual
 * `proficientCount / partySize` ratio, colored by the same tier, is exactly
 * as compact as the dot but tells the DM the real numbers instead of making
 * them hover for it.
 */
function CoverageBadge({ proficientCount, partySize, status }: { proficientCount: number; partySize: number; status: SkillCoverageStatus }) {
  return (
    <span
      title={`${STATUS_LABEL[status]} — ${proficientCount} of ${partySize} proficient`}
      className={`shrink-0 rounded-md border px-1.5 py-0.5 text-center text-xs font-semibold tabular-nums ${STATUS_BADGE_CLASS[status]}`}
    >
      {proficientCount}/{partySize}
    </span>
  );
}

/** The hover hint's content for a skill row — every character's modifier, ranked, with proficiency called out the same way the row's own coverage count does. */
function SkillAllScoresPanel({ label, all }: { label: string; all: SkillCharacterScore[] }) {
  return (
    <div className="space-y-1">
      <p className="font-medium text-slate-100">{label}</p>
      <ul className="space-y-0.5">
        {all.map((s) => (
          <li key={s.characterId} className="flex items-center justify-between gap-4">
            <span className="min-w-0 truncate">{s.characterName}</span>
            <span className={`shrink-0 whitespace-nowrap ${s.proficient ? "text-emerald-400" : "text-slate-100"}`}>
              {formatModifier(s.modifier)}
              {s.expertise ? " · expertise" : s.proficient ? " · proficient" : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SkillRow({ entry }: { entry: SkillOverviewEntry }) {
  const label = SKILL_LABELS[entry.skill];
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="min-w-0 flex-1">
        <InfoTooltip panel={<SkillAllScoresPanel label={label} all={entry.all} />}>
          <span className="text-sm font-medium text-slate-200">{label}</span>
        </InfoTooltip>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {entry.best && (
          <StrengthChip
            characterName={entry.best.characterName}
            avatarUrl={entry.best.avatarUrl}
            hint={`Best: ${entry.best.characterName} ${formatModifier(entry.best.modifier)}`}
            direction="up"
          />
        )}
        {entry.weakest && (
          <StrengthChip
            characterName={entry.weakest.characterName}
            avatarUrl={entry.weakest.avatarUrl}
            hint={`Weakest: ${entry.weakest.characterName} ${formatModifier(entry.weakest.modifier)}`}
            direction="down"
          />
        )}
      </div>
      <CoverageBadge proficientCount={entry.proficientCount} partySize={entry.all.length} status={entry.status} />
    </div>
  );
}

/** Same hover-hint idea as `SkillAllScoresPanel`, for a passive stat — "proficient" here means proficient in the underlying skill (Perception/Insight/Investigation), not in the passive stat itself (which isn't a real game concept). */
function PassiveAllScoresPanel({ label, all }: { label: string; all: PassiveCharacterScore[] }) {
  return (
    <div className="space-y-1">
      <p className="font-medium text-slate-100">{label}</p>
      <ul className="space-y-0.5">
        {all.map((s) => (
          <li key={s.characterName} className="flex items-center justify-between gap-4">
            <span className="min-w-0 truncate">{s.characterName}</span>
            <span className={`shrink-0 whitespace-nowrap ${s.proficient ? "text-emerald-400" : "text-slate-100"}`}>
              {s.value}
              {s.proficient ? " · proficient" : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Same shape as `SkillRow` (name with a hover hint, best/weakest chips, status dot) — Passives is a subsection of the same Skills card, so the two need to read as one family of rows. Average/lowest are one hover away in the tooltip rather than crammed into a subtitle. */
function PassiveRow({ label, summary }: { label: string; summary: PassiveStatSummary }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="min-w-0 flex-1">
        <InfoTooltip panel={<PassiveAllScoresPanel label={label} all={summary.all} />}>
          <span className="text-sm font-medium text-slate-200">{label}</span>
        </InfoTooltip>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <StrengthChip
          characterName={summary.best.characterName}
          avatarUrl={summary.best.avatarUrl}
          hint={`Best: ${summary.best.characterName} ${summary.best.value}`}
          direction="up"
        />
        {summary.weakest && (
          <StrengthChip
            characterName={summary.weakest.characterName}
            avatarUrl={summary.weakest.avatarUrl}
            hint={`Weakest: ${summary.weakest.characterName} ${summary.weakest.value}`}
            direction="down"
          />
        )}
      </div>
      <CoverageBadge proficientCount={summary.proficientCount} partySize={summary.all.length} status={summary.status} />
    </div>
  );
}

/**
 * Skills — merges Passives and the Party Skill Overview into one card:
 * Passives first (same row shape as the skills below it), then all 18
 * skills (no compact/"show all" split — a DM mid-session doesn't know in
 * advance which skill they'll need, so hiding most of them just adds an
 * extra click). Every row name carries a hover hint listing each
 * character's own score, so the list stays scannable at a glance while
 * still answering "what does everyone else have" on demand.
 */
function SkillsPanel({ characters, passives }: { characters: Character[]; passives: PartyPassiveSummary }) {
  const skillEntries = computePartySkillOverview(characters);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-black/20">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Skills</h3>

      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">Passives</p>
      <div className="divide-y divide-slate-800/60">
        <PassiveRow label="Passive Perception" summary={passives.perception} />
        <PassiveRow label="Passive Insight" summary={passives.insight} />
        <PassiveRow label="Passive Investigation" summary={passives.investigation} />
      </div>

      <p className="mb-1 mt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-600">Skills</p>
      <div className="divide-y divide-slate-800/60">
        {skillEntries.map((entry) => (
          <SkillRow key={entry.skill} entry={entry} />
        ))}
      </div>
    </div>
  );
}

const RESOURCE_STATUS_CLASS: Record<ResourceStatus, string> = {
  empty: "text-red-400",
  low: "text-amber-400",
  normal: "text-slate-100",
};

/**
 * Best/weakest character for a skill or passive stat, shown as their chip +
 * an up/down arrow — `hint` carries the full "Best: Name +N" detail as a
 * native tooltip. Wrapped in a bordered pill (not just a bare chip+glyph)
 * so the whole thing reads as one unit and gives the tooltip a real hit
 * target to hover, instead of the tiny arrow glyph alone.
 */
function StrengthChip({
  characterName,
  avatarUrl,
  hint,
  direction,
}: {
  characterName: string;
  avatarUrl?: string;
  hint: string;
  direction: "up" | "down";
}) {
  const isUp = direction === "up";
  return (
    <span
      title={hint}
      className={`flex shrink-0 items-center gap-1 rounded-full border py-0.5 pl-0.5 pr-1.5 ${
        isUp ? "border-emerald-800 bg-emerald-950/30" : "border-red-800 bg-red-950/30"
      }`}
    >
      <CharacterChip name={characterName} avatarUrl={avatarUrl} />
      <span className={`text-sm font-bold leading-none ${isUp ? "text-emerald-400" : "text-red-400"}`}>
        {isUp ? "↑" : "↓"}
      </span>
    </span>
  );
}

function HeroicInspirationRow({ summary }: { summary: HeroicInspirationSummary }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <InfoTooltip panel={<HolderListPanel label="Heroic Inspiration" holders={summary.holders} />}>
        <span className="text-slate-300">Heroic Inspiration</span>
      </InfoTooltip>
      <span className="font-medium text-slate-100">
        {summary.withInspiration} / {summary.partySize}
      </span>
    </div>
  );
}

/** Same hover-hint content as `ResourceMeter` on the character card (name/source/description) — resources aren't duplicated data here, just a different view of the same fields. */
function ResourceHintPanel({ entry }: { entry: PartyResourceEntry }) {
  return (
    <div className="space-y-1">
      <p className="font-medium text-slate-100">{entry.resourceName}</p>
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
      <span className={`shrink-0 whitespace-nowrap font-medium ${RESOURCE_STATUS_CLASS[entry.status]}`}>
        {entry.current}/{entry.max}
      </span>
      <CharacterChip name={entry.characterName} avatarUrl={entry.avatarUrl} />
    </div>
  );
}

/**
 * Spell Slots & Resources — slots first (party-wide totals per level, always
 * shown as plain numbers here rather than the dot meter used on a
 * character's own card, since a party total can run well past a
 * single-character's usual single-digit max), then every limited-use
 * resource in the party.
 */
function SpellSlotsResourcesPanel({ characters }: { characters: Character[] }) {
  const spellSlots = computePartySpellSlotSummary(characters);
  const inspiration = computeHeroicInspirationSummary(characters);
  const resources = computePartyResourceSummary(characters);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-black/20">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Spell Slots &amp; Resources</h3>

      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">Spell Slots</p>
      {!spellSlots ? (
        <p className="text-sm text-slate-600">No spell slots in the party.</p>
      ) : (
        <>
          <div className="space-y-1">
            {spellSlots.levels.map((l) => (
              <div key={l.level} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-300">{ordinalLevel(l.level)} Level</span>
                <span className="font-medium text-slate-100">
                  {l.current}/{l.max}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-1 text-right text-xl font-bold text-slate-100">
            {spellSlots.totalCurrent} / {spellSlots.totalMax}
          </p>
        </>
      )}

      <p className="mb-1 mt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-600">Heroic Inspiration</p>
      <HeroicInspirationRow summary={inspiration} />

      <p className="mb-1 mt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-600">Resources</p>
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
  return (
    <div className="flex items-center gap-3 py-1 text-sm">
      <span className="min-w-0 flex-1 truncate text-slate-300">{entry.name}</span>
      <span className="shrink-0 font-medium text-slate-100">x{entry.totalQuantity}</span>
      <span className="flex shrink-0 items-center gap-0.5">
        {entry.holders.map((h) => (
          <CharacterChip
            key={h.characterId}
            name={h.characterName}
            avatarUrl={h.avatarUrl}
            title={h.quantity > 1 ? `${h.characterName} x${h.quantity}` : h.characterName}
          />
        ))}
      </span>
    </div>
  );
}

/**
 * Grouped by category (see `computeCriticalInventoryHighlights`) —
 * deliberately not the full party inventory, `InventoryOverview` already
 * covers that. Rendered inside the Inventory section rather than Party
 * Toolkit — it's a curated view of inventory data, not party-wide combat
 * reference info, so it reads more naturally next to the full item list.
 */
export function CriticalItemsPanel({ characters }: { characters: Character[] }) {
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

/** Same idea as `SkillAllScoresPanel` — every character who has this sense, with their own range, ranked implicitly by the row's own "Best" chip already answering the top one. */
function SenseHolderPanel({ label, holders }: { label: string; holders: SenseHolder[] }) {
  return (
    <div className="space-y-1">
      <p className="font-medium text-slate-100">{label}</p>
      {holders.length === 0 ? (
        <p className="text-slate-100">No one currently has it.</p>
      ) : (
        <ul className="space-y-0.5">
          {holders.map((h) => (
            <li key={h.characterId} className="flex items-center justify-between gap-4">
              <span className="min-w-0 truncate">{h.characterName}</span>
              <span className="shrink-0 text-slate-100">{h.range} ft</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SenseRow({ entry }: { entry: SenseCoverageEntry }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <InfoTooltip panel={<SenseHolderPanel label={entry.name} holders={entry.holders} />}>
        <span className="text-slate-300">{entry.name}</span>
      </InfoTooltip>
      <span className="flex items-center gap-2">
        <span className={entry.count === 0 ? "text-slate-600" : "font-medium text-slate-100"}>
          {entry.count}/{entry.partySize}
        </span>
        {entry.best && (
          <span title={`${entry.best.characterName} — ${entry.best.range} ft`} className="flex items-center gap-1">
            <CharacterChip name={entry.best.characterName} avatarUrl={entry.best.avatarUrl} />
            <span className="text-xs text-slate-500">{entry.best.range} ft</span>
          </span>
        )}
      </span>
    </div>
  );
}

/** Short rules reminder for what the spell actually reveals — the row itself only says "available", not what that's useful for. */
const UTILITY_SPELL_BLURBS: Record<string, string> = {
  "Detect Magic": "Sense the presence of magic within 30 ft, and learn its school of magic if you study the source for a moment.",
  "See Invisibility": "See invisible creatures and objects as if they were visible, and see into the Ethereal Plane, for the spell's duration.",
};

function UtilitySpellHintPanel({ entry }: { entry: UtilitySpellAvailability }) {
  return (
    <div className="space-y-1">
      <p className="font-medium text-slate-100">{entry.name}</p>
      <p>{UTILITY_SPELL_BLURBS[entry.name]}</p>
      {entry.characters.length > 0 && (
        <ul className="space-y-0.5 pt-1">
          {entry.characters.map((c) => (
            <li key={c.characterId} className="text-slate-100">
              {c.characterName}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Same "gray at zero, plain white otherwise" convention as `DefenseRow` — no green highlight, so availability reads the same way across every coverage row in this panel instead of standing out inconsistently. */
function UtilitySpellRow({ entry }: { entry: UtilitySpellAvailability }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <InfoTooltip panel={<UtilitySpellHintPanel entry={entry} />}>
        <span className="text-slate-300">{entry.name} available</span>
      </InfoTooltip>
      {entry.available ? (
        <span className="flex items-center gap-1">
          {entry.characters.map((c) => (
            <CharacterChip key={c.characterId} name={c.characterName} avatarUrl={c.avatarUrl} />
          ))}
        </span>
      ) : (
        <span className="text-slate-600">No</span>
      )}
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

/** Same hover-hint idea as a skill row's `SkillAllScoresPanel` — just who has it, no modifier column needed here. Handles the empty case (e.g. nobody currently holding Heroic Inspiration) since most callers only ever pass a non-empty list, but that one can't guarantee it. */
function HolderListPanel({ label, holders }: { label: string; holders: DefenseHolder[] }) {
  return (
    <div className="space-y-1">
      <p className="font-medium text-slate-100">{label}</p>
      {holders.length === 0 ? (
        <p className="text-slate-100">No one currently has it.</p>
      ) : (
        <ul className="space-y-0.5">
          {holders.map((h) => (
            <li key={h.characterId} className="text-slate-100">
              {h.characterName}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DefenseRow({ entry }: { entry: DefenseCoverageEntry }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <InfoTooltip panel={<HolderListPanel label={entry.name} holders={entry.holders} />}>
        <span className="text-slate-300">{entry.name}</span>
      </InfoTooltip>
      <span className="font-medium text-slate-100">
        {entry.count} / {entry.partySize}
      </span>
    </div>
  );
}

/**
 * Only resistance/immunity types the party actually has — see
 * `computeResistanceCoverage`/`computeConditionProtectionCoverage`. No
 * pinned "campaign-relevant" list anymore: a DM already knows what matters
 * for their campaign, and showing every possible type at 0/partySize just
 * added noise this simplified view drops.
 */
function DefensesPanel({ characters }: { characters: Character[] }) {
  const resistances = computeResistanceCoverage(characters);
  const immunities = computeConditionProtectionCoverage(characters);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-black/20">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Defense Coverage</h3>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">Resistances</p>
      {resistances.length === 0 ? (
        <p className="text-sm text-slate-600">No resistances in the party.</p>
      ) : (
        <div className="space-y-1.5">
          {resistances.map((entry) => (
            <DefenseRow key={entry.name} entry={entry} />
          ))}
        </div>
      )}
      <p className="mb-1.5 mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-600">Immunities</p>
      {immunities.length === 0 ? (
        <p className="text-sm text-slate-600">No immunities in the party.</p>
      ) : (
        <div className="space-y-1.5">
          {immunities.map((entry) => (
            <DefenseRow key={entry.name} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

function LanguageRow({ entry }: { entry: LanguageCoverageEntry }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <InfoTooltip panel={<HolderListPanel label={entry.name} holders={entry.holders} />}>
        <span className="text-slate-300">{entry.name}</span>
      </InfoTooltip>
      <span className="font-medium text-slate-100">{entry.count}</span>
    </div>
  );
}

function ToolRow({ entry }: { entry: ToolCoverageEntry }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <InfoTooltip panel={<HolderListPanel label={entry.name} holders={entry.holders} />}>
        <span className="text-slate-300">{entry.name}</span>
      </InfoTooltip>
      <span className="font-medium text-slate-100">{entry.count}</span>
    </div>
  );
}

/** Only languages/tools actually present in the party — no pinned list anymore, see `computeLanguageCoverage`/`computeToolCoverage`. Both rows share the same shape: name with a hover hint listing who has it (same pattern as a skill row), count on the right. */
function LanguagesToolsPanel({ characters }: { characters: Character[] }) {
  const languages = computeLanguageCoverage(characters);
  const tools = computeToolCoverage(characters);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-black/20">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Languages &amp; Tools</h3>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">Languages</p>
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
      {tools.length === 0 ? (
        <p className="text-sm text-slate-600">No tool proficiencies tracked.</p>
      ) : (
        <div className="space-y-1.5">
          {tools.map((entry) => (
            <ToolRow key={entry.name} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

interface CoverageNameGroup {
  name: string;
  holders: CoverageEntry[];
}

/** Groups same-named entries (multiple characters knowing the same spell/ability collapse into one pill with several chips) instead of one line per name-character pair — this is most of where the old layout's height came from. */
function groupCoverageEntries(entries: CoverageEntry[]): CoverageNameGroup[] {
  const byName = new Map<string, CoverageNameGroup>();
  for (const entry of entries) {
    if (!byName.has(entry.name)) byName.set(entry.name, { name: entry.name, holders: [] });
    byName.get(entry.name)!.holders.push(entry);
  }
  return Array.from(byName.values());
}

/** Heroic Inspiration is the one entry with no real character behind it (`characterName` is a party-wide ratio) — rendered as plain text instead of a chip cluster. */
/** One ability per line — name on the left, its holders' chips right-aligned to the category column's edge, same "name … value" row shape as every other coverage row in the panel. */
function CoveragePill({ group }: { group: CoverageNameGroup }) {
  if (group.holders.length === 1 && !group.holders[0].characterId) {
    return (
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="min-w-0 truncate text-slate-300">{group.name}</span>
        <span className="shrink-0 text-slate-500">{group.holders[0].characterName}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="min-w-0 truncate text-slate-300">{group.name}</span>
      <span className="flex shrink-0 items-center gap-0.5">
        {group.holders.map((h) => (
          <CharacterChip key={h.characterId} name={h.characterName} avatarUrl={h.avatarUrl} />
        ))}
      </span>
    </div>
  );
}

function CoverageCategoryBlock({ category, entries }: { category: CoverageCategory; entries: CoverageEntry[] }) {
  const groups = groupCoverageEntries(entries);
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">{category}</p>
      {groups.length === 0 ? (
        <p className="text-sm text-slate-600">none</p>
      ) : (
        <div className="space-y-0.5">
          {groups.map((g) => (
            <CoveragePill key={g.name} group={g} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Which party-level problems the party can solve via spells/abilities — see
 * `computeSpellAbilityCoverage`'s doc comment for the matching rules. Only
 * names and owners are shown, never descriptions (the spec is explicit
 * about this — the character card is where the full spell/ability text
 * lives). Compact by default (only categories with at least one match);
 * "show all" reveals the rest with an explicit "none", same show/hide
 * pattern as the Skills panel's "show all skills".
 */
function CoveragePanel({ characters }: { characters: Character[] }) {
  const [showAll, setShowAll] = useState(false);
  const coverage = computeSpellAbilityCoverage(characters);
  const categoriesWithEntries = COVERAGE_CATEGORY_ORDER.filter((category) => coverage[category].length > 0);
  const categories = showAll ? COVERAGE_CATEGORY_ORDER : categoriesWithEntries;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-black/20">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Spell &amp; Ability Coverage</h3>
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="shrink-0 text-xs text-sky-400 hover:text-sky-300"
        >
          {showAll ? "Show fewer" : `Show all ${COVERAGE_CATEGORY_ORDER.length} categories`}
        </button>
      </div>
      {categories.length === 0 ? (
        <p className="text-sm text-slate-600">
          No known spells or abilities match a tracked coverage category yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <CoverageCategoryBlock key={category} category={category} entries={coverage[category]} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Party Toolkit — Iterations 1-4: Skills, Passives, Spell Slots, Resources,
 * Senses, Defenses, Languages & Tools, Spell & Ability Coverage.
 * Reference-only: no dice roller, no roll buttons, no success/fail
 * resolution. `characters` is expected to already be filtered to the
 * visible roster (same set shown in the Party row above it). Critical
 * Items lives in the Inventory section instead — see `CriticalItemsPanel`.
 */
export function PartyToolkit({ characters }: { characters: Character[] }) {
  const passives = computePartyPassiveSummary(characters);

  if (characters.length === 0 || !passives) {
    return <p className="text-sm text-slate-600">No characters yet.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SkillsPanel characters={characters} passives={passives} />
        <SpellSlotsResourcesPanel characters={characters} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SensesPanel characters={characters} />
        <DefensesPanel characters={characters} />
        <LanguagesToolsPanel characters={characters} />
      </div>
      <CoveragePanel characters={characters} />
    </div>
  );
}
