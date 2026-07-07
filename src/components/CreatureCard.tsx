"use client";

import Link from "next/link";
import {
  Character,
  Creature,
  CreatureTrait,
  SKILL_ABBR,
  SKILL_ABILITY,
  SKILL_DESCRIPTIONS,
  abilityModifier,
  creatureInfoLine,
  formatModifier,
} from "@/lib/types";
import {
  computePassiveSkill,
  ParsedCreatureSkill,
  parseCreatureSenses,
  parseCreatureSkills,
} from "@/lib/creatureStatText";
import { FlaggableRow } from "./CharacterDetailsModal";
import {
  DamageInfoList,
  HpBar,
  IconStat,
  InitiativeIcon,
  LanguageIcon,
  Pill,
  SenseEntries,
  ShieldIcon,
  SpeedIcon,
  StatBox,
  STAT_ORDER,
} from "./CharacterCard";
import { Avatar } from "./Avatar";
import { InfoTooltip } from "./InfoTooltip";
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
    <div className="space-y-1">
      <p className="font-medium text-slate-100">
        {skill.label}
        {skill.name && <span className="text-slate-500"> ({SKILL_ABILITY[skill.name].toUpperCase()})</span>}
      </p>
      {skill.name && <p>{SKILL_DESCRIPTIONS[skill.name]}</p>}
    </div>
  );
}

/**
 * A deliberately lighter sibling of `CharacterCard` for companions/summoned
 * creatures (a Find Steed mount, a Wild Shape form, a familiar...) — same
 * combat-stat/tooltip/flame-flag conventions as the character card, but no
 * skills/spells/inventory. `onUpdate` drives both inline HP editing (not yet
 * wired here beyond flags) and the flame-flag toggle on traits/actions;
 * "Edit" links to a dedicated `/creatures/[id]/edit` page (same convention as
 * `CharacterCard`'s own Edit link), `onRemove` deletes it — same affordances
 * `CharacterCard` exposes at the bottom of its own card.
 */
export function CreatureCard({
  creature,
  owner,
  onUpdate,
  onRemove,
}: {
  creature: Creature;
  owner?: Character;
  onUpdate?: (id: string, updates: Partial<Creature>) => void;
  onRemove?: (id: string) => void;
}) {
  const isDown = creature.hp <= 0;
  const infoLine = [creatureInfoLine(creature), creature.alignment].filter(Boolean).join(", ");
  const flaggedTraits = creature.flaggedTraits ?? [];
  const skills = parseCreatureSkills(creature.skills);
  const senses = parseCreatureSenses(creature.senses);
  const passivePerception = senses.passivePerception ?? computePassiveSkill("perception", skills, creature.stats.wis);
  const passiveInvestigation = computePassiveSkill("investigation", skills, creature.stats.int);
  const passiveInsight = computePassiveSkill("insight", skills, creature.stats.wis);

  function toggleFlag(name: string) {
    if (!onUpdate) return;
    const next = flaggedTraits.includes(name)
      ? flaggedTraits.filter((n) => n !== name)
      : [...flaggedTraits, name];
    onUpdate(creature.id, { flaggedTraits: next });
  }

  const groups = GROUP_ORDER.map((group) => ({
    group,
    items: creature.traits.filter((t) => (t.group ?? "trait") === group),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-black/20">
      <div className="flex items-start gap-3">
        <Avatar src={creature.avatarUrl} label={creature.name} size="md" />
        <div className="min-w-0 flex-1">
          <p title={creature.name} className="truncate text-lg font-semibold text-slate-50">
            {creature.name}
          </p>
          {infoLine && (
            <p title={infoLine} className="truncate text-sm text-slate-400">
              {infoLine}
            </p>
          )}
          {creature.challengeRating && <p className="text-xs text-slate-500">CR {creature.challengeRating}</p>}
        </div>
        {owner && (
          <InfoTooltip hoverOnly panel={<p>Owner: {owner.name}</p>}>
            <Avatar src={owner.avatarUrl} label={owner.name} size="xs" />
          </InfoTooltip>
        )}
      </div>

      <HpBar hp={creature.hp} maxHp={creature.maxHp} tempHp={creature.tempHp} isDown={isDown} />
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
        {creature.languages && (
          <IconStat
            icon={<LanguageIcon className="h-3.5 w-3.5 shrink-0 text-slate-500" />}
            panel={<p>Languages — the languages this creature can speak, read, or understand.</p>}
            label="Languages:"
          >
            {creature.languages}
          </IconStat>
        )}
      </div>

      <div className="border-t border-slate-800 pt-3">
        <h3 className="mb-1.5 text-xs uppercase tracking-wide text-slate-500">Senses</h3>
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
      </div>

      <div>
        <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">Stats</p>
        <div className="grid grid-cols-6 gap-1.5">
          {STAT_ORDER.map((key) => (
            <StatBox
              key={key}
              label={key.toUpperCase()}
              value={formatModifier(abilityModifier(creature.stats[key]))}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">Saving Throws</p>
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
        <div className="border-t border-slate-800 pt-3">
          <h3 className="mb-1.5 text-xs uppercase tracking-wide text-slate-500">Skills</h3>
          <div className="flex flex-wrap gap-1.5">
            {skills.map((skill, index) => (
              <Pill key={`${skill.label}-${index}`} panel={<CreatureSkillPanel skill={skill} />} color="amber">
                {skill.bonus !== null && `${formatModifier(skill.bonus)} `}
                {skill.name ? SKILL_ABBR[skill.name] : skill.label}
              </Pill>
            ))}
          </div>
        </div>
      )}

      {groups.length > 0 && (
        <div className="space-y-3 border-t border-slate-800 pt-2">
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
        </div>
      )}

      {onRemove && (
        <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-3 text-xs">
          <Link href={`/creatures/${creature.id}/edit`} className="text-slate-400 hover:text-slate-200">
            Edit
          </Link>
          <button
            type="button"
            onClick={() => onRemove(creature.id)}
            className="text-red-500/80 hover:text-red-400"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}
