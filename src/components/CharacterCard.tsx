"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Character,
  abilityModifier,
  formatModifier,
  characterInfoLine,
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

export const STAT_ORDER: Array<keyof Character["stats"]> = [
  "str",
  "dex",
  "con",
  "int",
  "wis",
  "cha",
];

export function ordinalLevel(level: number): string {
  if (level % 10 === 1 && level % 100 !== 11) return `${level}st`;
  if (level % 10 === 2 && level % 100 !== 12) return `${level}nd`;
  if (level % 10 === 3 && level % 100 !== 13) return `${level}rd`;
  return `${level}th`;
}

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
  const hpPct = maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0;
  const tempPct = maxHp > 0 ? Math.max(0, Math.min(100 - hpPct, (tempHp / maxHp) * 100)) : 0;
  const hpColor = hpPct > 50 ? "bg-emerald-500" : hpPct > 25 ? "bg-amber-500" : "bg-red-600";

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-sm text-slate-300">HP</span>
        {isDown && deathSaves ? (
          <span className="text-sm font-medium text-red-400">
            Death Saves: ✅ {deathSaves.successes}/3 · ❌ {deathSaves.failures}/3
          </span>
        ) : (
          <span className="text-sm font-medium text-slate-100">
            <span className="text-2xl font-bold">{hp}</span>
            <span className="text-slate-500"> / {maxHp}</span>
            {tempHp > 0 && <span className="text-sky-400"> (+{tempHp} temp)</span>}
          </span>
        )}
      </div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full ${hpColor}`} style={{ width: `${hpPct}%` }} />
        <div className="h-full bg-amber-400" style={{ width: `${tempPct}%` }} />
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
        highlight ? "border-sky-700 bg-sky-950/40" : "border-slate-800 bg-slate-800/40"
      }`}
    >
      <span className={`text-sm font-bold ${highlight ? "text-sky-300" : "text-slate-100"}`}>{value}</span>
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
  color?: "slate" | "sky" | "amber" | "teal";
  children: React.ReactNode;
}) {
  const colorCls =
    color === "amber"
      ? "border-amber-700 bg-amber-950/30 text-amber-300"
      : color === "sky"
        ? "border-sky-700 bg-sky-950/40 text-sky-300"
        : color === "teal"
          ? "border-teal-700 bg-teal-950/30 text-teal-300"
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
    <div className="flex items-start gap-1.5 text-sm text-slate-300">
      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-600" />
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
        className="shrink-0 text-slate-600 hover:text-red-400"
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
  const hasDamageInfo = c.resistances.length + c.immunities.length + c.vulnerabilities.length > 0;

  return (
    <div
      className={`rounded-xl border p-4 shadow-lg shadow-black/20 flex flex-col gap-4 ${
        c.concentrating
          ? "border-violet-500 ring-2 ring-violet-500/50 bg-violet-950/10"
          : "border-slate-800 bg-slate-900/60"
      }`}
    >
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
          <span className="flex items-center gap-1.5">
            <ShieldIcon className="h-3.5 w-3.5 shrink-0 text-slate-500" />
            AC {c.combat.ac}
          </span>
          <span className="flex items-center gap-1.5 pl-2">
            <SpeedIcon className="h-3.5 w-3.5 shrink-0 text-slate-500" />
            Speed {c.combat.speed}ft
          </span>
          <span className="flex items-center gap-1.5">
            <InitiativeIcon className="h-3.5 w-3.5 shrink-0 text-slate-500" />
            Initiative {formatModifier(c.initiative)}
          </span>
          <span className="flex items-center gap-1.5 pl-2">
            <ProficiencyIcon className="h-3.5 w-3.5 shrink-0 text-slate-500" />
            <span className="min-w-0 flex-1">
              <InfoTooltip
                panel={
                  <p>Proficiency Bonus — added to attack rolls, saving throws, and skill checks you&apos;re proficient in.</p>
                }
              >
                Prof {formatModifier(proficiencyBonus(c.level))}
              </InfoTooltip>
            </span>
          </span>
        </div>
        <div className="mt-1 space-y-1 text-sm text-slate-300">
          <span className="flex items-center gap-1.5">
            <ExhaustionIcon
              className={`h-3.5 w-3.5 shrink-0 ${c.combat.exhaustion > 0 ? "text-amber-500" : "text-slate-500"}`}
            />
            <span className={`min-w-0 flex-1 ${c.combat.exhaustion > 0 ? "text-amber-300" : ""}`}>
              <InfoTooltip panel={<ExhaustionPanel level={c.combat.exhaustion} />}>
                Exhaustion: {c.combat.exhaustion}
              </InfoTooltip>
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <ConditionsIcon
              className={`h-3.5 w-3.5 shrink-0 ${c.combat.conditions.length > 0 ? "text-amber-500" : "text-slate-500"}`}
            />
            <span className={`min-w-0 flex-1 ${c.combat.conditions.length > 0 ? "text-amber-300" : ""}`}>
              {c.combat.conditions.length > 0 ? (
                <InfoTooltip panel={<ConditionsPanel conditions={c.combat.conditions} />}>
                  Conditions: {c.combat.conditions.join(", ")}
                </InfoTooltip>
              ) : (
                <span className="block truncate">Conditions: none</span>
              )}
            </span>
          </span>
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
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-300">
            {c.senses.map((s) => (
              <span key={s.name}>
                <span className="text-slate-500">{s.name}:</span> {s.range} ft
              </span>
            ))}
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
      {hasDamageInfo && (
        <div className="space-y-1 text-sm text-slate-300">
          {c.resistances.length > 0 && (
            <p>
              <span className="text-slate-500">Resist:</span> {c.resistances.join(", ")}
            </p>
          )}
          {c.immunities.length > 0 && (
            <p>
              <span className="text-slate-500">Immune:</span> {c.immunities.join(", ")}
            </p>
          )}
          {c.vulnerabilities.length > 0 && (
            <p>
              <span className="text-slate-500">Vulnerable:</span> {c.vulnerabilities.join(", ")}
            </p>
          )}
        </div>
      )}

      {/* Skills */}
      {c.skillProficiencies.length > 0 && (
        <div className="border-t border-slate-800 pt-3">
          <h3 className="text-xs uppercase tracking-wide text-slate-500 mb-1.5">Skills</h3>
          <div className="flex flex-wrap gap-1.5">
            {c.skillProficiencies.map((skill) => {
              const color = skill.expertise
                ? "amber"
                : skill.proficient
                  ? "sky"
                  : skill.halfProficiency
                    ? "teal"
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
          <div className="mb-1.5 flex items-center justify-between">
            <h3 className="text-xs uppercase tracking-wide text-slate-500">Spells</h3>
            {onUpdate && (
              <button
                type="button"
                onClick={() => onUpdate(c.id, { concentrating: !c.concentrating })}
                aria-pressed={Boolean(c.concentrating)}
                title="Toggle whether this character is currently concentrating"
                className={`rounded-full border px-2 py-0.5 text-xs font-medium transition-colors ${
                  c.concentrating
                    ? "border-violet-500 bg-violet-950/60 text-violet-300"
                    : "border-slate-700 text-slate-500 hover:border-violet-700 hover:text-violet-400"
                }`}
              >
                Concentrating
              </button>
            )}
          </div>
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
