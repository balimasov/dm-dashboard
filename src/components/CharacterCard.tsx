"use client";

import { useState } from "react";
import { Character, SKILL_ABBR, STAT_ORDER } from "@/lib/types";
import { abilityModifier, proficiencyBonus, savingThrowBonus, skillBonus } from "@/lib/characterMath";
import { formatModifier, ordinalLevel } from "@/lib/format";
import { characterReminders } from "@/lib/reminders";
import { useDdbSync } from "@/hooks/useDdbSync";
import { DotMeter, ResourceMeter, ResourceTrackerBar } from "./ResourceMeter";
import { CharacterDetailsModal } from "./CharacterDetailsModal";
import { CharacterHeader } from "./CharacterHeader";
import { SkillPanel } from "./SkillPanel";
import { ShieldIcon, SpeedIcon, InitiativeIcon, ProficiencyIcon } from "./ui/icons";
import { EntityActionsMenu } from "./ui/EntityActionsMenu";
import { Pill } from "./ui/Pill";
import { ReminderBadge } from "./ui/ReminderBadge";
import { StatBox } from "./ui/StatBox";
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
            editHref={`/characters/${c.id}/edit`}
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
      <SectionDivider>
        <SubHeading>Senses</SubHeading>
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

      {/* Stats */}
      <SectionDivider>
        <SubHeading>Stats</SubHeading>
        <div className="grid grid-cols-6 gap-1.5">
          {STAT_ORDER.map((key) => (
            <StatBox key={key} label={key.toUpperCase()} value={formatModifier(abilityModifier(c.stats[key]))} />
          ))}
        </div>
      </SectionDivider>

      {/* Saving throws */}
      <div>
        <SubHeading>Saving Throws</SubHeading>
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
          <ResourceTrackerBar resources={c.resources} spellSlots={c.spellSlots} />

          {c.resources.length > 0 && (
            <div className="mt-3 space-y-1.5">
              <h4 className="text-[11px] uppercase tracking-wide text-slate-600">Limited Use</h4>
              {c.resources
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((r) => (
                  <ResourceMeter key={r.id} resource={r} />
                ))}
            </div>
          )}

          {(c.spellSlots.length > 0 || c.spellcasting) && (
            <div className="mt-3">
              <h4 className="mb-1.5 text-[11px] uppercase tracking-wide text-slate-600">
                Spell Slots{c.className.includes("Warlock") ? " (Pact)" : ""}
              </h4>
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
    </div>
  );
}
