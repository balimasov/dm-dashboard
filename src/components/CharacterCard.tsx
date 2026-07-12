"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Character,
  abilityModifier,
  formatModifier,
  ordinalLevel,
  proficiencyBonus,
  QuickNote,
  savingThrowBonus,
  skillBonus,
  SKILL_ABBR,
  STAT_ORDER,
} from "@/lib/types";
import { useDdbSync } from "@/hooks/useDdbSync";
import { DotMeter, ResourceMeter } from "./ResourceMeter";
import { CharacterDetailsModal } from "./CharacterDetailsModal";
import { CharacterHeader } from "./CharacterHeader";
import { SkillPanel } from "./SkillPanel";
import { ShieldIcon, SpeedIcon, InitiativeIcon, ProficiencyIcon } from "./ui/icons";
import { Pill } from "./ui/Pill";
import { StatBox } from "./ui/StatBox";
import { IconStat } from "./ui/IconStat";
import { SenseEntries } from "./ui/SenseEntries";
import { DamageInfoList } from "./ui/DamageInfoList";
import { DdbSyncStatus } from "./ui/DdbSyncStatus";
import { HpBar } from "./ui/HpBar";
import { StatusRail } from "./ui/StatusRail";

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
  const { syncing, error: syncError, sync } = useDdbSync(c, onUpdate);
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

      <DdbSyncStatus
        dndBeyondUrl={c.dndBeyondUrl}
        synced={c.synced}
        lastSyncedAt={c.lastSyncedAt}
        syncing={syncing}
        error={syncError}
        onSync={onUpdate ? sync : undefined}
      />

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
          <h3 className="mb-1.5 text-xs uppercase tracking-wide text-slate-500">
            Spell Slots{c.className.includes("Warlock") ? " (Pact)" : ""}
          </h3>
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

      <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-3 text-xs">
        <Link href={`/characters/${c.id}/edit`} className="text-slate-400 hover:text-slate-200">
          Edit
        </Link>
        {onRemove && (
          <button
            onClick={() => {
              const confirmed = window.confirm(`Remove "${c.name}" from this campaign? This can't be undone.`);
              if (confirmed) onRemove(c.id);
            }}
            className="text-red-500/80 hover:text-red-400"
          >
            Remove
          </button>
        )}
      </div>

      {detailsOpen && (
        <CharacterDetailsModal character={c} onClose={() => setDetailsOpen(false)} onUpdate={onUpdate} />
      )}
    </div>
  );
}
