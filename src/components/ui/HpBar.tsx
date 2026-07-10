export function HpBar({
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
            <span className="text-emerald-400">✅ {deathSaves.successes}/3</span>
            <span className="text-slate-600"> · </span>
            <span className="text-red-400">❌ {deathSaves.failures}/3</span>
          </span>
        ) : (
          <span className="text-sm font-medium text-slate-100">
            <span className={`text-2xl font-bold ${hpTextColor}`}>{hp}</span>
            <span className="text-slate-500"> / {maxHp}</span>
            {tempHp > 0 && <span className="text-amber-400"> (+{tempHp} temp)</span>}
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
