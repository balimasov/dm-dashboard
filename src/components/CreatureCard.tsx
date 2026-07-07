"use client";

import { AbilityScores, Character, Creature, abilityModifier, creatureInfoLine, formatModifier } from "@/lib/types";
import { HpBar, ShieldIcon, SpeedIcon, StatBox, STAT_ORDER } from "./CharacterCard";

/**
 * A deliberately lighter sibling of `CharacterCard` for companions/summoned
 * creatures (a Find Steed mount, a Wild Shape form, a familiar...) — no
 * skills/spells/inventory, just the stats a DM actually needs mid-combat.
 * Editing lives entirely in the campaign's Settings modal
 * (`CreatureRosterEditor`), same as adding/removing a player character does
 * — this card is read-only.
 */
export function CreatureCard({ creature, owner }: { creature: Creature; owner?: Character }) {
  const isDown = creature.hp <= 0;
  const infoLine = creatureInfoLine(creature);

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
          AC {creature.ac}
        </span>
        <span className="flex items-center gap-1.5 pl-2">
          <SpeedIcon className="h-3.5 w-3.5 shrink-0 text-slate-500" />
          Speed {creature.speed}ft
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
        {STAT_ORDER.map((key: keyof AbilityScores) => (
          <StatBox key={key} label={key.toUpperCase()} value={formatModifier(abilityModifier(creature.stats[key]))} />
        ))}
      </div>

      {creature.traits.length > 0 && (
        <div className="space-y-1 border-t border-slate-800 pt-2 text-sm">
          {creature.traits.map((t, index) => (
            <p key={index}>
              <span className="font-medium text-slate-200">{t.name}.</span>{" "}
              {t.description && <span className="text-slate-400">{t.description}</span>}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
