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
  HeroicInspirationSummary,
  LanguageCoverageEntry,
  PartyPassiveSummary,
  PartyResourceEntry,
  PassiveCharacterScore,
  PassiveStatSummary,
  ResourceStatus,
  SenseCoverageEntry,
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
import { RecoveryBadge } from "./ui/RecoveryBadge";

const STATUS_DOT_CLASS: Record<SkillCoverageStatus, string> = {
  Strong: "bg-emerald-400",
  Medium: "bg-amber-400",
  Weak: "bg-slate-600",
};

const STATUS_HINT: Record<SkillCoverageStatus, string> = {
  Strong: "Strong coverage — 3+ characters proficient",
  Medium: "Medium coverage — 2 characters proficient",
  Weak: "Weak coverage — 0-1 characters proficient",
};

/** Replaces the old Strong/Medium/Weak text chip — same three-tier read, but small enough to sit next to the best/weakest chips instead of competing with them for attention. */
function StatusDot({ status }: { status: SkillCoverageStatus }) {
  return <span title={STATUS_HINT[status]} className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT_CLASS[status]}`} />;
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
            <span className={`shrink-0 whitespace-nowrap ${s.proficient ? "text-emerald-400" : "text-slate-400"}`}>
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
      <StatusDot status={entry.status} />
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
            <span className={`shrink-0 whitespace-nowrap ${s.proficient ? "text-emerald-400" : "text-slate-400"}`}>
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
      <StatusDot status={summary.status} />
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

/** A handful of distinguishable colors, picked deterministically per name — not tied to any character identity elsewhere in the app, just enough variety to tell rows apart at a glance in a dense list. */
const CHARACTER_CHIP_COLORS = [
  "border-sky-700 bg-sky-950/40 text-sky-300",
  "border-emerald-700 bg-emerald-950/40 text-emerald-300",
  "border-amber-700 bg-amber-950/40 text-amber-300",
  "border-rose-700 bg-rose-950/40 text-rose-300",
  "border-violet-700 bg-violet-950/40 text-violet-300",
  "border-teal-700 bg-teal-950/40 text-teal-300",
];

function chipColorClass(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return CHARACTER_CHIP_COLORS[Math.abs(hash) % CHARACTER_CHIP_COLORS.length];
}

/**
 * A compact stand-in for a full character name — their avatar if one's set,
 * otherwise the first letter of their name in a small colored circle, full
 * name on hover either way. Only needs a name + optional avatar (not a full
 * `Character`), so it works anywhere in the Party Toolkit that names an
 * owner inside a tight row instead of a wide, truncating name column.
 */
function CharacterInitial({ name, avatarUrl }: { name: string; avatarUrl?: string }) {
  const [failed, setFailed] = useState(false);
  if (avatarUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- external/base64 sources, not worth configuring next/image for a small chip
      <img
        src={avatarUrl}
        alt=""
        title={name}
        onError={() => setFailed(true)}
        className="h-5 w-5 shrink-0 rounded-full border border-slate-700 object-cover"
      />
    );
  }
  return (
    <span
      title={name}
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold ${chipColorClass(name)}`}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

/** Best/weakest character for a skill or passive stat, shown as their chip + an up/down arrow — `hint` carries the full "Best: Name +N" detail as a native tooltip, keeping the row itself compact. */
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
  return (
    <span title={hint} className="flex shrink-0 items-center gap-0.5">
      <CharacterInitial name={characterName} avatarUrl={avatarUrl} />
      <span className={`text-xs ${direction === "up" ? "text-emerald-400" : "text-slate-500"}`}>
        {direction === "up" ? "↑" : "↓"}
      </span>
    </span>
  );
}

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
      <CharacterInitial name={entry.characterName} avatarUrl={entry.avatarUrl} />
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
          <p className="mt-1 text-right text-xs text-slate-400">
            Spell Power:{" "}
            <span className="font-medium text-slate-100">
              {spellSlots.totalCurrent} / {spellSlots.totalMax}
            </span>
          </p>
        </>
      )}

      <p className="mb-1 mt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-600">Resources</p>
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

function CoverageCategoryBlock({ category, entries }: { category: CoverageCategory; entries: CoverageEntry[] }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">{category}</p>
      {entries.length === 0 ? (
        <p className="text-sm text-slate-600">none</p>
      ) : (
        <ul className="space-y-0.5">
          {entries.map((entry) => (
            <li key={`${entry.name}-${entry.characterName}`} className="truncate text-sm text-slate-300">
              {entry.name} <span className="text-slate-500">— {entry.characterName}</span>
            </li>
          ))}
        </ul>
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
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
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
 * Critical Items, Senses, Defenses, Languages & Tools, Spell & Ability
 * Coverage. Reference-only: no dice roller, no roll buttons, no
 * success/fail resolution. `characters` is expected to already be filtered
 * to the visible roster (same set shown in the Party row above it).
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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <CriticalItemsPanel characters={characters} />
        <SensesPanel characters={characters} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DefensesPanel characters={characters} />
        <LanguagesToolsPanel characters={characters} />
      </div>
      <CoveragePanel characters={characters} />
    </div>
  );
}
