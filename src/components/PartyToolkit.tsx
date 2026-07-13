"use client";

import { useState } from "react";
import {
  Character,
  RECOVERY_LABELS,
  SKILL_ABILITY,
  SKILL_DESCRIPTIONS,
  SKILL_LABELS,
  SkillName,
  formatModifier,
  ordinalLevel,
} from "@/lib/types";
import { ReactNode } from "react";
import {
  COVERAGE_CATEGORY_ORDER,
  CoverageCategory,
  CoverageEntry,
  CoverageHolder,
  HeroicInspirationSummary,
  NamedCoverageEntry,
  PartyPassiveSummary,
  PartyResourceEntry,
  PartySpellSlotHolder,
  PassiveCharacterScore,
  PassiveStatSummary,
  SenseCoverageEntry,
  SenseHolder,
  SkillCharacterScore,
  SkillCoverageStatus,
  SkillOverviewEntry,
  UtilitySpellAvailability,
  computeConditionProtectionCoverage,
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
import { RichText } from "./RichText";
import { CharacterChip, CharacterChipRow } from "./ui/CharacterChip";
import { RecoveryBadge } from "./ui/RecoveryBadge";
import { SectionLabel, ToolkitCard } from "./ui/ToolkitCard";

/** Shared green/amber/red usage-danger palette (same tiers `HpBar` uses) — full or better reads plain white, half or less reads amber, empty reads red. Applied to every current/max value in this file: spell slots, Heroic Inspiration, and limited-use resources. */
function usageColorClass(current: number, max: number): string {
  if (max <= 0 || current <= 0) return "text-red-400";
  if (current <= max / 2) return "text-amber-400";
  return "text-white";
}

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
 * The shared shape behind every hover-hint panel in this file: a title, an
 * optional description (rules text or a short explainer), then an optional
 * `<ul>` of rows — same "description first, then who has it" order the DM
 * asked for everywhere. `emptyText` covers the few panels that show a
 * fallback line instead of an empty list ("No one currently has it.").
 *
 * Every row defaults to plain white text (`<li>`'s own color, inherited by
 * any span inside that doesn't set its own) — noticeably brighter than the
 * panel's dim `text-slate-300` description/prose, so a character name stays
 * scannable at a glance instead of blending into the surrounding text. A
 * `renderRow` callback only needs its own color class for an actual
 * semantic override (proficient → green, low resource → amber/red).
 */
function HintPanel<T>({
  title,
  description,
  rows = [],
  rowKey,
  renderRow,
  rowClassName = "",
  emptyText,
}: {
  title: ReactNode;
  description?: ReactNode;
  rows?: T[];
  rowKey?: (row: T) => string;
  renderRow?: (row: T) => ReactNode;
  rowClassName?: string;
  emptyText?: string;
}) {
  return (
    <div className="space-y-1">
      <p className="font-medium text-white">{title}</p>
      {description && <p className="text-slate-300">{description}</p>}
      {rows.length > 0 ? (
        <ul className="space-y-0.5 pt-1">
          {rows.map((row) => (
            <li key={rowKey!(row)} className={`text-white ${rowClassName}`}>
              {renderRow!(row)}
            </li>
          ))}
        </ul>
      ) : (
        emptyText && <p className="text-white">{emptyText}</p>
      )}
    </div>
  );
}

/**
 * Replaces the old Strong/Medium/Weak text chip (too wide) and the dot that
 * replaced it (too small to read anything from at a glance) — the actual
 * `proficientCount / partySize` ratio, colored by the same tier, is exactly
 * as compact as the dot but tells the DM the real numbers instead of making
 * them hover for it.
 */
function CoverageBadge({ proficientCount, partySize, status }: { proficientCount: number; partySize: number; status: SkillCoverageStatus }) {
  return (
    <InfoTooltip hoverOnly panel={<p className="text-white">{STATUS_LABEL[status]} — {proficientCount} of {partySize} proficient</p>}>
      <span
        className={`shrink-0 rounded-md border px-1.5 py-0.5 text-center text-xs font-semibold tabular-nums ${STATUS_BADGE_CLASS[status]}`}
      >
        {proficientCount}/{partySize}
      </span>
    </InfoTooltip>
  );
}

/** Shared row shape for the two "name + colored modifier" hint panels below (skills and passives): green when proficient/expertise, otherwise inherits the row's own white. */
function scoreRowClass(proficient: boolean): string {
  return `shrink-0 whitespace-nowrap ${proficient ? "text-emerald-400" : ""}`;
}

/** The hover hint's content for a skill row — same short description shown on the character's own card (`SKILL_DESCRIPTIONS`, see `SkillPanel`), then every character's modifier, ranked, with proficiency called out the same way the row's own coverage count does. */
function SkillAllScoresPanel({ skill, all }: { skill: SkillName; all: SkillCharacterScore[] }) {
  return (
    <HintPanel
      title={
        <>
          {SKILL_LABELS[skill]} <span className="text-slate-500">({SKILL_ABILITY[skill].toUpperCase()})</span>
        </>
      }
      description={SKILL_DESCRIPTIONS[skill]}
      rows={all}
      rowKey={(s) => s.characterId}
      rowClassName="flex items-center justify-between gap-4"
      renderRow={(s) => (
        <>
          <span className="min-w-0 truncate">{s.characterName}</span>
          <span className={scoreRowClass(s.proficient)}>
            {formatModifier(s.modifier)}
            {s.expertise ? " · expertise" : s.proficient ? " · proficient" : ""}
          </span>
        </>
      )}
    />
  );
}

function SkillRow({ entry }: { entry: SkillOverviewEntry }) {
  const label = SKILL_LABELS[entry.skill];
  return (
    <div className="flex items-center gap-3 py-1.5 text-sm">
      <div className="min-w-0 flex-1">
        <InfoTooltip panel={<SkillAllScoresPanel skill={entry.skill} all={entry.all} />}>
          <span className="text-slate-300">{label}</span>
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

/** Same hover-hint idea as `SkillAllScoresPanel`, for a passive stat — leads with the underlying skill's own description (proficiency here means proficient in that skill, not in the passive stat itself, which isn't a real game concept), plus a one-line reminder of how a passive score is derived. */
function PassiveAllScoresPanel({ label, skill, all }: { label: string; skill: SkillName; all: PassiveCharacterScore[] }) {
  return (
    <HintPanel
      title={label}
      description={`${SKILL_DESCRIPTIONS[skill]} Equal to 10 + the modifier, with no roll.`}
      rows={all}
      rowKey={(s) => s.characterName}
      rowClassName="flex items-center justify-between gap-4"
      renderRow={(s) => (
        <>
          <span className="min-w-0 truncate">{s.characterName}</span>
          <span className={scoreRowClass(s.proficient)}>
            {s.value}
            {s.proficient ? " · proficient" : ""}
          </span>
        </>
      )}
    />
  );
}

/** Same shape as `SkillRow` (name with a hover hint, best/weakest chips, status dot) — Passives is a subsection of the same Skills card, so the two need to read as one family of rows. Average/lowest are one hover away in the tooltip rather than crammed into a subtitle. */
function PassiveRow({ label, skill, summary }: { label: string; skill: SkillName; summary: PassiveStatSummary }) {
  return (
    <div className="flex items-center gap-3 py-1.5 text-sm">
      <div className="min-w-0 flex-1">
        <InfoTooltip panel={<PassiveAllScoresPanel label={label} skill={skill} all={summary.all} />}>
          <span className="text-slate-300">{label}</span>
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
    <ToolkitCard title="Skills">
      <SectionLabel>Passives</SectionLabel>
      <div className="divide-y divide-slate-800/60">
        <PassiveRow label="Passive Perception" skill="perception" summary={passives.perception} />
        <PassiveRow label="Passive Insight" skill="insight" summary={passives.insight} />
        <PassiveRow label="Passive Investigation" skill="investigation" summary={passives.investigation} />
      </div>

      <SectionLabel className="mt-4">Skills</SectionLabel>
      <div className="divide-y divide-slate-800/60">
        {skillEntries.map((entry) => (
          <SkillRow key={entry.skill} entry={entry} />
        ))}
      </div>
    </ToolkitCard>
  );
}

/**
 * Best/weakest character for a skill or passive stat, shown as their chip +
 * an up/down arrow — `hint` carries the full "Best: Name +N" detail as our
 * own styled hover panel (not a native `title`, which is slow to appear and
 * only responds to a precise hover over the tiny glyph). Wrapped in a
 * bordered pill (not just a bare chip+glyph) so the whole thing reads as
 * one unit and gives the tooltip a real hit target to hover.
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
    <InfoTooltip hoverOnly panel={<p className="text-white">{hint}</p>}>
      <span
        className={`flex shrink-0 items-center gap-1 rounded-full border py-0.5 pl-0.5 pr-1.5 ${
          isUp ? "border-emerald-800 bg-emerald-950/30" : "border-red-800 bg-red-950/30"
        }`}
      >
        <CharacterChip name={characterName} avatarUrl={avatarUrl} />
        <span className={`text-sm font-bold leading-none ${isUp ? "text-emerald-400" : "text-red-400"}`}>
          {isUp ? "↑" : "↓"}
        </span>
      </span>
    </InfoTooltip>
  );
}

const HEROIC_INSPIRATION_DESCRIPTION =
  "Spend it to gain advantage on one attack roll, saving throw, or ability check.";

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

/**
 * Spell Slots & Resources — slots first (party-wide totals per level, always
 * shown as plain numbers here rather than the dot meter used on a
 * character's own card, since a party total can run well past a
 * single-character's usual single-digit max), then every limited-use
 * resource in the party.
 */
/** Per-character breakdown for a spell slot level — the row's hover hint, same idea as a skill row's per-character panel. */
function SpellSlotLevelPanel({ level, holders }: { level: number; holders: PartySpellSlotHolder[] }) {
  return (
    <HintPanel
      title={`${ordinalLevel(level)} Level`}
      rows={holders}
      rowKey={(h) => h.characterId}
      rowClassName="flex items-center justify-between gap-4"
      renderRow={(h) => (
        <>
          <span className="min-w-0 truncate">{h.characterName}</span>
          <span className={`shrink-0 whitespace-nowrap ${usageColorClass(h.current, h.max)}`}>
            {h.current}/{h.max}
          </span>
        </>
      )}
    />
  );
}

function SpellSlotsResourcesPanel({ characters }: { characters: Character[] }) {
  const spellSlots = computePartySpellSlotSummary(characters);
  const inspiration = computeHeroicInspirationSummary(characters);
  const resources = computePartyResourceSummary(characters);

  return (
    <ToolkitCard title="Spell Slots & Resources">
      <SectionLabel>Spell Slots</SectionLabel>
      {!spellSlots ? (
        <p className="text-sm text-slate-600">No spell slots in the party.</p>
      ) : (
        <div className="divide-y divide-slate-800/60">
          {spellSlots.levels.map((l) => (
            <div key={l.level} className="flex items-center justify-between gap-3 py-1 text-sm">
              <InfoTooltip panel={<SpellSlotLevelPanel level={l.level} holders={l.holders} />}>
                <span className="text-slate-300">{ordinalLevel(l.level)} Level</span>
              </InfoTooltip>
              <span className={`font-medium ${usageColorClass(l.current, l.max)}`}>
                {l.current}/{l.max}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3 py-1 text-sm">
            <span className="text-slate-300">Total</span>
            <span className={`font-medium ${usageColorClass(spellSlots.totalCurrent, spellSlots.totalMax)}`}>
              {spellSlots.totalCurrent}/{spellSlots.totalMax}
            </span>
          </div>
        </div>
      )}

      <SectionLabel className="mt-4">Heroic Inspiration</SectionLabel>
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
    </ToolkitCard>
  );
}

/** Short rules reminder for what the sense actually lets a character do — the row itself only says "X of Y", not what that's useful for. */
const SENSE_BLURBS: Record<string, string> = {
  Darkvision: "See in dim light within range as if it were bright light, and in darkness as if it were dim light (shades of gray only).",
  Blindsight: "Perceive its surroundings without relying on sight, within range.",
  Tremorsense: "Detect and pinpoint anything in contact with the ground within range, without seeing it.",
  Truesight: "See in normal and magical darkness, see invisible creatures/objects, see through illusions, and see a shapechanger's true form within range.",
};

/** Same idea as `SkillAllScoresPanel` — every character who has this sense, with their own range, ranked implicitly by the row's own "Best" chip already answering the top one. */
function SenseHolderPanel({ label, holders }: { label: string; holders: SenseHolder[] }) {
  return (
    <HintPanel
      title={label}
      description={SENSE_BLURBS[label]}
      rows={holders}
      rowKey={(h) => h.characterId}
      rowClassName="flex items-center justify-between gap-4"
      renderRow={(h) => (
        <>
          <span className="min-w-0 truncate">{h.characterName}</span>
          <span className="shrink-0">{h.range} ft</span>
        </>
      )}
      emptyText="No one currently has it."
    />
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
          <InfoTooltip
            hoverOnly
            panel={<p className="text-white">Best: {entry.best.characterName} — {entry.best.range} ft</p>}
          >
            <span className="flex items-center gap-1">
              <CharacterChip name={entry.best.characterName} avatarUrl={entry.best.avatarUrl} />
              <span className="text-xs text-slate-500">{entry.best.range} ft</span>
            </span>
          </InfoTooltip>
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
    <HintPanel
      title={entry.name}
      description={UTILITY_SPELL_BLURBS[entry.name]}
      rows={entry.characters}
      rowKey={(c) => c.characterId}
      renderRow={(c) => c.characterName}
    />
  );
}

/** Same "gray at zero, plain white otherwise" convention as `CoverageCountRow` — no green highlight, so availability reads the same way across every coverage row in this panel instead of standing out inconsistently. */
function UtilitySpellRow({ entry }: { entry: UtilitySpellAvailability }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <InfoTooltip panel={<UtilitySpellHintPanel entry={entry} />}>
        <span className="text-slate-300">{entry.name} available</span>
      </InfoTooltip>
      {entry.available ? (
        <CharacterChipRow holders={entry.characters} />
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
    <ToolkitCard title="Senses">
      <div className="space-y-1.5">
        {senses.map((entry) => (
          <SenseRow key={entry.name} entry={entry} />
        ))}
      </div>
      <div className="mt-3 space-y-1.5">
        {utility.map((entry) => (
          <UtilitySpellRow key={entry.name} entry={entry} />
        ))}
      </div>
    </ToolkitCard>
  );
}

/** Same hover-hint idea as a skill row's `SkillAllScoresPanel` — just who has it, no modifier column needed here. Handles the empty case (e.g. nobody currently holding Heroic Inspiration) since most callers only ever pass a non-empty list, but that one can't guarantee it. */
function HolderListPanel({ label, description, holders }: { label: string; description?: string; holders: CoverageHolder[] }) {
  return (
    <HintPanel
      title={label}
      description={description}
      rows={holders}
      rowKey={(h) => h.characterId}
      renderRow={(h) => h.characterName}
      emptyText="No one currently has it."
    />
  );
}

/** Shared row for resistances/immunities/languages/tools — all four reduce to the same `NamedCoverageEntry` shape (name, count, holders), so one row renders all of them: name with a hover hint listing who has it (same pattern as a skill row), count on the right. `description` is a short generic blurb of what this kind of entry means (a resistance halves damage, a tool adds proficiency, ...) — the entry's own `name` is the specific type/language/tool, not a describable "ability" on its own. */
function CoverageCountRow({ entry, description }: { entry: NamedCoverageEntry; description?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <InfoTooltip panel={<HolderListPanel label={entry.name} description={description} holders={entry.holders} />}>
        <span className="text-slate-300">{entry.name}</span>
      </InfoTooltip>
      <span className="font-medium text-slate-100">{entry.count}</span>
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
const RESISTANCE_DESCRIPTION = "Takes half damage from this damage type.";
const IMMUNITY_DESCRIPTION = "Takes no damage or effect from this immunity.";

function DefensesPanel({ characters }: { characters: Character[] }) {
  const resistances = computeResistanceCoverage(characters);
  const immunities = computeConditionProtectionCoverage(characters);

  return (
    <ToolkitCard title="Defense Coverage">
      <SectionLabel>Resistances</SectionLabel>
      {resistances.length === 0 ? (
        <p className="text-sm text-slate-600">No resistances in the party.</p>
      ) : (
        <div className="space-y-1.5">
          {resistances.map((entry) => (
            <CoverageCountRow key={entry.name} entry={entry} description={RESISTANCE_DESCRIPTION} />
          ))}
        </div>
      )}
      <SectionLabel className="mt-3">Immunities</SectionLabel>
      {immunities.length === 0 ? (
        <p className="text-sm text-slate-600">No immunities in the party.</p>
      ) : (
        <div className="space-y-1.5">
          {immunities.map((entry) => (
            <CoverageCountRow key={entry.name} entry={entry} description={IMMUNITY_DESCRIPTION} />
          ))}
        </div>
      )}
    </ToolkitCard>
  );
}

/** Only languages/tools actually present in the party — no pinned list anymore, see `computeLanguageCoverage`/`computeToolCoverage`. */
const LANGUAGE_DESCRIPTION = "Can speak, read, and write this language.";
const TOOL_DESCRIPTION = "Adds their proficiency bonus to ability checks made using this tool.";

function LanguagesToolsPanel({ characters }: { characters: Character[] }) {
  const languages = computeLanguageCoverage(characters);
  const tools = computeToolCoverage(characters);

  return (
    <ToolkitCard title="Languages & Tools">
      <SectionLabel>Languages</SectionLabel>
      {languages.length === 0 ? (
        <p className="text-sm text-slate-600">No languages tracked.</p>
      ) : (
        <div className="space-y-1.5">
          {languages.map((entry) => (
            <CoverageCountRow key={entry.name} entry={entry} description={LANGUAGE_DESCRIPTION} />
          ))}
        </div>
      )}
      <SectionLabel className="mt-3">Tools</SectionLabel>
      {tools.length === 0 ? (
        <p className="text-sm text-slate-600">No tool proficiencies tracked.</p>
      ) : (
        <div className="space-y-1.5">
          {tools.map((entry) => (
            <CoverageCountRow key={entry.name} entry={entry} description={TOOL_DESCRIPTION} />
          ))}
        </div>
      )}
    </ToolkitCard>
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

/** Leads with the spell's/feature's own rules text (same source the character's own card shows), then who has it — same "description first, then characters" order as every other hint panel in this file. */
function CoverageHintPanel({ group }: { group: CoverageNameGroup }) {
  const holdersWithCharacter = group.holders.filter((h) => h.characterId);
  const description = group.holders.find((h) => h.description)?.description;
  return (
    <HintPanel
      title={group.name}
      description={description && <RichText text={description} />}
      rows={holdersWithCharacter}
      rowKey={(h) => h.characterId!}
      renderRow={(h) => h.characterName}
    />
  );
}

/** Heroic Inspiration is the one entry with no real character behind it (`characterName` is a party-wide ratio) — rendered as plain text instead of a chip cluster. Its hover hint uses the same `HolderListPanel` as every other "who has it" row, listing whoever currently holds it (the row's own `holders`, threaded through from `computeHeroicInspirationSummary`), not just the description. One ability per line — name on the left, its holders' chips right-aligned to the category column's edge, same "name … value" row shape as every other coverage row in the panel. */
function CoveragePill({ group }: { group: CoverageNameGroup }) {
  if (group.holders.length === 1 && !group.holders[0].characterId) {
    const entry = group.holders[0];
    return (
      <div className="flex items-center justify-between gap-3 py-1 text-sm">
        <div className="min-w-0 flex-1">
          <InfoTooltip
            panel={
              <HolderListPanel label={group.name} description={HEROIC_INSPIRATION_DESCRIPTION} holders={entry.holders ?? []} />
            }
          >
            <span className="text-slate-300">{group.name}</span>
          </InfoTooltip>
        </div>
        <span className="shrink-0 text-slate-500">{entry.characterName}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between gap-3 py-1 text-sm">
      <div className="min-w-0 flex-1">
        <InfoTooltip panel={<CoverageHintPanel group={group} />}>
          <span className="text-slate-300">{group.name}</span>
        </InfoTooltip>
      </div>
      <CharacterChipRow holders={group.holders} />
    </div>
  );
}

function CoverageCategoryBlock({ category, entries }: { category: CoverageCategory; entries: CoverageEntry[] }) {
  const groups = groupCoverageEntries(entries);
  return (
    <div>
      <SectionLabel>{category}</SectionLabel>
      {groups.length === 0 ? (
        <p className="text-sm text-slate-600">none</p>
      ) : (
        <div className="divide-y divide-slate-800/60">
          {groups.map((g) => (
            <CoveragePill key={g.name} group={g} />
          ))}
        </div>
      )}
    </div>
  );
}

const COVERAGE_COLUMNS = 4;

/**
 * Balances category blocks across `numColumns` real DOM columns (greedy
 * "always add to the currently-shortest column" bin-packing) instead of
 * letting CSS Grid auto-flow them into rows — a plain grid aligns every
 * cell in a row to its tallest neighbor, which left large empty gaps under
 * short categories once rows had 4 uneven-height blocks side by side. Each
 * category's "weight" is its own group count (or 1, for a "none" block),
 * so heavier categories get spread across different columns rather than
 * stacking together. Column contents are then re-sorted back into
 * `COVERAGE_CATEGORY_ORDER` so each column still reads top-to-bottom in
 * the same order a DM would scan the full category list.
 */
function distributeCoverageColumns(
  categories: CoverageCategory[],
  coverage: Record<CoverageCategory, CoverageEntry[]>,
  numColumns: number
): CoverageCategory[][] {
  const weight = (category: CoverageCategory) => Math.max(groupCoverageEntries(coverage[category]).length, 1) + 1;
  const columns: CoverageCategory[][] = Array.from({ length: numColumns }, () => []);
  const heights = new Array(numColumns).fill(0);

  for (const category of [...categories].sort((a, b) => weight(b) - weight(a))) {
    let shortest = 0;
    for (let i = 1; i < numColumns; i++) {
      if (heights[i] < heights[shortest]) shortest = i;
    }
    columns[shortest].push(category);
    heights[shortest] += weight(category);
  }

  for (const column of columns) {
    column.sort((a, b) => COVERAGE_CATEGORY_ORDER.indexOf(a) - COVERAGE_CATEGORY_ORDER.indexOf(b));
  }
  return columns;
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
  const columns = distributeCoverageColumns(categories, coverage, COVERAGE_COLUMNS);

  return (
    <ToolkitCard
      title="Spell & Ability Coverage"
      actions={
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="shrink-0 text-xs text-sky-400 hover:text-sky-300"
        >
          {showAll ? "Show fewer" : `Show all ${COVERAGE_CATEGORY_ORDER.length} categories`}
        </button>
      }
    >
      {categories.length === 0 ? (
        <p className="text-sm text-slate-600">
          No known spells or abilities match a tracked coverage category yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
          {columns.map(
            (column, i) =>
              column.length > 0 && (
                <div key={i} className="space-y-3">
                  {column.map((category) => (
                    <CoverageCategoryBlock key={category} category={category} entries={coverage[category]} />
                  ))}
                </div>
              )
          )}
        </div>
      )}
    </ToolkitCard>
  );
}

/**
 * Party Toolkit — Iterations 1-4: Skills, Passives, Spell Slots, Resources,
 * Senses, Defenses, Languages & Tools, Spell & Ability Coverage.
 * Reference-only: no dice roller, no roll buttons, no success/fail
 * resolution. `characters` is expected to already be filtered to the
 * visible roster (same set shown in the Party row above it).
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
