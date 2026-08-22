import { describe, expect, test, vi } from "vitest";
import { DicePool, formatNotation, poolHasD20, poolTotalDice, rollDicePool } from "./diceRoller";

describe("poolTotalDice / poolHasD20", () => {
  test("sums every die size present in the pool", () => {
    expect(poolTotalDice({ 6: 2, 8: 1 })).toBe(3);
    expect(poolTotalDice({})).toBe(0);
  });

  test("only true when the pool has at least one d20", () => {
    expect(poolHasD20({ 20: 1 })).toBe(true);
    expect(poolHasD20({ 20: 0, 6: 2 })).toBe(false);
    expect(poolHasD20({})).toBe(false);
  });
});

describe("formatNotation", () => {
  test("joins multiple die sizes in fixed d4..d100 order regardless of pool insertion order", () => {
    const pool: DicePool = { 20: 1, 6: 2 };
    expect(formatNotation(pool, 0, "normal")).toBe("2d6 + 1d20");
  });

  test("appends a positive modifier without a double '+'", () => {
    expect(formatNotation({ 6: 2 }, 3, "normal")).toBe("2d6 + 3");
  });

  test("appends a negative modifier as '- N', not '+ -N'", () => {
    expect(formatNotation({ 6: 2 }, -3, "normal")).toBe("2d6 - 3");
  });

  test("an empty pool with no modifier renders as an em dash placeholder", () => {
    expect(formatNotation({}, 0, "normal")).toBe("—");
  });

  test("appends '(adv)'/'(dis)' only when the pool actually has a d20", () => {
    expect(formatNotation({ 20: 1 }, 0, "advantage")).toBe("1d20 (adv)");
    expect(formatNotation({ 20: 1 }, 0, "disadvantage")).toBe("1d20 (dis)");
    expect(formatNotation({ 6: 1 }, 0, "advantage")).toBe("1d6");
  });
});

describe("rollDicePool", () => {
  test("an empty pool rolls nothing", () => {
    expect(rollDicePool({}, 5, "normal")).toBeNull();
  });

  test("every rolled value stays within its die's own bounds, and the total sums kept values plus the modifier", () => {
    for (let i = 0; i < 50; i++) {
      const result = rollDicePool({ 6: 3, 20: 1 }, 2, "normal");
      expect(result).not.toBeNull();
      const dice = result!.dice;
      expect(dice).toHaveLength(4);
      for (const d of dice) {
        expect(d.kept).toBeGreaterThanOrEqual(1);
        expect(d.kept).toBeLessThanOrEqual(d.sides);
        expect(d.rolls).toHaveLength(1);
        expect(d.discardedIndex).toBe(-1);
      }
      const expectedTotal = dice.reduce((sum, d) => sum + d.kept, 0) + 2;
      expect(result!.total).toBe(expectedTotal);
    }
  });

  test("advantage on a d20 rolls twice and keeps the higher value, discarding the other", () => {
    const values = [7, 15];
    let call = 0;
    vi.spyOn(Math, "random").mockImplementation(() => (values[call++] - 1) / 20);
    const result = rollDicePool({ 20: 1 }, 0, "advantage");
    vi.restoreAllMocks();
    expect(result!.dice[0].rolls).toEqual([7, 15]);
    expect(result!.dice[0].kept).toBe(15);
    expect(result!.dice[0].discardedIndex).toBe(0);
    expect(result!.total).toBe(15);
  });

  test("disadvantage on a d20 keeps the lower of the two rolls", () => {
    const values = [7, 15];
    let call = 0;
    vi.spyOn(Math, "random").mockImplementation(() => (values[call++] - 1) / 20);
    const result = rollDicePool({ 20: 1 }, 0, "disadvantage");
    vi.restoreAllMocks();
    expect(result!.dice[0].kept).toBe(7);
    expect(result!.dice[0].discardedIndex).toBe(1);
    expect(result!.total).toBe(7);
  });

  test("advantage/disadvantage never applies to a non-d20 die, even when adv is passed in", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const result = rollDicePool({ 6: 1 }, 0, "advantage");
    vi.restoreAllMocks();
    expect(result!.dice[0].rolls).toHaveLength(1);
    expect(result!.dice[0].discardedIndex).toBe(-1);
  });

  test("isCrit true only when every d20 in the pool comes up 20", () => {
    vi.spyOn(Math, "random").mockReturnValue(19 / 20); // -> value 20
    const result = rollDicePool({ 20: 2 }, 0, "normal");
    vi.restoreAllMocks();
    expect(result!.isCrit).toBe(true);
    expect(result!.isFumble).toBe(false);
  });

  test("isFumble true only when every d20 in the pool comes up 1", () => {
    vi.spyOn(Math, "random").mockReturnValue(0); // -> value 1
    const result = rollDicePool({ 20: 1 }, 0, "normal");
    vi.restoreAllMocks();
    expect(result!.isFumble).toBe(true);
    expect(result!.isCrit).toBe(false);
  });

  test("no crit/fumble signal when the pool has no d20 at all", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const result = rollDicePool({ 6: 1 }, 0, "normal");
    vi.restoreAllMocks();
    expect(result!.isCrit).toBe(false);
    expect(result!.isFumble).toBe(false);
  });

  test("notation on the result matches formatNotation for the same inputs", () => {
    const result = rollDicePool({ 6: 2, 8: 1 }, 3, "normal");
    expect(result!.notation).toBe("2d6 + 1d8 + 3");
  });
});
