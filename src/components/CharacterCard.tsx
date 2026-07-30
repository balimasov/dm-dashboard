"use client";

import { useState } from "react";
import { Character, SKILL_ABBR, STAT_ORDER } from "@/lib/types";
import { abilityModifier, proficiencyBonus, savingThrowBonus, skillBonus } from "@/lib/characterMath";
import { formatModifier } from "@/lib/format";
import { characterReminders } from "@/lib/reminders";
import { useCardSortable } from "@/hooks/useCardSortable";
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
import { AbilityScoreBox } from "./ui/AbilityScoreBox";
import { AbilityScoreHintPanel } from "./ui/AbilityScoreHintPanel";

export function CharacterCard({
  character,
  onRemove,
  onUpdate,
  dragEnabled = false,
}: {
  character: Character;
  onRemove?: (id: string) => void;
  onUpdate?: (id: string, updates: Partial<Character>) => void;
  /** Reordering is DM-only, matching `/api/characters/reorder` — a player still sees the same card, just without the drag affordance on its header. */
  dragEnabled?: boolean;
}) {
  const c = character;
  const isDown = c.combat.hp <= 0;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const { syncing, error: syncError, sync } = useDdbSync(c, onUpdate);
  const { setNodeRef, style, dragHandleProps, isDragging } = useCardSortable(c.id, dragEnabled);
  // Half-proficiency-only skills (Jack of All Trades) are real proficiency
  // bonuses, but on a compact card they read as noise next to actual trained
  // skills — a DM scanning the card wants "what is this character good at,"
  // not the half-credit list too. The full picture (every skill, including
  // these) still lives one click away in CharacterDetailsModal.
  const cardSkills = c.skillProficiencies.filter((skill) => !skill.halfProficiency);
  // Advantage display is temporarily hidden (parsing/data model stays intact) — see c.advantages.

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative flex flex-col gap-4 ${ENTITY_CARD_BASE_CLS} ${
        isDragging
          ? "z-20 border-sky-500 bg-slate-900/60 shadow-2xl shadow-black/40"
          : c.concentrating
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
      <CharacterHeader character={c} onClick={() => setDetailsOpen(true)} dragHandleProps={dragHandleProps} />

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
          {STAT_ORDER.map((key) => {
            const mod = abilityModifier(c.stats[key]);
            const save = savingThrowBonus(c, key);
            const proficient = c.savingThrowProficiencies.includes(key);
            return (
              <AbilityScoreBox
                key={key}
                label={key.toUpperCase()}
                modifier={formatModifier(mod)}
                save={formatModifier(save)}
                highlight={proficient}
                panel={
                  <AbilityScoreHintPanel
                    abilityKey={key}
                    score={c.stats[key]}
                    modifier={formatModifier(mod)}
                    save={formatModifier(save)}
                    highlight={proficient}
                    advantages={c.advantages}
                  />
                }
              />
            );
          })}
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
      {cardSkills.length > 0 && (
        <SectionDivider>
          <SubHeading>Skills</SubHeading>
          <div className="flex flex-wrap gap-1.5">
            {cardSkills.map((skill) => {
              const color = skill.expertise ? "rose" : skill.proficient ? "amber" : "slate";
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
          with a single tracker bar summarizing both (see ResourceTrackerBar's
          own doc comment for why one shared block instead of two separate
          bars, and why it renders its own "Resources" label rather than a
          SubHeading here — the label sits inside the same hover/click hint
          trigger as the bar and counts below it). */}
      {(c.resources.length > 0 || c.spellSlots.length > 0 || c.spellcasting) && (
        <SectionDivider>
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
