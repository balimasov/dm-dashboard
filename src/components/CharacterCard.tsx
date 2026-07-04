import Link from "next/link";
import {
  Character,
  abilityModifier,
  formatModifier,
  characterInfoLine,
  savingThrowBonus,
} from "@/lib/types";
import { ResourceMeter } from "./ResourceMeter";
import { SyncTimestamp } from "./SyncTimestamp";
import { CharacterAvatar } from "./CharacterAvatar";
import { InfoTooltip } from "./InfoTooltip";
import { getConditionInfo, getExhaustionEffect, EXHAUSTION_RULES_TEXT } from "@/lib/conditionInfo";

const STAT_ORDER: Array<keyof Character["stats"]> = [
  "str",
  "dex",
  "con",
  "int",
  "wis",
  "cha",
];

function HpBar({
  hp,
  maxHp,
  tempHp,
  isDown,
  deathSaves,
}: {
  hp: number;
  maxHp: number;
  tempHp: number;
  isDown: boolean;
  deathSaves?: { successes: number; failures: number };
}) {
  const hpPct = maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0;
  const tempPct = maxHp > 0 ? Math.max(0, Math.min(100 - hpPct, (tempHp / maxHp) * 100)) : 0;
  const hpColor = hpPct > 50 ? "bg-emerald-500" : hpPct > 25 ? "bg-amber-500" : "bg-red-600";

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-sm text-slate-300">HP</span>
        {isDown && deathSaves ? (
          <span className="text-sm font-medium text-red-400">
            Death Saves: ✅ {deathSaves.successes}/3 · ❌ {deathSaves.failures}/3
          </span>
        ) : (
          <span className="font-medium text-slate-100">
            <span className="text-lg font-bold">{hp}</span>
            <span className="text-slate-500"> / {maxHp}</span>
            {tempHp > 0 && <span className="text-sm text-sky-400"> (+{tempHp} temp)</span>}
          </span>
        )}
      </div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full ${hpColor}`} style={{ width: `${hpPct}%` }} />
        <div className="h-full bg-amber-400" style={{ width: `${tempPct}%` }} />
      </div>
    </div>
  );
}

function ExhaustionPanel({ level }: { level: number }) {
  const effect = getExhaustionEffect(level);
  return (
    <div className="space-y-2">
      <p>{EXHAUSTION_RULES_TEXT}</p>
      {effect && (
        <p className="border-t border-slate-700 pt-2 font-semibold text-amber-300">
          Зараз (рівень {level}): −{effect.d20Penalty} до d20-перевірок, швидкість −{effect.speedPenalty} фт.
        </p>
      )}
    </div>
  );
}

function ConditionsPanel({ conditions }: { conditions: string[] }) {
  return (
    <div className="space-y-1.5">
      {conditions.map((condition) => {
        const info = getConditionInfo(condition);
        return (
          <div key={condition}>
            <p className="font-semibold text-slate-100">{condition}</p>
            {info && <p>{info}</p>}
          </div>
        );
      })}
    </div>
  );
}

function StatBox({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center rounded-md border py-1.5 ${
        highlight ? "border-sky-700 bg-sky-950/40" : "border-slate-800 bg-slate-800/40"
      }`}
    >
      <span className={`text-sm font-bold ${highlight ? "text-sky-300" : "text-slate-100"}`}>{value}</span>
      <span className="text-[10px] uppercase tracking-wide text-slate-500">{label}</span>
    </div>
  );
}

export function CharacterCard({
  character,
  onRemove,
}: {
  character: Character;
  onRemove?: (id: string) => void;
}) {
  const c = character;
  const isDown = c.combat.hp <= 0;
  const hasDamageInfo = c.resistances.length + c.immunities.length + c.vulnerabilities.length > 0;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-black/20 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <CharacterAvatar character={c} size="md" />
        <div className="min-w-0 flex-1">
          <h2
            title={c.name}
            className="truncate text-lg font-semibold text-slate-50 transition-colors hover:text-white"
          >
            {c.name}
          </h2>
          <p
            title={characterInfoLine(c)}
            className="truncate text-sm text-slate-400 transition-colors hover:text-slate-200"
          >
            {characterInfoLine(c)}
          </p>
          <p className="text-xs text-slate-500">Lvl {c.level}</p>
        </div>
        <span
          title={c.heroicInspiration ? "Heroic Inspiration: available" : "Heroic Inspiration: none"}
          className={`shrink-0 text-3xl leading-none ${c.heroicInspiration ? "text-amber-400" : "text-slate-700"}`}
        >
          ★
        </span>
      </div>

      {!c.synced && c.dndBeyondUrl && (
        <div className="rounded-md bg-amber-950/40 border border-amber-900 px-2 py-1 text-xs text-amber-300">
          Не синхронізовано з D&D Beyond — заповніть дані вручну.
        </div>
      )}

      {/* Combat state */}
      <div className="space-y-2">
        <HpBar
          hp={c.combat.hp}
          maxHp={c.combat.maxHp}
          tempHp={c.combat.tempHp}
          isDown={isDown}
          deathSaves={c.combat.deathSaves}
        />
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-300">
          <span>AC: {c.combat.ac}</span>
          <span>Speed: {c.combat.speed} ft</span>
          <span>Initiative: {formatModifier(c.initiative)}</span>
          <InfoTooltip panel={<ExhaustionPanel level={c.combat.exhaustion} />}>
            Exhaustion: {c.combat.exhaustion}
          </InfoTooltip>
          <span className="col-span-2">
            {c.combat.conditions.length > 0 ? (
              <InfoTooltip panel={<ConditionsPanel conditions={c.combat.conditions} />}>
                Conditions: {c.combat.conditions.join(", ")}
              </InfoTooltip>
            ) : (
              <span className="block truncate">Conditions: none</span>
            )}
          </span>
        </div>
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
      {hasDamageInfo && (
        <div className="space-y-1 text-xs text-slate-300">
          {c.resistances.length > 0 && (
            <p>
              <span className="text-slate-500">Resist:</span> {c.resistances.join(", ")}
            </p>
          )}
          {c.immunities.length > 0 && (
            <p>
              <span className="text-slate-500">Immune:</span> {c.immunities.join(", ")}
            </p>
          )}
          {c.vulnerabilities.length > 0 && (
            <p>
              <span className="text-slate-500">Vulnerable:</span> {c.vulnerabilities.join(", ")}
            </p>
          )}
        </div>
      )}

      {/* Senses */}
      <div className="border-t border-slate-800 pt-3 space-y-1.5">
        <h3 className="text-xs uppercase tracking-wide text-slate-500 mb-1">Senses</h3>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-300">
          <span title="Passive Perception">Perception {c.combat.passivePerception}</span>
          <span title="Passive Investigation">Investigation {c.combat.passiveInvestigation}</span>
          <span title="Passive Insight">Insight {c.combat.passiveInsight}</span>
        </div>
        {c.senses.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400">
            {c.senses.map((s) => (
              <span key={s.name}>
                {s.name} {s.range} ft
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Resources */}
      {c.resources.length > 0 && (
        <div className="border-t border-slate-800 pt-3 space-y-1.5">
          <h3 className="text-xs uppercase tracking-wide text-slate-500 mb-1">
            Resources
          </h3>
          {c.resources.map((r) => (
            <ResourceMeter key={r.id} resource={r} />
          ))}
        </div>
      )}

      {/* Spell slots */}
      {c.spellSlots.length > 0 && (
        <div className="border-t border-slate-800 pt-3">
          <h3 className="text-xs uppercase tracking-wide text-slate-500 mb-1">
            Spell Slots
          </h3>
          <p className="mb-1.5 truncate text-sm text-violet-300">
            Concentration: {c.combat.concentration || "none"}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-300">
            {c.spellSlots
              .slice()
              .sort((a, b) => a.level - b.level)
              .map((s) => (
                <span key={s.level}>
                  L{s.level}: {s.current}/{s.max}
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {c.notes && (
        <div className="border-t border-slate-800 pt-3">
          <h3 className="text-xs uppercase tracking-wide text-slate-500 mb-1">Notes</h3>
          <p className="text-sm text-slate-400 leading-snug">{c.notes}</p>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-slate-800 pt-3 text-xs">
        {c.dndBeyondUrl ? (
          <div>
            <a
              href={c.dndBeyondUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sky-400 hover:underline"
            >
              D&D Beyond ↗
            </a>
            {c.lastSyncedAt && (
              <p className="text-slate-600">
                Синхронізовано: <SyncTimestamp iso={c.lastSyncedAt} />
              </p>
            )}
          </div>
        ) : (
          <span />
        )}
        <div className="flex gap-3">
          <Link href={`/characters/${c.id}/edit`} className="text-slate-400 hover:text-slate-200">
            Edit
          </Link>
          {onRemove && (
            <button
              onClick={() => onRemove(c.id)}
              className="text-red-500/80 hover:text-red-400"
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
