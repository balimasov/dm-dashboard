"use client";

import { useState } from "react";
import { Character, SKILL_ABBR, STAT_ORDER } from "@/lib/types";
import { abilityModifier, proficiencyBonus, savingThrowBonus, skillBonus } from "@/lib/characterMath";
import { formatModifier } from "@/lib/format";
import { characterReminders } from "@/lib/reminders";
import { useDdbSync } from "@/hooks/useDdbSync";
import { ResourceTrackerBar } from "./ResourceMeter";
import { CharacterDetailsModal } from "./CharacterDetailsModal";
import { EditCharacterModal } from "./EditCharacterModal";
import { CharacterHeader } from "./CharacterHeader";
import { SkillPanel } from "./SkillPanel";
import { ShieldIcon, SpeedIcon, InitiativeIcon, ProficiencyIcon } from "./ui/icons";
import {
  AC_HINT_PANEL,
  IMMUNE_HINT_PANEL,
  INITIATIVE_HINT_PANEL,
  PASSIVE_INSIGHT_HINT_PANEL,
  PASSIVE_INVESTIGATION_HINT_PANEL,
  PASSIVE_PERCEPTION_HINT_PANEL,
  PROFICIENCY_HINT_PANEL,
  RESIST_HINT_PANEL,
  SPEED_HINT_PANEL,
  VULNERABLE_HINT_PANEL,
} from "./ui/combatStatHints";
import { ENTITY_CARD_BASE_CLS } from "./ui/containerStyles";
import { EntityActionsMenu } from "./ui/EntityActionsMenu";
import { Pill } from "./ui/Pill";
import { ReminderBadge } from "./ui/ReminderBadge";
import { IconStat } from "./ui/IconStat";
import { SenseEntries } from "./ui/SenseEntries";
import { DamageInfoList } from "./ui/DamageInfoList";
import { DdbSyncStatus } from "./ui/DdbSyncStatus";
import { HpBar } from "./ui/HpBar";
import { StatusRail } from "./ui/StatusRail";
import { NotesSection } from "./ui/NotesSection";
import { QuickNotesSection } from "./ui/QuickNotesSection";
import { SectionDivider } from "./ui/SectionDivider";
import { SubHeading } from "./ui/SubHeading";

/**
 * Merges what used to be two separate sections (Stats, Saving Throws) into
 * one six-box grid — each box now stacks the ability modifier over the save
 * bonus instead of two full grids each with their own heading/gap. Same 12
 * numbers as before, just paired per ability instead of laid out as two
 * passes over the same six letters; one of several changes aimed at getting
 * this card closer to fitting a screen without scrolling. Save bonus turns
 * amber on proficiency, matching the highlight the old standalone Saving
 * Throws `StatBox` used to carry on its whole box.
 */
function AbilityScoreBox({
  label,
  modifier,
  save,
  proficient,
}: {
  label: string;
  modifier: string;
  save: string;
  proficient?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-md border border-slate-800 bg-slate-800/40 py-1.5">
      <span className="text-sm font-bold text-slate-100">{modifier}</span>
      <span className={`text-xs font-semibold ${proficient ? "text-amber-300" : "text-slate-400"}`}>{save}</span>
      <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
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
  const [editOpen, setEditOpen] = useState(false);
  const { syncing, error: syncError, sync } = useDdbSync(c, onUpdate);
  // Advantage display is temporarily hidden (parsing/data model stays intact) — see c.advantages.

  return (
    <div
      className={`relative flex flex-col gap-4 ${ENTITY_CARD_BASE_CLS} ${
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

      {/* Sync (left) + kebab actions menu (right) share one row, same
          placement as the details modal's own sync+actions row — keeps the
          menu off the header row above, where it would crowd the Heroic
          Inspiration star at that row's right edge. */}
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <DdbSyncStatus
            dndBeyondUrl={c.dndBeyondUrl}
            synced={c.synced}
            lastSyncedAt={c.lastSyncedAt}
            syncing={syncing}
            error={syncError}
          />
        </div>
        {/* Badge sits right next to the kebab (its own small `gap-1.5`,
            tighter than the row's own `gap-3` to the sync block) rather than
            centered in the leftover space between the two — reads as part
            of the same corner of controls instead of floating mid-row. */}
        <div className="flex shrink-0 items-center gap-1.5">
          <ReminderBadge
            group={characterReminders(c)}
            onRemove={onUpdate ? (name) => onUpdate(c.id, { flaggedAbilities: (c.flaggedAbilities ?? []).filter((n) => n !== name) }) : undefined}
          />
          <EntityActionsMenu
            onEdit={() => setEditOpen(true)}
            name={c.name}
            hidden={c.hidden}
            onToggleHidden={onUpdate ? () => onUpdate(c.id, { hidden: !c.hidden }) : undefined}
            onSync={onUpdate && c.dndBeyondUrl ? sync : undefined}
            syncing={syncing}
            onRemove={onRemove ? () => onRemove(c.id) : undefined}
          />
        </div>
      </div>

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
            panel={AC_HINT_PANEL}
            label="AC"
          >
            {c.combat.ac}
          </IconStat>
          <IconStat
            className="pl-2"
            icon={<SpeedIcon className="h-3.5 w-3.5 shrink-0 text-slate-500" />}
            panel={SPEED_HINT_PANEL}
            label="Speed"
          >
            {c.combat.speed}ft
          </IconStat>
          <IconStat
            icon={<InitiativeIcon className="h-3.5 w-3.5 shrink-0 text-slate-500" />}
            panel={INITIATIVE_HINT_PANEL}
            label="Initiative"
          >
            {formatModifier(c.initiative)}
          </IconStat>
          <IconStat
            className="pl-2"
            icon={<ProficiencyIcon className="h-3.5 w-3.5 shrink-0 text-slate-500" />}
            panel={PROFICIENCY_HINT_PANEL}
            label="Prof"
          >
            {formatModifier(proficiencyBonus(c.level))}
          </IconStat>
        </div>
      </div>

      {/* Senses */}
      <SectionDivider>
        <SubHeading>Senses</SubHeading>
        <div className="grid grid-cols-3 gap-1.5">
          <Pill panel={PASSIVE_PERCEPTION_HINT_PANEL}>
            {SKILL_ABBR.perception} {c.combat.passivePerception}
          </Pill>
          <Pill panel={PASSIVE_INVESTIGATION_HINT_PANEL}>
            {SKILL_ABBR.investigation} {c.combat.passiveInvestigation}
          </Pill>
          <Pill panel={PASSIVE_INSIGHT_HINT_PANEL}>
            {SKILL_ABBR.insight} {c.combat.passiveInsight}
          </Pill>
        </div>
        {/* Always rendered, even with no senses — cards used to skip this
            block entirely when a character had none, which left neighboring
            cards in the same row with their Stats/Skills sections starting
            at different heights depending on who happened to have
            Darkvision. Reserving the same line every card keeps that content
            lined up regardless. */}
        <div className="mt-4 text-sm">
          {c.senses.length > 0 ? <SenseEntries senses={c.senses} /> : <span className="text-slate-600">No special senses</span>}
        </div>
      </SectionDivider>

      {/* Ability Scores — merged Stats + Saving Throws (see `AbilityScoreBox`'s own doc comment) */}
      <SectionDivider>
        <SubHeading>Ability Scores</SubHeading>
        <div className="grid grid-cols-6 gap-1.5">
          {STAT_ORDER.map((key) => (
            <AbilityScoreBox
              key={key}
              label={key.toUpperCase()}
              modifier={formatModifier(abilityModifier(c.stats[key]))}
              save={formatModifier(savingThrowBonus(c, key))}
              proficient={c.savingThrowProficiencies.includes(key)}
            />
          ))}
        </div>
      </SectionDivider>

      {/* Resistances / Immunities / Vulnerabilities */}
      <DamageInfoList
        entries={[
          { label: "Resist", value: c.resistances.join(", "), panel: RESIST_HINT_PANEL },
          { label: "Immune", value: c.immunities.join(", "), panel: IMMUNE_HINT_PANEL },
          {
            label: "Vulnerable",
            value: c.vulnerabilities.join(", "),
            panel: VULNERABLE_HINT_PANEL,
          },
        ]}
      />

      {/* Skills */}
      {c.skillProficiencies.length > 0 && (
        <SectionDivider>
          <SubHeading>Skills</SubHeading>
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
        </SectionDivider>
      )}

      {/* Resources — Limited Use and Spell Slots merged under one umbrella
          with a single tracker bar summarizing both at the top (see
          ResourceTrackerBar's own doc comment for why one shared bar
          instead of two separate ones: a DM glancing at a card wants "how
          topped-up is this character" as one impression). */}
      {(c.resources.length > 0 || c.spellSlots.length > 0 || c.spellcasting) && (
        <SectionDivider>
          <SubHeading>Resources</SubHeading>
          <ResourceTrackerBar resources={c.resources} spellSlots={c.spellSlots} pactSlots={c.className.includes("Warlock")} />
        </SectionDivider>
      )}

      <NotesSection notes={c.notes} />

      <QuickNotesSection
        notes={c.quickNotes ?? []}
        onChange={onUpdate ? (quickNotes) => onUpdate(c.id, { quickNotes }) : undefined}
      />

      {detailsOpen && (
        <CharacterDetailsModal character={c} onClose={() => setDetailsOpen(false)} onUpdate={onUpdate} onRemove={onRemove} />
      )}

      {editOpen && onUpdate && (
        <EditCharacterModal character={c} onClose={() => setEditOpen(false)} onUpdate={onUpdate} />
      )}
    </div>
  );
}
