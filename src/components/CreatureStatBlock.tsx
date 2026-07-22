"use client";

import { Creature, CreatureTrait, SKILL_ABBR, SKILL_ABILITY, SKILL_DESCRIPTIONS, STAT_ORDER } from "@/lib/types";
import { abilityModifier } from "@/lib/characterMath";
import { formatModifier } from "@/lib/format";
import { computePassiveSkill, ParsedCreatureSkill, parseCreatureSenses, parseCreatureSkills } from "@/lib/creatureStatText";
import { DamageInfoList } from "./ui/DamageInfoList";
import { FlaggableRow } from "./ui/FlaggableRow";
import { HintPanel } from "./ui/HintPanel";
import { HpBar } from "./ui/HpBar";
import { IconStat } from "./ui/IconStat";
import { InitiativeIcon, LanguageIcon, ShieldIcon, SpeedIcon } from "./ui/icons";
import { Pill } from "./ui/Pill";
import { SectionDivider } from "./ui/SectionDivider";
import { SenseEntries } from "./ui/SenseEntries";
import { StatBox } from "./ui/StatBox";
import { SubHeading } from "./ui/SubHeading";
import { RichText } from "./RichText";

const GROUP_LABELS: Record<NonNullable<CreatureTrait["group"]>, string> = {
  trait: "Traits",
  action: "Actions",
  bonusAction: "Bonus Actions",
  reaction: "Reactions",
  legendary: "Legendary Actions",
};
const GROUP_ORDER: Array<NonNullable<CreatureTrait["group"]>> = [
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
 * Traits/Actions/Reactions/Legendary Actions — shared between the compact
 * `CreatureCard` and `CreatureDetailsModal` so the two can never drift apart
 * in what they show or how editing behaves; only the surrounding chrome
 * (card border vs. modal shell) and header/footer/notes differ between them.
 */
export function CreatureStatBlock({
  creature,
  onUpdate,
  showActionGroups = true,
}: {
  creature: Creature;
  onUpdate?: (id: string, updates: Partial<Creature>) => void;
  /** Hides Traits/Actions/Bonus Actions/Reactions/Legendary Actions — the compact `CreatureCard` turns this off to keep cards short enough to tell apart at a glance mid-session; `CreatureDetailsModal` leaves it on (the default) so nothing is lost, just one click away. */
  showActionGroups?: boolean;
}) {
  const isDown = creature.hp <= 0;
  const flaggedTraits = creature.flaggedTraits ?? [];
  const skills = parseCreatureSkills(creature.skills);
  const senses = parseCreatureSenses(creature.senses);
  const passivePerception = senses.passivePerception ?? computePassiveSkill("perception", skills, creature.stats.wis);
  const passiveInvestigation = computePassiveSkill("investigation", skills, creature.stats.int);
  const passiveInsight = computePassiveSkill("insight", skills, creature.stats.wis);
  const deathSaves = creature.deathSaves ?? { successes: 0, failures: 0 };

  function toggleFlag(name: string) {
    if (!onUpdate) return;
    const next = flaggedTraits.includes(name)
      ? flaggedTraits.filter((n) => n !== name)
      : [...flaggedTraits, name];
    onUpdate(creature.id, { flaggedTraits: next });
  }

  // A heal (or DM correction) back above 0 clears any death-save progress —
  // otherwise a creature that gets knocked down again later would reopen the
  // tracker showing whatever partial successes/failures it had last time,
  // which is stale, not carried-over state.
  function handleHpChange(hp: number) {
    if (!onUpdate) return;
    onUpdate(creature.id, hp > 0 ? { hp, deathSaves: { successes: 0, failures: 0 } } : { hp });
  }

  const groups = GROUP_ORDER.map((group) => ({
    group,
    items: creature.traits.filter((t) => (t.group ?? "trait") === group),
  })).filter((g) => g.items.length > 0);

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
        {creature.hitDice && <p className="text-xs text-slate-500">Hit Dice: {creature.hitDice}</p>}
        {creature.source && <p className="text-xs text-slate-500">Source: {creature.source}</p>}

        <div className="space-y-1.5 text-sm text-slate-300">
          <IconStat
            icon={<ShieldIcon className="h-3.5 w-3.5 shrink-0 text-slate-500" />}
            panel={<p>Armor Class — the number an attack roll must meet or beat to hit it.</p>}
            label="AC"
          >
            {creature.ac}
            {creature.armorDesc && <span className="text-slate-500"> ({creature.armorDesc})</span>}
          </IconStat>
          <IconStat
            icon={<SpeedIcon className="h-3.5 w-3.5 shrink-0 text-slate-500" />}
            panel={<p>Speed — how many feet it can move on its turn.</p>}
            label="Speed"
          >
            {creature.speedDetail ?? `${creature.speed}ft`}
          </IconStat>
          {creature.initiativeBonus !== undefined && (
            <IconStat
              icon={<InitiativeIcon className="h-3.5 w-3.5 shrink-0 text-slate-500" />}
              panel={<p>Initiative — added to a d20 roll at the start of combat to determine turn order.</p>}
              label="Initiative"
            >
              {formatModifier(creature.initiativeBonus)}
            </IconStat>
          )}
          <IconStat
            icon={<LanguageIcon className="h-3.5 w-3.5 shrink-0 text-slate-500" />}
            panel={<p>Languages — the languages this creature can speak, read, or understand.</p>}
            label="Languages:"
            valueTitle={creature.languages}
          >
            {creature.languages || "—"}
          </IconStat>
        </div>
      </div>

      <SectionDivider>
        <SubHeading>Senses</SubHeading>
        <div className="grid grid-cols-3 gap-1.5">
          <Pill
            panel={
              <p>
                Passive Perception — the score a hidden creature or object must beat to avoid its notice; also what
                Stealth checks are rolled against.
              </p>
            }
          >
            {SKILL_ABBR.perception} {passivePerception}
          </Pill>
          <Pill panel={<p>Passive Investigation — used to notice details or work out clues without an active search.</p>}>
            {SKILL_ABBR.investigation} {passiveInvestigation}
          </Pill>
          <Pill panel={<p>Passive Insight — used to sense deception or read intentions without rolling.</p>}>
            {SKILL_ABBR.insight} {passiveInsight}
          </Pill>
        </div>
        {senses.entries.length > 0 && (
          <div className="mt-4">
            <SenseEntries senses={senses.entries} />
          </div>
        )}
      </SectionDivider>

      <SectionDivider>
        <SubHeading>Stats</SubHeading>
        <div className="grid grid-cols-6 gap-1.5">
          {STAT_ORDER.map((key) => (
            <StatBox key={key} label={key.toUpperCase()} value={formatModifier(abilityModifier(creature.stats[key]))} />
          ))}
        </div>
      </SectionDivider>

      <div>
        <SubHeading>Saving Throws</SubHeading>
        <div className="grid grid-cols-6 gap-1.5">
          {STAT_ORDER.map((key) => {
            const plainMod = abilityModifier(creature.stats[key]);
            const save = creature.savingThrows?.[key] ?? plainMod;
            return (
              <StatBox key={key} label={key.toUpperCase()} value={formatModifier(save)} highlight={save !== plainMod} />
            );
          })}
        </div>
      </div>

      <DamageInfoList
        entries={[
          {
            label: "Resist",
            value: creature.damageResistances,
            panel: <p>Resistance — takes half damage from this damage type.</p>,
          },
          {
            label: "Immune",
            value: creature.damageImmunities,
            panel: <p>Immunity — takes no damage from this damage type.</p>,
          },
          {
            label: "Vulnerable",
            value: creature.damageVulnerabilities,
            panel: <p>Vulnerability — takes double damage from this damage type.</p>,
          },
          {
            label: "Condition Immunities",
            value: creature.conditionImmunities,
            panel: <p>Condition Immunity — can&apos;t be affected by this condition at all.</p>,
          },
        ]}
      />

      {skills.length > 0 && (
        <SectionDivider>
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

      {showActionGroups && groups.length > 0 && (
        <SectionDivider className="space-y-3">
          {groups.map(({ group, items }) => (
            <div key={group} className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-slate-500">{GROUP_LABELS[group]}</p>
              {items.map((trait, index) => {
                const flagged = flaggedTraits.includes(trait.name);
                return (
                  <FlaggableRow key={`${group}-${index}`} flagged={flagged} onToggleFlag={() => toggleFlag(trait.name)}>
                    <span className="font-semibold">{trait.name}.</span>{" "}
                    {trait.description && <RichText text={trait.description} />}
                  </FlaggableRow>
                );
              })}
            </div>
          ))}
        </SectionDivider>
      )}
    </>
  );
}
