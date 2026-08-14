"use client";

import { Character, SKILL_ABBR, SkillName, SkillProficiency, SKILL_LABELS, STAT_ORDER } from "@/lib/types";
import { abilityModifier, proficiencyBonus, savingThrowBonus, skillBonus } from "@/lib/characterMath";
import { formatModifier } from "@/lib/format";
import { ReactNode } from "react";
import { SkillPanel } from "./SkillPanel";
import { averageOverallPercent, ResourceTrackerBar } from "./ResourceMeter";
import {
  AC_HINT_PANEL,
  IMMUNE_HINT_PANEL,
  INITIATIVE_HINT_PANEL,
  PASSIVE_PERCEPTION_HINT_PANEL,
  PROFICIENCY_HINT_PANEL,
  RESIST_HINT_PANEL,
  SPEED_HINT_PANEL,
  VULNERABLE_HINT_PANEL,
} from "./ui/combatStatHints";
import { AbilityScoreBox } from "./ui/AbilityScoreBox";
import { AbilityScoreHintPanel } from "./ui/AbilityScoreHintPanel";
import { HpBar } from "./ui/HpBar";
import { IconInfoList } from "./ui/IconInfoList";
import { IconStat } from "./ui/IconStat";
import { InitiativeIcon, ProficiencyIcon, ShieldIcon, SpeedIcon } from "./ui/icons";
import { Pill } from "./ui/Pill";
import { SectionDivider } from "./ui/SectionDivider";
import { SensesSection } from "./ui/SensesSection";
import { SubHeading } from "./ui/SubHeading";

/**
 * Everything about a character's stat block below the header/toolbar — HP
 * through Resources — shared between the compact `CharacterCard` and
 * `CharacterDetailsModal` so the two can never drift apart in what they show,
 * the same reasoning `CreatureStatBlock` already exists for on the creature
 * side. Before this, the two built the exact same HP/AC/Speed/Initiative/Prof
 * grid, Ability Scores, and Resist/Immune/Vulnerable JSX independently —
 * byte-identical, confirmed by a UI-kit audit after the third round this
 * session where a fix landed in one of the two and not the other. Two things
 * the modal alone has (the full Advantages list, and Languages/Tools
 * "Proficiencies" right after it) stay in `CharacterDetailsModal` itself,
 * same as Traits/Actions/Spellcasting live in `CreatureAbilitiesPanel` rather
 * than `CreatureStatBlock` — a modal-only section doesn't belong in the
 * block both surfaces share.
 */
export function CharacterStatBlock({
  character,
  compact = false,
  alwaysShowSenses = false,
  showAllSkills = true,
  afterDamageInfo,
}: {
  character: Character;
  /** Passed straight through to each `SectionDivider` — see its own doc comment. Both `CharacterCard` and `CharacterDetailsModal` pass it, for the same tight rhythm in the card and the modal it opens into. */
  compact?: boolean;
  /** `CharacterCard` passes `true` — the Senses row (with a "No special senses" fallback) always renders so neighboring cards in the same row line up at the same height regardless of who happens to have Darkvision. `CharacterDetailsModal` leaves it at the default (row hidden entirely when there are no senses) since there's no row of neighbors to align with there. */
  alwaysShowSenses?: boolean;
  /**
   * `CharacterDetailsModal` leaves this at the default `true` — every one of
   * the 18 skills, with a 4th `orange` color for a half-proficiency-only
   * entry (Jack of All Trades). `CharacterCard` passes `false`: half-
   * proficiency-only skills are real proficiency bonuses, but on a compact
   * card they read as noise next to actual trained skills — a DM scanning
   * the card wants "what is this character good at," not the half-credit
   * list too. A skill whose *only* modifier is a flat `bonus` (a subclass
   * feature stacking a second ability's modifier onto one skill, no
   * proficiency behind it) is excluded on the card for the same reason —
   * training/expertise/advantage all say something about the character, a
   * stacked flat number alone doesn't. A skill with training *and* a bonus
   * still shows on the card, bonus included in its number.
   */
  showAllSkills?: boolean;
  /** Rendered right after Resist/Immune/Vulnerable, before Skills — the one slot `CharacterDetailsModal` needs that `CharacterCard` doesn't: its own Advantages list ("shown here only... this modal is the one place with room for the full restriction text") followed by Languages/Tools "Proficiencies". `undefined` renders nothing. */
  afterDamageInfo?: ReactNode;
}) {
  const c = character;
  const isDown = c.combat.hp <= 0;

  const fullSkillList: SkillProficiency[] = (Object.keys(SKILL_LABELS) as SkillName[])
    .map((name) => c.skillProficiencies.find((s) => s.name === name) ?? { name, proficient: false, expertise: false })
    .sort((a, b) => SKILL_LABELS[a.name].localeCompare(SKILL_LABELS[b.name]));
  const trainedSkills = c.skillProficiencies.filter(
    (skill) => !skill.halfProficiency && (skill.proficient || skill.expertise || skill.advantage)
  );
  const visibleSkills = showAllSkills ? fullSkillList : trainedSkills;

  return (
    <>
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
            icon={<ShieldIcon className="h-4 w-4 shrink-0 text-slate-500" />}
            panel={AC_HINT_PANEL}
            label="AC"
          >
            {c.combat.ac}
          </IconStat>
          <IconStat
            className="pl-4"
            icon={<SpeedIcon className="h-4 w-4 shrink-0 text-slate-500" />}
            panel={SPEED_HINT_PANEL}
            label="Speed"
          >
            {c.combat.speed}ft
          </IconStat>
          <IconStat
            icon={<InitiativeIcon className="h-4 w-4 shrink-0 text-slate-500" />}
            panel={INITIATIVE_HINT_PANEL}
            label="Initiative"
          >
            {formatModifier(c.initiative)}
          </IconStat>
          <IconStat
            className="pl-4"
            icon={<ProficiencyIcon className="h-4 w-4 shrink-0 text-slate-500" />}
            panel={PROFICIENCY_HINT_PANEL}
            label="Prof"
          >
            {formatModifier(proficiencyBonus(c.level))}
          </IconStat>
        </div>
      </div>

      <SensesSection
        compact={compact}
        passivePerception={c.combat.passivePerception}
        passivePerceptionPanel={PASSIVE_PERCEPTION_HINT_PANEL}
        passiveInvestigation={c.combat.passiveInvestigation}
        passiveInsight={c.combat.passiveInsight}
        senses={c.senses}
        alwaysShow={alwaysShowSenses}
      />

      {/* Ability Scores — merged Stats + Saving Throws (see `AbilityScoreBox`'s own doc comment) */}
      <SectionDivider compact={compact}>
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

      <IconInfoList
        entries={[
          { label: "Resist", value: c.resistances.join(", "), panel: RESIST_HINT_PANEL },
          { label: "Immune", value: c.immunities.join(", "), panel: IMMUNE_HINT_PANEL },
          { label: "Vulnerable", value: c.vulnerabilities.join(", "), panel: VULNERABLE_HINT_PANEL },
        ]}
      />

      {afterDamageInfo}

      {visibleSkills.length > 0 && (
        <SectionDivider compact={compact}>
          <SubHeading>Skills</SubHeading>
          <div className="flex flex-wrap gap-1.5">
            {visibleSkills.map((skill) => {
              const color = skill.expertise ? "rose" : skill.proficient ? "amber" : skill.halfProficiency ? "orange" : "slate";
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
          trigger as the bar and counts below it). Gated on
          `averageOverallPercent` directly (not e.g. `resources.length > 0 ||
          spellcasting`) — the same check `ResourceTrackerBar` already makes
          internally to decide whether to render at all, so the surrounding
          `SectionDivider` never wraps an empty bar for the edge case of a
          spellcasting class with no slots tracked yet. */}
      {averageOverallPercent(c.resources, c.spellSlots) !== null && (
        <SectionDivider compact={compact}>
          <ResourceTrackerBar resources={c.resources} spellSlots={c.spellSlots} pactSlots={c.className.includes("Warlock")} />
        </SectionDivider>
      )}
    </>
  );
}
