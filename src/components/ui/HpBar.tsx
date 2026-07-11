import { NumberInput } from "@/components/NumberInput";
import { DotMeter } from "@/components/ResourceMeter";

export function HpBar({
  hp,
  maxHp,
  tempHp,
  isDown,
  deathSaves,
  onHpChange,
  onTempHpChange,
  onDeathSavesChange,
}: {
  hp: number;
  maxHp: number;
  tempHp: number;
  isDown: boolean;
  deathSaves?: { successes: number; failures: number };
  /** Passing these turns HP/temp HP/death saves into click-to-edit fields — omit to keep the bar read-only (e.g. on `CharacterCard`, not wired up yet). */
  onHpChange?: (hp: number) => void;
  onTempHpChange?: (tempHp: number) => void;
  onDeathSavesChange?: (deathSaves: { successes: number; failures: number }) => void;
}) {
  // Percentage-of-maxHp drives the danger-color thresholds (a character at
  // full real HP should never read as anything but healthy, regardless of
  // temp HP). Bar *widths* use a separate scale that grows past maxHp
  // whenever temp HP doesn't fit in the remaining headroom — e.g. at full
  // HP the "remaining room" is 0, so without this the temp segment would
  // get zero width and silently vanish instead of showing up as extra bar
  // stacked on past the end.
  const hpRatio = maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0;
  const barScale = Math.max(maxHp, hp + tempHp, 1);
  const hpBarPct = (hp / barScale) * 100;
  const tempBarPct = (tempHp / barScale) * 100;
  const hpColor = hpRatio > 50 ? "bg-emerald-500" : hpRatio > 25 ? "bg-amber-500" : "bg-red-600";
  const hpTextColor = hpRatio > 50 ? "text-emerald-400" : hpRatio > 25 ? "text-amber-400" : "text-red-400";

  return (
    <div>
      <div className="mb-1 flex min-h-8 items-baseline justify-between">
        <span className="text-sm text-slate-300">HP</span>
        {isDown && deathSaves ? (
          <span className="text-sm font-medium">
            {/* Zero-width but text-2xl-sized, so this line's shared baseline sits at the same depth as the normal HP display below — a real character here would need width:0 tricks that break the baseline math (an inline-block clipped to 0 width computes its baseline from its bottom margin edge, not its text), but U+200B has zero advance width on its own. */}
            <span aria-hidden className="text-2xl">
              {"​"}
            </span>
            <span className="text-slate-400">Death Saves:</span>{" "}
            <span className="inline-flex items-center gap-1 align-middle text-emerald-400">
              ✅
              <DotMeter
                current={deathSaves.successes}
                max={3}
                colorClass="bg-emerald-500"
                onSetCount={
                  onDeathSavesChange ? (n) => onDeathSavesChange({ ...deathSaves, successes: n }) : undefined
                }
              />
            </span>
            <span className="text-slate-600"> · </span>
            <span className="inline-flex items-center gap-1 align-middle text-red-400">
              ❌
              <DotMeter
                current={deathSaves.failures}
                max={3}
                colorClass="bg-red-500"
                onSetCount={onDeathSavesChange ? (n) => onDeathSavesChange({ ...deathSaves, failures: n }) : undefined}
              />
            </span>
          </span>
        ) : (
          <span className="flex items-baseline text-sm font-medium text-slate-100">
            {onHpChange ? (
              <NumberInput
                value={hp}
                onChange={onHpChange}
                min={0}
                max={maxHp}
                selectOnFocus
                className={`w-11 rounded border border-slate-700 bg-transparent text-right text-2xl font-bold outline-none hover:border-slate-500 focus:border-slate-400 focus:bg-slate-800 ${hpTextColor}`}
              />
            ) : (
              <span className={`text-2xl font-bold ${hpTextColor}`}>{hp}</span>
            )}
            <span className="text-slate-500"> / {maxHp}</span>
            {onTempHpChange ? (
              <span className={`ml-1 flex items-baseline ${tempHp > 0 ? "text-amber-400" : "text-slate-600"}`}>
                (+
                <NumberInput
                  value={tempHp}
                  onChange={onTempHpChange}
                  min={0}
                  selectOnFocus
                  className="w-7 rounded border border-slate-700 bg-transparent text-center outline-none hover:border-amber-700 focus:border-amber-500 focus:bg-slate-800"
                />
                temp)
              </span>
            ) : (
              tempHp > 0 && <span className="text-amber-400"> (+{tempHp} temp)</span>
            )}
          </span>
        )}
      </div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full ${hpColor}`} style={{ width: `${hpBarPct}%` }} />
        <div className="h-full bg-amber-400" style={{ width: `${tempBarPct}%` }} />
      </div>
    </div>
  );
}
