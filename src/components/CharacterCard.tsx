"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Character,
  abilityModifier,
  formatModifier,
  characterInfoLine,
  ordinalLevel,
  proficiencyBonus,
  QuickNote,
  savingThrowBonus,
  skillBonus,
  SKILL_ABBR,
  SKILL_ABILITY,
  SKILL_DESCRIPTIONS,
  SKILL_LABELS,
  SkillProficiency,
} from "@/lib/types";
import { DotMeter, ResourceMeter } from "./ResourceMeter";
import { SyncTimestamp } from "./SyncTimestamp";
import { CharacterAvatar } from "./CharacterAvatar";
import { InfoTooltip } from "./InfoTooltip";
import { CharacterDetailsModal } from "./CharacterDetailsModal";
import { getConditionInfo, getExhaustionEffect, EXHAUSTION_RULES_TEXT } from "@/lib/conditionInfo";
import { getSenseInfo } from "@/lib/senseInfo";

export const STAT_ORDER: Array<keyof Character["stats"]> = [
  "str",
  "dex",
  "con",
  "int",
  "wis",
  "cha",
];

export { ordinalLevel };

export function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SpeedIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M3 12h13M12 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function InitiativeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M13 2L4.5 14h5.5l-1.5 8L18 10h-5.5L13 2z" />
    </svg>
  );
}

export function ProficiencyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6L12 2z" />
    </svg>
  );
}

export function LanguageIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M4 5h16v10H8l-4 4V5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChallengeRatingIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path
        d="M12 3c-4 0-7 3-7 7 0 2.5 1.2 4.2 2.5 5.3V19h2.5v-2h4v2H17v-3.7c1.3-1.1 2.5-2.8 2.5-5.3 0-4-3-7-7-7z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9.5" cy="10" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="10" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ExhaustionIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="2" y="7" width="16" height="10" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 10.5v3" strokeLinecap="round" />
      <path d="M6 12h4" strokeLinecap="round" />
    </svg>
  );
}

export function ConditionsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5" strokeLinecap="round" />
      <circle cx="12" cy="16.2" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Placeholder icon for the Concentration status badge — a bullseye, standing in until custom art is added. */
export function ConcentrationIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0-1 13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1L6 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function HpBar({
  hp,
  maxHp,
  tempHp,
  isDown,
  deathSaves,
}: {
  hp: number;
  maxHp: number;
  tempHp: number;
  isDown: boolean;
  deathSaves?: { successes: number; failures: number };
}) {
  // Percentage-of-maxHp drives the danger-color thresholds (a character at
  // full real HP should never read as anything but healthy, regardless of
  // temp HP). Bar *widths* use a separate scale that grows past maxHp
  // whenever temp HP doesn't fit in the remaining headroom — e.g. at full
  // HP the "remaining room" is 0, so without this the temp segment would
  // get zero width and silently vanish instead of showing up as extra bar
  // stacked on past the end.
  const hpRatio = maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0;
  const barScale = Math.max(maxHp, hp + tempHp, 1);
  const hpBarPct = (hp / barScale) * 100;
  const tempBarPct = (tempHp / barScale) * 100;
  const hpColor = hpRatio > 50 ? "bg-emerald-500" : hpRatio > 25 ? "bg-amber-500" : "bg-red-600";
  const hpTextColor = hpRatio > 50 ? "text-emerald-400" : hpRatio > 25 ? "text-amber-400" : "text-red-400";

  return (
    <div>
      <div className="mb-1 flex min-h-8 items-baseline justify-between">
        <span className="text-sm text-slate-300">HP</span>
        {isDown && deathSaves ? (
          <span className="text-sm font-medium">
            <span className="text-slate-400">Death Saves:</span>{" "}
            <span className="text-emerald-400">✅ {deathSaves.successes}/3</span>
            <span className="text-slate-600"> · </span>
            <span className="text-red-400">❌ {deathSaves.failures}/3</span>
          </span>
        ) : (
          <span className="text-sm font-medium text-slate-100">
            <span className={`text-2xl font-bold ${hpTextColor}`}>{hp}</span>
            <span className="text-slate-500"> / {maxHp}</span>
            {tempHp > 0 && <span className="text-amber-400"> (+{tempHp} temp)</span>}
          </span>
        )}
      </div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full ${hpColor}`} style={{ width: `${hpBarPct}%` }} />
        <div className="h-full bg-amber-400" style={{ width: `${tempBarPct}%` }} />
      </div>
    </div>
  );
}

export function ExhaustionPanel({ level }: { level: number }) {
  const effect = getExhaustionEffect(level);
  return (
    <div className="space-y-2">
      <p>{EXHAUSTION_RULES_TEXT}</p>
      {effect && (
        <p className="border-t border-slate-700 pt-2 font-semibold text-amber-300">
          Right now (level {level}): −{effect.d20Penalty} to d20 rolls, speed −{effect.speedPenalty} ft.
        </p>
      )}
    </div>
  );
}

export function ConditionsPanel({ conditions }: { conditions: string[] }) {
  return (
    <div className="space-y-1.5">
      {conditions.map((condition) => {
        const info = getConditionInfo(condition);
        return (
          <div key={condition}>
            <p className="font-semibold text-slate-100">{condition}</p>
            {info && <p>{info}</p>}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Floating status badges pinned to the card's right edge, near the header —
 * a static "Exhaustion: 2" text line lower in the card is easy to miss at a
 * glance across a full party row, so anything currently active also gets a
 * pulsing badge up top. Half-overlaps the card's border (rather than sitting
 * fully inset) so it reads as a floating marker without eating into the
 * 16px content padding where the header/text actually starts.
 */
const STATUS_BADGE_SIZE = "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 bg-slate-950";

/**
 * Condition badges cycle through a curated, well-spaced set of hues by
 * position (not a name hash) — guarantees no two *simultaneously active*
 * conditions share a color as long as there are 8 or fewer of them, which a
 * hash could easily collide on. Deliberately excludes violet/red, since
 * those are already reserved for Concentration/Exhaustion.
 */
const CONDITION_HUES = [16, 48, 80, 112, 144, 176, 208, 320];

function ConditionBadge({ condition, index }: { condition: string; index: number }) {
  const hue = CONDITION_HUES[index % CONDITION_HUES.length];
  return (
    <span
      className={`${STATUS_BADGE_SIZE} status-ring-dynamic text-[10px] font-bold`}
      style={
        {
          borderColor: `hsl(${hue}, 75%, 55%)`,
          color: `hsl(${hue}, 85%, 78%)`,
          "--glow-1": `hsla(${hue}, 75%, 55%, 0.55)`,
          "--glow-2": `hsla(${hue}, 75%, 50%, 0.3)`,
          "--glow-3": `hsla(${hue}, 75%, 55%, 0.95)`,
          "--glow-4": `hsla(${hue}, 75%, 50%, 0.6)`,
        } as React.CSSProperties
      }
    >
      <InfoTooltip panel={<ConditionsPanel conditions={[condition]} />}>
        {condition.trim().slice(0, 2).toUpperCase()}
      </InfoTooltip>
    </span>
  );
}

function ExhaustionBadge({ level }: { level: number }) {
  return (
    <span className={`${STATUS_BADGE_SIZE} status-ring-red border-red-500 relative`}>
      <InfoTooltip panel={<ExhaustionPanel level={level} />}>
        <ExhaustionIcon className="h-[18px] w-[18px] text-red-300" />
      </InfoTooltip>
      <span className="pointer-events-none absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold leading-none text-white">
        {level}
      </span>
    </span>
  );
}

function ConcentrationBadge({ active, onToggle }: { active: boolean; onToggle?: () => void }) {
  const sizeCls = active ? "h-9 w-9" : "h-6 w-6";
  return (
    <button
      type="button"
      disabled={!onToggle}
      onClick={onToggle}
      aria-pressed={active}
      aria-label="Toggle Concentration"
      className={`flex ${sizeCls} shrink-0 items-center justify-center rounded-full border-2 bg-slate-950 transition-all ${
        active
          ? "concentrating-ring border-violet-500 text-violet-300"
          : "border-slate-700 text-slate-600 hover:border-violet-700 hover:text-violet-400"
      }`}
    >
      <InfoTooltip hoverOnly panel={<p>Toggle Concentration — currently {active ? "on" : "off"}.</p>}>
        <ConcentrationIcon className={active ? "h-[21px] w-[21px]" : "h-[15px] w-[15px]"} />
      </InfoTooltip>
    </button>
  );
}

/** Placeholder icon for the overflow badge — a plain ellipsis, standing in for whatever custom art replaces it later. */
function OverflowBadge({ conditions }: { conditions: string[] }) {
  return (
    <span className={`${STATUS_BADGE_SIZE} status-ring-gray border-slate-400 text-slate-200`}>
      <InfoTooltip panel={<ConditionsPanel conditions={conditions} />}>•••</InfoTooltip>
    </span>
  );
}

/** Total badge slots (concentration + exhaustion + conditions + the overflow badge itself) a card has room for before it gets crowded. */
const MAX_BADGES = 6;

function StatusBadges({
  conditions,
  exhaustion,
  concentrating,
  onToggleConcentration,
}: {
  conditions: string[];
  exhaustion: number;
  concentrating: boolean;
  onToggleConcentration?: () => void;
}) {
  const fixedCount = 1 + (exhaustion > 0 ? 1 : 0);
  const availableForConditions = MAX_BADGES - fixedCount;
  const overflowing = conditions.length > availableForConditions;
  const visibleConditions = overflowing ? conditions.slice(0, Math.max(0, availableForConditions - 1)) : conditions;
  const overflowConditions = overflowing ? conditions.slice(visibleConditions.length) : [];

  return (
    <>
      <ConcentrationBadge active={concentrating} onToggle={onToggleConcentration} />
      {exhaustion > 0 && <ExhaustionBadge level={exhaustion} />}
      {visibleConditions.map((condition, index) => (
        <ConditionBadge key={condition} condition={condition} index={index} />
      ))}
      {overflowConditions.length > 0 && <OverflowBadge conditions={overflowConditions} />}
    </>
  );
}

export function StatusRail({
  conditions,
  exhaustion,
  concentrating,
  onToggleConcentration,
}: {
  conditions: string[];
  exhaustion: number;
  concentrating: boolean;
  onToggleConcentration?: () => void;
}) {
  return (
    // Straddles the *top* border (row, centered, shifted up by half its own
    // height) instead of the right edge — a vertical rail there kept
    // colliding with something: the header/HP/AC text it ran alongside, the
    // next character's card in the row, or (in the details modal) just
    // reused the same crowded right-edge column. The top border has no
    // competing content on either side, so this is clear by construction
    // rather than by tuning offsets, and works the same in both the card and
    // the modal. Deliberately no `flex-wrap`: with enough simultaneous
    // badges to not fit one line, wrapping doubles this row's own height,
    // and since it's centered via a -50% transform (relative to its *own*
    // height) it then bled up far more than the party row's reserved top
    // padding — clipped (confirmed). `MAX_BADGES` above keeps a single line
    // from growing unbounded in the first place. `z-[5]`: below the page's
    // own `sticky top-0 z-10` header, so once the party row scrolls enough
    // that this rail's screen position reaches the header, it renders
    // behind it rather than on top (confirmed at z-10 it won that tie) —
    // but above `z-0`/`auto`, since every card is itself `position:
    // relative` with no explicit z-index and shares that stacking bucket.
    <div className="absolute inset-x-0 top-0 z-[5] flex -translate-y-1/2 items-center justify-center gap-3 px-6">
      <StatusBadges
        conditions={conditions}
        exhaustion={exhaustion}
        concentrating={concentrating}
        onToggleConcentration={onToggleConcentration}
      />
    </div>
  );
}

export function SkillPanel({ skill }: { skill: SkillProficiency }) {
  const advantageLabel =
    skill.advantage === "advantage" ? "Advantage" : skill.advantage === "disadvantage" ? "Disadvantage" : null;
  return (
    <div className="space-y-1">
      <p className="font-medium text-slate-100">
        {SKILL_LABELS[skill.name]} <span className="text-slate-500">({SKILL_ABILITY[skill.name].toUpperCase()})</span>
      </p>
      <p>{SKILL_DESCRIPTIONS[skill.name]}</p>
      {advantageLabel && (
        <p className={advantageLabel === "Advantage" ? "text-emerald-400" : "text-red-400"}>
          {advantageLabel}
          {skill.advantageNote ? `: ${skill.advantageNote}` : ""}
        </p>
      )}
    </div>
  );
}

/**
 * One icon + hover-hint + text row — the shared shape behind every quick
 * combat stat (AC/Speed/Initiative/Prof for a character; AC/Speed/
 * Initiative/Languages/CR for a creature). Both cards build their own stack
 * of these rather than each hand-rolling the icon/tooltip/truncate markup
 * per stat, so a future change to how one of these rows looks (spacing,
 * icon size, tooltip behavior) only has to happen here.
 *
 * The hint anchors to `label` only (e.g. just "AC"), not the value next to
 * it — consistent with every other hint in these cards except the ones on
 * skills/passive-perception/resources/spells/features, which hint the whole
 * pill or row since there's no separate "name" part to isolate there.
 */
export function IconStat({
  icon,
  panel,
  label,
  children,
  className = "",
}: {
  icon: React.ReactNode;
  panel: React.ReactNode;
  label: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`flex items-center gap-1.5 ${className}`}>
      {icon}
      <span className="flex min-w-0 flex-1 items-baseline gap-1">
        <InfoTooltip panel={panel}>{label}</InfoTooltip>
        <span className="min-w-0 flex-1 truncate">{children}</span>
      </span>
    </span>
  );
}

/**
 * The flex-wrap row of named senses (Darkvision: 60 ft, Blindsight: 30 ft...)
 * shown under the passive-skill pills — shared between a character's
 * structured `Sense[]` and a creature's stat block, which only has this same
 * shape once its free-text Senses line has been parsed back into it. The
 * hint anchors to the sense's name only, not the range next to it.
 */
export function SenseEntries({ senses }: { senses: Array<{ name: string; range: number }> }) {
  if (senses.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-300">
      {senses.map((s) => {
        const info = getSenseInfo(s.name);
        const nameLabel = <span className="text-slate-500">{s.name}:</span>;
        return (
          <span key={s.name} className="flex items-baseline gap-1">
            {info ? <InfoTooltip panel={<p>{info}</p>}>{nameLabel}</InfoTooltip> : nameLabel}
            <span>{s.range} ft</span>
          </span>
        );
      })}
    </div>
  );
}

export interface DamageInfoEntry {
  label: string;
  value?: string;
  panel: React.ReactNode;
}

/**
 * The Resist/Immune/Vulnerable (and, for a creature, Condition Immunities)
 * list — shared so both cards and the character details modal render it
 * from one place. Entries with no value are skipped; the hint anchors to
 * the label only, same convention as every other hint in these cards.
 */
export function DamageInfoList({ entries }: { entries: DamageInfoEntry[] }) {
  const visible = entries.filter((e) => e.value);
  if (visible.length === 0) return null;
  return (
    <div className="space-y-1 text-sm text-slate-300">
      {visible.map((e) => (
        // A `div`, not a `p` — the tooltip's own hint text is a `<p>`, and
        // React renders that panel into the DOM even while hidden (only its
        // `hidden`/`block` class toggles), so a `<p>` wrapper here would put
        // a `<p>` inside a `<p>` and trip a hydration mismatch (confirmed).
        <div key={e.label}>
          <InfoTooltip inline panel={e.panel}>
            <span className="text-slate-500">{e.label}:</span>
          </InfoTooltip>{" "}
          {e.value}
        </div>
      ))}
    </div>
  );
}

export function StatBox({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center rounded-md border py-1.5 ${
        highlight ? "border-amber-700 bg-amber-950/30" : "border-slate-800 bg-slate-800/40"
      }`}
    >
      <span className={`text-sm font-bold ${highlight ? "text-amber-300" : "text-slate-100"}`}>{value}</span>
      <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
    </div>
  );
}

/**
 * `panel` (not a native `title`) so every hoverable hint in the card shares
 * the same styled InfoTooltip affordance — the box itself can't carry
 * `truncate` (InfoTooltip's own inner span already does, and nesting it
 * under another truncating ancestor is the clipping bug this codebase hit
 * more than once), so truncation only applies in the no-panel fallback.
 */
export function Pill({
  panel,
  color = "slate",
  children,
}: {
  panel?: React.ReactNode;
  color?: "slate" | "sky" | "amber" | "orange" | "rose";
  children: React.ReactNode;
}) {
  const colorCls =
    color === "rose"
      ? "border-rose-600 bg-rose-950/40 text-rose-300"
      : color === "amber"
        ? "border-amber-700 bg-amber-950/30 text-amber-300"
        : color === "sky"
          ? "border-sky-700 bg-sky-950/40 text-sky-300"
          : color === "orange"
            ? "border-orange-700 bg-orange-950/30 text-orange-300"
            : "border-slate-800 bg-slate-800/40 text-slate-200";
  const boxCls = `rounded-md border px-2 py-1 text-center text-xs font-medium ${colorCls}`;
  if (!panel) {
    return <span className={`block truncate ${boxCls}`}>{children}</span>;
  }
  return (
    <span className={`block ${boxCls}`}>
      <InfoTooltip panel={panel}>{children}</InfoTooltip>
    </span>
  );
}

/**
 * Shared between the compact card and the Character Details modal (clicking
 * this header is what opens that modal) so both stay visually identical by
 * construction rather than by copy-pasted markup drifting apart over time.
 */
export function CharacterHeader({
  character,
  onClick,
}: {
  character: Character;
  onClick?: () => void;
}) {
  const c = character;
  const content = (
    <>
      <CharacterAvatar character={c} size="md" />
      <div className="min-w-0 flex-1">
        <h2
          title={c.name}
          className="truncate text-lg font-semibold text-slate-50 transition-colors group-hover:text-white"
        >
          {c.name}
        </h2>
        <p
          title={characterInfoLine(c)}
          className="truncate text-sm text-slate-400 transition-colors group-hover:text-slate-200"
        >
          {characterInfoLine(c)}
        </p>
        <p className="text-xs text-slate-500">Lvl {c.level}</p>
      </div>
      <span
        title={c.heroicInspiration ? "Heroic Inspiration: available" : "Heroic Inspiration: none"}
        className={`shrink-0 text-3xl leading-none ${c.heroicInspiration ? "text-amber-400" : "text-slate-700"}`}
      >
        ★
      </span>
    </>
  );

  if (!onClick) {
    return <div className="flex items-start gap-3">{content}</div>;
  }

  return (
    <button type="button" onClick={onClick} className="group flex w-full items-start gap-3 text-left">
      {content}
    </button>
  );
}

/** A single quick note row — click the text to edit it inline, "×" removes it. Delete stays visible (not hover-only) since this card is used on touch devices too. */
function QuickNoteRow({
  note,
  onSave,
  onDelete,
}: {
  note: QuickNote;
  onSave: (text: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.text);

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const trimmed = draft.trim();
            if (trimmed) onSave(trimmed);
            setEditing(false);
          } else if (e.key === "Escape") {
            setDraft(note.text);
            setEditing(false);
          }
        }}
        onBlur={() => {
          setDraft(note.text);
          setEditing(false);
        }}
        className="w-full rounded-md border border-sky-700 bg-slate-800 px-1.5 py-0.5 text-sm text-slate-100 outline-none"
      />
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-sm text-slate-300">
      <span className="h-1 w-1 shrink-0 rounded-full bg-slate-600" />
      <button
        type="button"
        onClick={() => {
          setDraft(note.text);
          setEditing(true);
        }}
        className="min-w-0 flex-1 break-words text-left hover:text-slate-100"
      >
        {note.text}
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete note"
        className="flex shrink-0 items-center text-slate-600 hover:text-red-400"
      >
        <TrashIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/**
 * Short, dashboard-added reminders — separate from the single long-form
 * `notes` field (edited only on the character's edit page) so a DM can jot
 * something down and clear it again without leaving the dashboard. Always
 * shows its header (with the add button) so the section itself never shifts
 * the rest of the card when notes are added/removed.
 */
function QuickNotesSection({
  character,
  onUpdate,
}: {
  character: Character;
  onUpdate?: (id: string, updates: Partial<Character>) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const notes = character.quickNotes ?? [];
  const sorted = notes.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  function commitAdd() {
    const text = draft.trim();
    if (!text) return;
    const note: QuickNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text,
      createdAt: new Date().toISOString(),
    };
    onUpdate?.(character.id, { quickNotes: [note, ...notes] });
    setDraft("");
  }

  function saveNote(id: string, text: string) {
    onUpdate?.(character.id, { quickNotes: notes.map((n) => (n.id === id ? { ...n, text } : n)) });
  }

  function deleteNote(id: string) {
    onUpdate?.(character.id, { quickNotes: notes.filter((n) => n.id !== id) });
  }

  return (
    <div className="border-t border-slate-800 pt-3">
      <div className="mb-1.5 flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-wide text-slate-500">Quick Notes</h3>
        {onUpdate && (
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            aria-label="Add a quick note"
            title="Add a quick note"
            className="rounded p-0.5 text-slate-500 hover:text-sky-400"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
        )}
      </div>
      {adding && (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitAdd();
            } else if (e.key === "Escape") {
              setDraft("");
              setAdding(false);
            }
          }}
          placeholder="Type a note, press Enter..."
          className="mb-1.5 w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-sky-600"
        />
      )}
      {sorted.length > 0 ? (
        <div className="space-y-1">
          {sorted.map((note) => (
            <QuickNoteRow
              key={note.id}
              note={note}
              onSave={(text) => saveNote(note.id, text)}
              onDelete={() => deleteNote(note.id)}
            />
          ))}
        </div>
      ) : (
        !adding && <p className="text-sm italic text-slate-600">No notes yet.</p>
      )}
    </div>
  );
}

export function CharacterCard({
  character,
  onRemove,
  onUpdate,
}: {
  character: Character;
  onRemove?: (id: string) => void;
  onUpdate?: (id: string, updates: Partial<Character>) => void;
}) {
  const c = character;
  const isDown = c.combat.hp <= 0;
  const [detailsOpen, setDetailsOpen] = useState(false);
  // Advantage display is temporarily hidden (parsing/data model stays intact) — see c.advantages.

  return (
    <div
      className={`relative rounded-xl border p-4 shadow-lg shadow-black/20 flex flex-col gap-4 ${
        c.concentrating
          ? "concentrating-ring border-violet-500 bg-violet-950/10"
          : "border-slate-800 bg-slate-900/60"
      }`}
    >
      <StatusRail
        conditions={c.combat.conditions}
        exhaustion={c.combat.exhaustion}
        concentrating={Boolean(c.concentrating)}
        onToggleConcentration={onUpdate ? () => onUpdate(c.id, { concentrating: !c.concentrating }) : undefined}
      />

      {/* Header */}
      <CharacterHeader character={c} onClick={() => setDetailsOpen(true)} />

      {!c.synced && c.dndBeyondUrl && (
        <div className="rounded-md bg-amber-950/40 border border-amber-900 px-2 py-1 text-xs text-amber-300">
          Not synced with D&D Beyond — fill in manually.
        </div>
      )}

      {/* Combat state */}
      <div>
        <HpBar
          hp={c.combat.hp}
          maxHp={c.combat.maxHp}
          tempHp={c.combat.tempHp}
          isDown={isDown}
          deathSaves={c.combat.deathSaves}
        />
        <div className="mt-2 grid grid-cols-2 gap-1.5 text-sm text-slate-300">
          <IconStat
            icon={<ShieldIcon className="h-3.5 w-3.5 shrink-0 text-slate-500" />}
            panel={<p>Armor Class — the number an attack roll must meet or beat to hit you.</p>}
            label="AC"
          >
            {c.combat.ac}
          </IconStat>
          <IconStat
            className="pl-2"
            icon={<SpeedIcon className="h-3.5 w-3.5 shrink-0 text-slate-500" />}
            panel={<p>Speed — how many feet you can move on your turn.</p>}
            label="Speed"
          >
            {c.combat.speed}ft
          </IconStat>
          <IconStat
            icon={<InitiativeIcon className="h-3.5 w-3.5 shrink-0 text-slate-500" />}
            panel={<p>Initiative — added to a d20 roll at the start of combat to determine turn order.</p>}
            label="Initiative"
          >
            {formatModifier(c.initiative)}
          </IconStat>
          <IconStat
            className="pl-2"
            icon={<ProficiencyIcon className="h-3.5 w-3.5 shrink-0 text-slate-500" />}
            panel={
              <p>Proficiency Bonus — added to attack rolls, saving throws, and skill checks you&apos;re proficient in.</p>
            }
            label="Prof"
          >
            {formatModifier(proficiencyBonus(c.level))}
          </IconStat>
        </div>
      </div>

      {/* Senses */}
      <div className="border-t border-slate-800 pt-3">
        <h3 className="text-xs uppercase tracking-wide text-slate-500 mb-1.5">Senses</h3>
        <div className="grid grid-cols-3 gap-1.5">
          <Pill panel={<p>Passive Perception — the score a hidden creature or object must beat to avoid your notice; also what Stealth checks are rolled against.</p>}>
            {SKILL_ABBR.perception} {c.combat.passivePerception}
          </Pill>
          <Pill panel={<p>Passive Investigation — used to notice details or work out clues without an active search.</p>}>
            {SKILL_ABBR.investigation} {c.combat.passiveInvestigation}
          </Pill>
          <Pill panel={<p>Passive Insight — used to sense deception or read intentions without rolling.</p>}>
            {SKILL_ABBR.insight} {c.combat.passiveInsight}
          </Pill>
        </div>
        {c.senses.length > 0 && (
          <div className="mt-4">
            <SenseEntries senses={c.senses} />
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="border-t border-slate-800 pt-3">
        <h3 className="text-xs uppercase tracking-wide text-slate-500 mb-1.5">Stats</h3>
        <div className="grid grid-cols-6 gap-1.5">
          {STAT_ORDER.map((key) => (
            <StatBox key={key} label={key.toUpperCase()} value={formatModifier(abilityModifier(c.stats[key]))} />
          ))}
        </div>
      </div>

      {/* Saving throws */}
      <div>
        <h3 className="text-xs uppercase tracking-wide text-slate-500 mb-1.5">Saving Throws</h3>
        <div className="grid grid-cols-6 gap-1.5">
          {STAT_ORDER.map((key) => (
            <StatBox
              key={key}
              label={key.toUpperCase()}
              value={formatModifier(savingThrowBonus(c, key))}
              highlight={c.savingThrowProficiencies.includes(key)}
            />
          ))}
        </div>
      </div>

      {/* Resistances / Immunities / Vulnerabilities */}
      <DamageInfoList
        entries={[
          { label: "Resist", value: c.resistances.join(", "), panel: <p>Resistance — takes half damage from this damage type.</p> },
          { label: "Immune", value: c.immunities.join(", "), panel: <p>Immunity — takes no damage from this damage type.</p> },
          {
            label: "Vulnerable",
            value: c.vulnerabilities.join(", "),
            panel: <p>Vulnerability — takes double damage from this damage type.</p>,
          },
        ]}
      />

      {/* Skills */}
      {c.skillProficiencies.length > 0 && (
        <div className="border-t border-slate-800 pt-3">
          <h3 className="text-xs uppercase tracking-wide text-slate-500 mb-1.5">Skills</h3>
          <div className="flex flex-wrap gap-1.5">
            {c.skillProficiencies.map((skill) => {
              const color = skill.expertise
                ? "rose"
                : skill.proficient
                  ? "amber"
                  : skill.halfProficiency
                    ? "orange"
                    : "slate";
              return (
                <Pill key={skill.name} panel={<SkillPanel skill={skill} />} color={color}>
                  {formatModifier(skillBonus(c, skill))} {SKILL_ABBR[skill.name]}
                  {skill.advantage === "advantage" && <span className="ml-0.5 text-emerald-400">▲</span>}
                  {skill.advantage === "disadvantage" && <span className="ml-0.5 text-red-400">▼</span>}
                </Pill>
              );
            })}
          </div>
        </div>
      )}

      {/* Resources */}
      {c.resources.length > 0 && (
        <div className="border-t border-slate-800 pt-3 space-y-1.5">
          <h3 className="text-xs uppercase tracking-wide text-slate-500 mb-1.5">Resources</h3>
          {c.resources
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((r) => (
              <ResourceMeter key={r.id} resource={r} />
            ))}
        </div>
      )}

      {/* Spell slots */}
      {(c.spellSlots.length > 0 || c.spellcasting) && (
        <div className="border-t border-slate-800 pt-3">
          <h3 className="mb-1.5 text-xs uppercase tracking-wide text-slate-500">Spell Slots</h3>
          <div className="space-y-1">
            {c.spellSlots
              .slice()
              .sort((a, b) => a.level - b.level)
              .map((s) => (
                <div key={s.level} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-300">{ordinalLevel(s.level)} Level</span>
                  {s.max > 0 && s.max <= 6 ? (
                    <DotMeter current={s.current} max={s.max} colorClass="bg-violet-400" />
                  ) : (
                    <span className="font-medium text-slate-100">
                      {s.current}/{s.max}
                    </span>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {c.notes && (
        <div className="border-t border-slate-800 pt-3">
          <h3 className="text-xs uppercase tracking-wide text-slate-500 mb-1.5">Notes</h3>
          <p className="text-sm text-slate-400 leading-snug">{c.notes}</p>
        </div>
      )}

      <QuickNotesSection character={c} onUpdate={onUpdate} />

      <div className="flex items-center justify-between border-t border-slate-800 pt-3 text-xs">
        {c.dndBeyondUrl ? (
          <div>
            <a
              href={c.dndBeyondUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sky-400 hover:underline"
            >
              D&D Beyond ↗
            </a>
            {c.lastSyncedAt && (
              <p className="text-slate-500">
                Synced: <SyncTimestamp iso={c.lastSyncedAt} />
              </p>
            )}
          </div>
        ) : (
          <span />
        )}
        <div className="flex gap-3">
          <Link href={`/characters/${c.id}/edit`} className="text-slate-400 hover:text-slate-200">
            Edit
          </Link>
          {onRemove && (
            <button
              onClick={() => onRemove(c.id)}
              className="text-red-500/80 hover:text-red-400"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {detailsOpen && (
        <CharacterDetailsModal character={c} onClose={() => setDetailsOpen(false)} onUpdate={onUpdate} />
      )}
    </div>
  );
}
