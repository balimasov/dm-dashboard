/**
 * Shared "how worried should I be" danger-tier threshold: healthy/topped-up
 * above 50%, getting low 25-50%, critical at or below 25% — the same tiers
 * `HpBar`, `ResourceMeter`'s tracker bar, and Party Toolkit's gauges/radar
 * all judge a shrinking percentage by. Was six independent copies of this
 * exact ternary across three files before being pulled out here; keeping it
 * in one place means a future threshold tweak (or reused elsewhere) can't
 * drift out of sync between them the way it already had once.
 */
export interface TierColorSet {
  high: string;
  mid: string;
  low: string;
}

export function tierColorClass(percent: number, colors: TierColorSet): string {
  return percent > 50 ? colors.high : percent > 25 ? colors.mid : colors.low;
}

/** The common `text-{emerald,amber,red}-400` triad — most tier-colored text uses exactly this. */
export function tierTextClass(percent: number): string {
  return tierColorClass(percent, { high: "text-emerald-400", mid: "text-amber-400", low: "text-red-400" });
}

/** The common `bg-{emerald,amber,red}-400` triad — most tier-colored fills use exactly this. */
export function tierBgClass(percent: number): string {
  return tierColorClass(percent, { high: "bg-emerald-400", mid: "bg-amber-400", low: "bg-red-400" });
}
