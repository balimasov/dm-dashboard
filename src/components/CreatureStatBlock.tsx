"use client";

import { Creature, CreatureTrait, SKILL_ABBR, SKILL_ABILITY, SKILL_DESCRIPTIONS, STAT_ORDER } from "@/lib/types";
import { abilityModifier } from "@/lib/characterMath";
import { formatModifier } from "@/lib/format";
import { computePassiveSkill, ParsedCreatureSkill, parseCreatureSenses, parseCreatureSkills } from "@/lib/creatureStatText";
import { DamageInfoList } from "./ui/DamageInfoList";
import { HintPanel } from "./ui/HintPanel";
import { HpBar } from "./ui/HpBar";
import { IconStat } from "./ui/IconStat";
import { InitiativeIcon, LanguageIcon, ShieldIcon, SpeedIcon } from "./ui/icons";
import {
  CREATURE_AC_HINT_PANEL,
  CREATURE_PASSIVE_PERCEPTION_HINT_PANEL,
  CREATURE_SPEED_HINT_PANEL,
  IMMUNE_HINT_PANEL,
  INITIATIVE_HINT_PANEL,
  PASSIVE_INSIGHT_HINT_PANEL,
  PASSIVE_INVESTIGATION_HINT_PANEL,
  RESIST_HINT_PANEL,
  VULNERABLE_HINT_PANEL,
} from "./ui/combatStatHints";
import { Pill } from "./ui/Pill";
import { SectionDivider } from "./ui/SectionDivider";
import { SenseEntries } from "./ui/SenseEntries";
import { AbilityScoreBox } from "./ui/AbilityScoreBox";
import { AbilityScoreHintPanel } from "./ui/AbilityScoreHintPanel";
import { MUTED_LABEL_CLS } from "./ui/typography";
import { SubHeading } from "./ui/SubHeading";

export const GROUP_LABELS: Record<NonNullable<CreatureTrait["group"]>, string> = {
  trait: "Traits",
  action: "Actions",
  bonusAction: "Bonus Actions",
  reaction: "Reactions",
  legendary: "Legendary Actions",
};
export const GROUP_ORDER: Array<NonNullable<CreatureTrait["group"]>> = [
  "trait",
  "action",
  "bonusAction",
  "reaction",
  "legendary",
];

/** Same hover-hint shape as a character's `SkillPanel`, adapted for a skill parsed from a stat block's free-text Skills line instead of a structured `SkillProficiency`. */
function CreatureSkillPanel({ skill }: { skill: ParsedCreatureSkill }) {
  return (
    <HintPanel
      title={
        <>
          {skill.label}
          {skill.name && <span className="text-slate-500"> ({SKILL_ABILITY[skill.name].toUpperCase()})</span>}
        </>
      }
      description={skill.name && SKILL_DESCRIPTIONS[skill.name]}
    />
  );
}

/**
 * Everything about a creature's stat block below the header — HP through
 * Skills — shared between the compact `CreatureCard` and
 * `CreatureDetailsModal` so the two can never drift apart in what they show
 * or how editing behaves; only the surrounding chrome (card border vs. modal
 * shell) and header/footer/notes differ between them. Traits/Actions/Bonus
 * Actions/Reactions/Legendary Actions used to live at the tail end of this
 * block, but now lives in `CreatureAbilitiesPanel`'s own first tab instead
 * (alongside the newer structured Attacks/Spellcasting tabs) — one place for
 * every ability-related tab rather than a free-text block always shown here
 * plus a separate structured one below it.
 */
export function CreatureStatBlock({
  creature,
  onUpdate,
  compact = false,
  showLanguages = true,
}: {
  creature: Creature;
  onUpdate?: (id: string, updates: Partial<Creature>) => void;
  /** Passed straight through to each `SectionDivider` — see its own doc comment. Both `CreatureCard` and `CreatureDetailsModal` pass it, for the same tight rhythm in the card and the modal it opens into. */
  compact?: boolean;
  /** `CreatureCard` passes `false` — the compact card has less room to spend on a stat that rarely changes DM decisions mid-combat; `CreatureDetailsModal` leaves it at the default so the full detail view still shows it. */
  showLanguages?: boolean;
}) {
  const isDown = creature.hp <= 0;
  const skills = parseCreatureSkills(creature.skills);
  const senses = parseCreatureSenses(creature.senses);
  const passivePerception = senses.passivePerception ?? computePassiveSkill("perception", skills, creature.stats.wis);
  const passiveInvestigation = computePassiveSkill("investigation", skills, creature.stats.int);
  const passiveInsight = computePassiveSkill("insight", skills, creature.stats.wis);
  const deathSaves = creature.deathSaves ?? { successes: 0, failures: 0 };

  // A heal (or DM correction) back above 0 clears any death-save progress —
  // otherwise a creature that gets knocked down again later would reopen the
  // tracker showing whatever partial successes/failures it had last time,
  // which is stale, not carried-over state.
  function handleHpChange(hp: number) {
    if (!onUpdate) return;
    onUpdate(creature.id, hp > 0 ? { hp, deathSaves: { successes: 0, failures: 0 } } : { hp });
  }

  return (
    <>
      <div className="space-y-2">
        <HpBar
          hp={creature.hp}
          maxHp={creature.maxHp}
          tempHp={creature.tempHp}
          isDown={isDown}
          deathSaves={deathSaves}
          onHpChange={onUpdate ? handleHpChange : undefined}
          onTempHpChange={onUpdate ? (tempHp) => onUpdate(creature.id, { tempHp }) : undefined}
          onDeathSavesChange={onUpdate ? (next) => onUpdate(creature.id, { deathSaves: next }) : undefined}
        />
        {creature.hitDice && <p className={MUTED_LABEL_CLS}>Hit Dice: {creature.hitDice}</p>}
        {creature.source && <p className={MUTED_LABEL_CLS}>Source: {creature.source}</p>}

        <div className="space-y-1.5 text-sm text-slate-300">
          <IconStat
            icon={<ShieldIcon className="h-4 w-4 shrink-0 text-slate-500" />}
            panel={CREATURE_AC_HINT_PANEL}
            label="AC"
          >
            {creature.ac}
            {creature.armorDesc && <span className="text-slate-500"> ({creature.armorDesc})</span>}
          </IconStat>
          <IconStat
            icon={<SpeedIcon className="h-4 w-4 shrink-0 text-slate-500" />}
            panel={CREATURE_SPEED_HINT_PANEL}
            label="Speed"
          >
            {creature.speedDetail ?? `${creature.speed}ft`}
          </IconStat>
          <IconStat
            icon={<InitiativeIcon className="h-4 w-4 shrink-0 text-slate-500" />}
            panel={INITIATIVE_HINT_PANEL}
            label="Initiative"
          >
            {creature.initiativeBonus !== undefined ? formatModifier(creature.initiativeBonus) : "—"}
          </IconStat>
          {showLanguages && (
            <IconStat
              icon={<LanguageIcon className="h-4 w-4 shrink-0 text-slate-500" />}
              panel={<p>Languages — the languages this creature can speak, read, or understand.</p>}
              label="Languages"
              valueTitle={creature.languages}
            >
              {creature.languages || "—"}
            </IconStat>
          )}
        </div>
      </div>

      <SectionDivider compact={compact}>
        <SubHeading>Senses</SubHeading>
        <div className="grid grid-cols-3 gap-1.5">
          <Pill panel={CREATURE_PASSIVE_PERCEPTION_HINT_PANEL}>
            {SKILL_ABBR.perception} {passivePerception}
          </Pill>
          <Pill panel={PASSIVE_INVESTIGATION_HINT_PANEL}>
            {SKILL_ABBR.investigation} {passiveInvestigation}
          </Pill>
          <Pill panel={PASSIVE_INSIGHT_HINT_PANEL}>
            {SKILL_ABBR.insight} {passiveInsight}
          </Pill>
        </div>
        {senses.entries.length > 0 && (
          <div className="mt-4">
            <SenseEntries senses={senses.entries} />
          </div>
        )}
      </SectionDivider>

      {/* Ability Scores — merged Stats + Saving Throws, same recipe as `CharacterCard`/`CharacterDetailsModal` (see `AbilityScoreBox`'s own doc comment). Highlight here means "this save differs from the raw ability modifier" rather than "has a saving-throw proficiency" — a stat block often lists non-proficient saves that still deviate (situational bonuses, legendary resistances), so anything other than the plain modifier is worth calling out. */}
      <SectionDivider compact={compact}>
        <SubHeading>Ability Scores</SubHeading>
        <div className="grid grid-cols-6 gap-1.5">
          {STAT_ORDER.map((key) => {
            const plainMod = abilityModifier(creature.stats[key]);
            const save = creature.savingThrows?.[key] ?? plainMod;
            const highlight = save !== plainMod;
            return (
              <AbilityScoreBox
                key={key}
                label={key.toUpperCase()}
                modifier={formatModifier(plainMod)}
                save={formatModifier(save)}
                highlight={highlight}
                panel={
                  <AbilityScoreHintPanel
                    abilityKey={key}
                    score={creature.stats[key]}
                    modifier={formatModifier(plainMod)}
                    save={formatModifier(save)}
                    highlight={highlight}
                  />
                }
              />
            );
          })}
        </div>
      </SectionDivider>

      <DamageInfoList
        entries={[
          {
            label: "Resist",
            value: creature.damageResistances,
            panel: RESIST_HINT_PANEL,
          },
          {
            label: "Immune",
            value: creature.damageImmunities,
            panel: IMMUNE_HINT_PANEL,
          },
          {
            label: "Vulnerable",
            value: creature.damageVulnerabilities,
            panel: VULNERABLE_HINT_PANEL,
          },
          {
            label: "Condition Immunities",
            value: creature.conditionImmunities,
            panel: <p>Condition Immunity — can&apos;t be affected by this condition at all.</p>,
          },
        ]}
      />

      {skills.length > 0 && (
        <SectionDivider compact={compact}>
          <SubHeading>Skills</SubHeading>
          <div className="flex flex-wrap gap-1.5">
            {skills.map((skill, index) => (
              <Pill key={`${skill.label}-${index}`} panel={<CreatureSkillPanel skill={skill} />} color="amber">
                {skill.bonus !== null && `${formatModifier(skill.bonus)} `}
                {skill.name ? SKILL_ABBR[skill.name] : skill.label}
              </Pill>
            ))}
          </div>
        </SectionDivider>
      )}
    </>
  );
}
