import { formatModifier } from "./format";

/** The 7 standard polyhedral die sizes a D&D roll ever needs — fixed, not derived from anywhere, the same way `STANDARD_ACTIONS` is a static reference list rather than character-derived data. */
export const DIE_SIDES = [4, 6, 8, 10, 12, 20, 100] as const;
export type DieSides = (typeof DIE_SIDES)[number];

export type AdvantageMode = "normal" | "advantage" | "disadvantage";

/** How many of each die size are currently queued up to roll together — a sparse map, so an untouched die size is simply absent rather than present at 0. */
export type DicePool = Partial<Record<DieSides, number>>;

export interface RolledDie {
  sides: DieSides;
  /** The value that actually counts toward the total — for a plain roll this is `rolls[0]`; for a d20 rolled with advantage/disadvantage it's whichever of the two `rolls` was kept. */
  kept: number;
  /** Every value actually rolled: one entry normally, two for a d20 rolled with advantage or disadvantage. */
  rolls: number[];
  /** Index into `rolls` that was discarded (advantage/disadvantage only) — `-1` when nothing was discarded. */
  discardedIndex: number;
}

export interface DiceRoll {
  id: string;
  notation: string;
  dice: RolledDie[];
  modifier: number;
  total: number;
  /** Every d20 in the pool came up a natural 20 — mirrors D&D Beyond's own "any d20 in the roll" crit convention rather than requiring the pool to be a single d20. */
  isCrit: boolean;
  /** Every d20 in the pool came up a natural 1. */
  isFumble: boolean;
  createdAt: string;
}

export const MAX_DICE_HISTORY = 20;

function randomDie(sides: number): number {
  return 1 + Math.floor(Math.random() * sides);
}

function rollOneDie(sides: DieSides, adv: AdvantageMode): RolledDie {
  if (sides === 20 && adv !== "normal") {
    const a = randomDie(20);
    const b = randomDie(20);
    const kept = adv === "advantage" ? Math.max(a, b) : Math.min(a, b);
    return { sides, kept, rolls: [a, b], discardedIndex: a === kept ? 1 : 0 };
  }
  const value = randomDie(sides);
  return { sides, kept: value, rolls: [value], discardedIndex: -1 };
}

export function poolTotalDice(pool: DicePool): number {
  return DIE_SIDES.reduce((sum, sides) => sum + (pool[sides] ?? 0), 0);
}

export function poolHasD20(pool: DicePool): boolean {
  return (pool[20] ?? 0) > 0;
}

/** "2d6 + 1d8 + 3 (adv)" — the same notation shown both on the pool preview before rolling and, frozen at roll time, on each `DiceRoll` in history. Builds every part (dice counts and the modifier) as its own "+N"/"N" token first, then fixes up the two double-sign cases a plain `join(" + ")` produces ("+ +3", "+ -3") rather than special-casing the modifier's join separately. */
export function formatNotation(pool: DicePool, modifier: number, adv: AdvantageMode): string {
  const parts = DIE_SIDES.filter((sides) => (pool[sides] ?? 0) > 0).map((sides) => `${pool[sides]}d${sides}`);
  if (modifier !== 0) parts.push(formatModifier(modifier));
  const label = parts.length > 0 ? parts.join(" + ").replace("+ +", "+ ").replace("+ -", "- ") : "—";
  return poolHasD20(pool) && adv !== "normal" ? `${label} (${adv === "advantage" ? "adv" : "dis"})` : label;
}

/** `null` for an empty pool — nothing to roll, so nothing is added to history. Advantage/disadvantage only ever applies to d20s in the pool (see `rollOneDie`); every other die size always rolls once regardless of `adv`. */
export function rollDicePool(pool: DicePool, modifier: number, adv: AdvantageMode): DiceRoll | null {
  if (poolTotalDice(pool) === 0) return null;
  const dice: RolledDie[] = [];
  for (const sides of DIE_SIDES) {
    const count = pool[sides] ?? 0;
    for (let i = 0; i < count; i++) dice.push(rollOneDie(sides, sides === 20 ? adv : "normal"));
  }
  const total = dice.reduce((sum, d) => sum + d.kept, 0) + modifier;
  const d20s = dice.filter((d) => d.sides === 20);
  return {
    id: Math.random().toString(36).slice(2),
    notation: formatNotation(pool, modifier, adv),
    dice,
    modifier,
    total,
    isCrit: d20s.length > 0 && d20s.every((d) => d.kept === 20),
    isFumble: d20s.length > 0 && d20s.every((d) => d.kept === 1),
    createdAt: new Date().toISOString(),
  };
}
