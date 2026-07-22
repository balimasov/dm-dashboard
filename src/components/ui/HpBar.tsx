import { NumberInput } from "@/components/NumberInput";
import { DotMeter } from "@/components/ResourceMeter";
import { InfoTooltip } from "@/components/InfoTooltip";
import { tierColorClass, tierTextClass } from "@/lib/tierColor";

/** A drop, not a heart — "bloodied" is blood, not health. */
function BloodDropIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2.5c-.4.6-1.6 2.3-2.8 4.4C7.4 10.2 6 13 6 15.2 6 18.9 8.7 22 12 22s6-3.1 6-6.8c0-2.2-1.4-5-3.2-8.3-1.2-2.1-2.4-3.8-2.8-4.4Z" />
    </svg>
  );
}

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
  // Slightly darker/more saturated than the shared `tierBgClass` 400-shade preset — this bar is
  // wider and more prominent than a resource tracker's thin strip, so it reads better a shade
  // deeper; only the fill uses its own shades, the text stays the standard tier-400 color.
  const hpColor = tierColorClass(hpRatio, { high: "bg-emerald-500", mid: "bg-amber-500", low: "bg-red-600" });
  const hpTextColor = tierTextClass(hpRatio);
  // "Bloodied" is a passive threshold (half max HP or less), not something the
  // DM sets — it's derived here rather than stored so it never drifts out of
  // sync with hp/maxHp the way a manually-toggled flag could.
  const bloodied = maxHp > 0 && hp > 0 && hp <= maxHp / 2;

  return (
    <div>
      <div className="mb-1 flex min-h-8 items-baseline justify-between">
        <span className="flex items-center gap-1 text-sm text-slate-300">
          HP
          {bloodied && (
            <InfoTooltip hoverOnly panel={<p>Bloodied — at half its max HP or less.</p>}>
              <BloodDropIcon className="h-3 w-3 shrink-0 text-red-500" />
            </InfoTooltip>
          )}
        </span>
        {isDown && deathSaves ? (
          // A 300px card has no room for the HP input *and* the full "Death
          // Saves: ..." phrase on one line — shortened to "Saves" so this
          // never wraps: wrapping would grow this row (and therefore the
          // whole card) taller only while a creature happens to be down,
          // shifting everything below it and misaligning the card against
          // its neighbors in the same row.
          <span className="flex items-baseline gap-1.5 text-sm font-medium">
            {/* Still editable, not just a static "0" — a heal (or enough death-save
                successes to stabilize) needs some way to bring HP back up without
                leaving the card, and once it's positive `isDown` flips on its own,
                switching this row back to the normal HP display. Also what
                establishes this row's baseline now (used to be a zero-width
                placeholder span, back when this branch had no 2xl-sized content
                of its own to match the other branch's baseline depth). */}
            {onHpChange ? (
              <NumberInput
                value={hp}
                onChange={onHpChange}
                min={0}
                max={maxHp}
                selectOnFocus
                commitOnBlur
                deltaMode
                className={`w-14 rounded-md border border-slate-700 bg-transparent px-1 py-0.5 text-right text-2xl font-bold leading-none outline-none hover:border-slate-500 focus:border-slate-400 focus:bg-slate-800 ${hpTextColor}`}
              />
            ) : (
              <span className={`text-2xl font-bold ${hpTextColor}`}>{hp}</span>
            )}
            <span className="text-slate-400">Saves</span>
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
            <span className="text-slate-600">·</span>
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
                commitOnBlur
                deltaMode
                className={`w-14 rounded-md border border-slate-700 bg-transparent px-1 py-0.5 text-right text-2xl font-bold leading-none outline-none hover:border-slate-500 focus:border-slate-400 focus:bg-slate-800 ${hpTextColor}`}
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
                  commitOnBlur
                  className="w-9 rounded-md border border-slate-700 bg-transparent px-1 py-0.5 text-right leading-none outline-none hover:border-amber-700 focus:border-amber-500 focus:bg-slate-800"
                />
                THP)
              </span>
            ) : (
              // A leading space in a flex item's own text gets trimmed by the
              // browser (each flex item starts its own inline formatting
              // context, and CSS collapses whitespace at the start of a line)
              // — margin instead of a literal space, same as the editable
              // branch above already does for the same reason.
              tempHp > 0 && <span className="ml-1 text-amber-400">(+{tempHp} THP)</span>
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
