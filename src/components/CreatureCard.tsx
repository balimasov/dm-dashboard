"use client";

import Link from "next/link";
import { Character, Creature, CreatureTrait, abilityModifier, creatureInfoLine, formatModifier } from "@/lib/types";
import { FlaggableRow } from "./CharacterDetailsModal";
import { HpBar, ShieldIcon, SpeedIcon, StatBox, STAT_ORDER } from "./CharacterCard";
import { InfoTooltip } from "./InfoTooltip";

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
      <div className="min-w-0">
        <p className="truncate text-lg font-semibold text-slate-100">{creature.name}</p>
        {infoLine && <p className="truncate text-xs text-slate-500">{infoLine}</p>}
        {(owner || creature.source) && (
          <p className="mt-0.5 truncate text-xs text-slate-600">
            {owner && `Owner: ${owner.name}`}
            {owner && creature.source && " · "}
            {creature.source}
          </p>
        )}
      </div>

      <HpBar hp={creature.hp} maxHp={creature.maxHp} tempHp={creature.tempHp} isDown={isDown} />

      <div className="grid grid-cols-2 gap-1.5 text-sm text-slate-300">
        <span className="flex items-center gap-1.5">
          <ShieldIcon className="h-3.5 w-3.5 shrink-0 text-slate-500" />
          <span className="min-w-0 flex-1">
            <InfoTooltip panel={<p>Armor Class — the number an attack roll must meet or beat to hit it.</p>}>
              AC {creature.ac}
            </InfoTooltip>
          </span>
        </span>
        <span className="flex items-center gap-1.5 pl-2">
          <SpeedIcon className="h-3.5 w-3.5 shrink-0 text-slate-500" />
          <span className="min-w-0 flex-1">
            <InfoTooltip panel={<p>Speed — how many feet it can move on its turn.</p>}>
              Speed {creature.speed}ft
            </InfoTooltip>
          </span>
        </span>
      </div>

      <div>
        <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">Stats</p>
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
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
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
          {STAT_ORDER.map((key) => {
            const plainMod = abilityModifier(creature.stats[key]);
            const save = creature.savingThrows?.[key] ?? plainMod;
            return (
              <StatBox key={key} label={key.toUpperCase()} value={formatModifier(save)} highlight={save !== plainMod} />
            );
          })}
        </div>
      </div>

      {(creature.senses ||
        creature.languages ||
        creature.challengeRating ||
        creature.damageVulnerabilities ||
        creature.damageResistances ||
        creature.damageImmunities ||
        creature.conditionImmunities) && (
        <div className="space-y-1 border-t border-slate-800 pt-2 text-sm text-slate-300">
          {creature.senses && (
            <p>
              <span className="text-slate-500">Senses:</span> {creature.senses}
            </p>
          )}
          {creature.languages && (
            <p>
              <span className="text-slate-500">Languages:</span> {creature.languages}
            </p>
          )}
          {creature.challengeRating && (
            <p>
              <span className="text-slate-500">CR:</span> {creature.challengeRating}
            </p>
          )}
          {creature.damageVulnerabilities && (
            <p>
              <span className="text-slate-500">Vulnerabilities:</span> {creature.damageVulnerabilities}
            </p>
          )}
          {creature.damageResistances && (
            <p>
              <span className="text-slate-500">Resistances:</span> {creature.damageResistances}
            </p>
          )}
          {creature.damageImmunities && (
            <p>
              <span className="text-slate-500">Damage Immunities:</span> {creature.damageImmunities}
            </p>
          )}
          {creature.conditionImmunities && (
            <p>
              <span className="text-slate-500">Condition Immunities:</span> {creature.conditionImmunities}
            </p>
          )}
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
                    {trait.description && <span>{trait.description}</span>}
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
