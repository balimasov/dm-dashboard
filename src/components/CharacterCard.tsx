import Link from "next/link";
import { Character, abilityModifier, formatModifier } from "@/lib/types";
import { ResourceMeter } from "./ResourceMeter";

const STAT_ORDER: Array<keyof Character["stats"]> = [
  "str",
  "dex",
  "con",
  "int",
  "wis",
  "cha",
];

function HpBar({ hp, maxHp, tempHp }: { hp: number; maxHp: number; tempHp: number }) {
  const pct = maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0;
  const color =
    pct > 50 ? "bg-emerald-500" : pct > 25 ? "bg-amber-500" : "bg-red-600";
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-300">HP</span>
        <span className="font-medium text-slate-100">
          {hp} / {maxHp}
          {tempHp > 0 && <span className="text-sky-400"> (+{tempHp} temp)</span>}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
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

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-black/20 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-50">{c.name}</h2>
          <p className="text-sm text-slate-400">
            {c.race} · {c.className}
            {c.subclass ? ` ${c.subclass}` : ""} · Level {c.level}
          </p>
          {c.role && <p className="text-xs text-slate-500 mt-0.5">Role: {c.role}</p>}
        </div>
        <div className="flex flex-col items-end gap-1 text-xs">
          <span
            title="Heroic Inspiration"
            className={c.heroicInspiration ? "text-amber-400" : "text-slate-600"}
          >
            {c.heroicInspiration ? "Heroic ✅" : "Heroic ❌"}
          </span>
          <span className="text-slate-300">Init {formatModifier(c.initiative)}</span>
        </div>
      </div>

      {!c.synced && c.dndBeyondUrl && (
        <div className="rounded-md bg-amber-950/40 border border-amber-900 px-2 py-1 text-xs text-amber-300">
          Не синхронізовано з D&D Beyond — заповніть дані вручну.
        </div>
      )}

      {/* Combat state */}
      <div className="space-y-2">
        <HpBar hp={c.combat.hp} maxHp={c.combat.maxHp} tempHp={c.combat.tempHp} />
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-300">
          <span>AC: {c.combat.ac}</span>
          <span>Speed: {c.combat.speed} ft</span>
          <span>Passive Perception: {c.combat.passivePerception}</span>
          <span>Exhaustion: {c.combat.exhaustion}</span>
          <span className="col-span-2">
            Conditions:{" "}
            {c.combat.conditions.length > 0 ? c.combat.conditions.join(", ") : "none"}
          </span>
          {c.combat.concentration && (
            <span className="col-span-2 text-violet-300">
              Concentration: {c.combat.concentration}
            </span>
          )}
          {isDown && c.combat.deathSaves && (
            <span className="col-span-2 text-red-400">
              Death Saves: ✅ {c.combat.deathSaves.successes}/3 · ❌{" "}
              {c.combat.deathSaves.failures}/3
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-y-1 text-sm text-slate-300 border-t border-slate-800 pt-3">
        {STAT_ORDER.map((key) => (
          <span key={key}>
            {key.toUpperCase()} {c.stats[key]}/{formatModifier(abilityModifier(c.stats[key]))}
          </span>
        ))}
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
          <a
            href={c.dndBeyondUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sky-400 hover:underline"
          >
            D&D Beyond ↗
          </a>
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
