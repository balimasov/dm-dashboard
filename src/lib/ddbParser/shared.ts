/* eslint-disable @typescript-eslint/no-explicit-any */
import { AbilityScores, formatModifier, RecoveryType } from "../types";

export const ABILITY_BY_ID: Record<number, keyof AbilityScores> = {
  1: "str",
  2: "dex",
  3: "con",
  4: "int",
  5: "wis",
  6: "cha",
};

const RESET_TYPE_MAP: Record<number, RecoveryType> = {
  1: "short-rest",
  2: "long-rest",
  3: "dawn",
  4: "manual",
};

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function titleCase(kebab: string): string {
  return kebab
    .split("-")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * `modifiers.item` lists every grant from every item in the inventory, worn
 * or not — confirmed on a real export where a carried-but-unequipped item's
 * conditional "disadvantage on Strength/Dexterity checks and saves while
 * poisoned" showed up as an active skill badge despite D&D Beyond's own
 * sheet (which does gate item effects on `equipped`) showing nothing. Every
 * other equipment-derived value in this file (AC, HP, limited-use charges)
 * already checks `.equipped` before counting an item's contribution; this
 * bulk modifier list was the one place still trusting the raw list. A
 * modifier whose `componentId` doesn't match any known inventory item
 * (e.g. it's actually granted by something else) is kept rather than
 * dropped, so an unrecognized source doesn't silently disappear.
 */
export function collectModifiers(data: any): any[] {
  const groups = ["race", "class", "background", "item", "feat", "condition"];
  const inventoryById = new Map<number | undefined, any>(
    (data.inventory ?? []).map((i: any) => [i.definition?.id, i])
  );
  return groups.flatMap((g) => {
    const mods = data.modifiers?.[g] ?? [];
    if (g !== "item") return mods;
    return mods.filter((m: any) => {
      const item = inventoryById.get(m.componentId);
      return !item || item.equipped;
    });
  });
}

/**
 * D&D Beyond's `snippet` is usually clean plain text but NOT always — some
 * (e.g. a Circle Spell feature's Cube-count text) embed raw HTML tags
 * unstripped, confirmed on a real export. So both `snippet` and the
 * HTML `description` fallback go through the same cleaning pass rather
 * than trusting snippet to already be safe.
 *
 * Bold/italic are preserved as markdown-lite `**bold**`/`*italic*` markers
 * (rendered back into real <strong>/<em> by the UI) instead of being
 * dropped like other tags, since D&D Beyond uses them to highlight the
 * one number in a sentence a player actually needs (e.g. "regain **1d10**
 * HP").
 */
export function cleanRulesText(html: string): string {
  return html
    .replace(/&rsquo;/g, "’")
    .replace(/&lsquo;/g, "‘")
    .replace(/&rdquo;/g, "”")
    .replace(/&ldquo;/g, "“")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\[\/?(?:rules|skill|item|spell|condition)\]/gi, "")
    .replace(/<\/(?:p|div|li)>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    // Nested <strong><em>Label.</em></strong> (a common "bold sub-heading"
    // convention in these rules texts, confirmed on real Sorcerer/Barbarian/
    // Bard/feat descriptions) has to collapse to a single bold marker before
    // the two tags are converted independently below — otherwise **+* on one
    // side and *+** on the other stack up into a stray `***Label.***`, which
    // RichText's bold/italic parser can't split cleanly and leaves loose `*`
    // characters in the rendered tooltip.
    .replace(/<strong><em>([\s\S]*?)<\/em><\/strong>/gi, "**$1**")
    .replace(/<em><strong>([\s\S]*?)<\/strong><\/em>/gi, "**$1**")
    .replace(/<(?:strong|b)>/gi, "**")
    .replace(/<\/(?:strong|b)>/gi, "**")
    .replace(/<(?:em|i)>/gi, "*")
    .replace(/<\/(?:em|i)>/gi, "*")
    .replace(/<[^>]*>/g, "")
    // D&D Beyond's `snippet` field is often plain text rather than HTML, and
    // formats sub-points as a real newline + indentation + "•" (confirmed on
    // a real Bard's Dazzling Footwork) instead of proper list markup — mark
    // each with a placeholder *before* the general whitespace collapse below
    // (which would otherwise flatten the newlines into a single run-on
    // paragraph with bare "•" characters stranded mid-sentence), then restore
    // them as real line breaks afterward.
    .replace(/\s*(?:\r?\n\s*)+•\s*/g, "@@BULLET@@")
    .replace(/\s+/g, " ")
    .replace(/@@BULLET@@/g, "\n• ")
    .trim();
}

/** Prefers D&D Beyond's `snippet` over its longer `description` (both get the same HTML cleanup). */
export function shortDescription(snippet?: string | null, description?: string | null): string | undefined {
  const raw = (snippet && snippet.trim()) || description;
  if (!raw) return undefined;
  const cleaned = cleanRulesText(raw);
  return cleaned || undefined;
}

/** Thrown for anything the placeholder evaluator below can't resolve — an unknown variable/modifier keyword, bad syntax, or `scalevalue`/`limiteduse` with no charge count available. Callers catch it and drop just that one placeholder. */
class TemplateEvalError extends Error {}

type TemplateMod =
  | { op: "rounddown" | "roundup" | "signed" | "unsigned" }
  | { op: "min" | "max"; value: number };

/**
 * D&D Beyond's rules-text placeholders aren't a fixed set of tags — they're a
 * small expression language: variables (`classlevel`, `proficiency`, `speed`,
 * `modifier:cha`, `abilityscore:str`, `savedc:wis`, `spellattack:int`,
 * `scalevalue`/`limiteduse`), arithmetic (`+ - * /`, parens), and postfix
 * modifier lists that clamp/round/format a value — `@list` applied inline to
 * the atom right before it (so the rest of the expression keeps computing
 * with a plain number), `#list` applied once to the whole expression's final
 * value (and, unlike `@`, allowed to include `signed`/`unsigned` to turn the
 * number into display text). Confirmed by tracing real examples pulled from
 * every sample export, e.g. `{{4+(classlevel-13)@min:0,max:1*4}}` (a level-13
 * step-up: clamp `classlevel-13` to 0..1 *before* multiplying by 4, so
 * `@` has to bind tighter than the surrounding `*`), and
 * `{{(12+classlevel)/7#rounddown,min:2,unsigned}}` (round/clamp/format the
 * *entire* division, not just the `7`). A hand-rolled recursive-descent
 * parser with standard `* /` before `+ -` precedence reproduces both without
 * special-casing either.
 */
function evaluateTemplatePlaceholder(
  expr: string,
  ctx: { level: number; abilities: AbilityScores; profBonus: number; maxUses?: number; speed?: number }
): string {
  let i = 0;
  const n = expr.length;

  const isDigit = (ch: string) => ch >= "0" && ch <= "9";
  const isIdentChar = (ch: string) => /[a-zA-Z]/.test(ch);
  const skipWs = () => {
    while (i < n && expr[i] === " ") i++;
  };

  function readIdent(): string {
    const start = i;
    while (i < n && isIdentChar(expr[i])) i++;
    if (i === start) throw new TemplateEvalError(`expected identifier at ${i}`);
    return expr.slice(start, i);
  }

  function readNumber(): number {
    const start = i;
    if (expr[i] === "-") i++;
    while (i < n && (isDigit(expr[i]) || expr[i] === ".")) i++;
    if (i === start || (i === start + 1 && expr[start] === "-")) throw new TemplateEvalError(`expected number at ${i}`);
    return Number(expr.slice(start, i));
  }

  function readModList(): TemplateMod[] {
    const mods: TemplateMod[] = [];
    for (;;) {
      skipWs();
      const key = readIdent().toLowerCase();
      if (key === "min" || key === "max") {
        if (expr[i] !== ":") throw new TemplateEvalError(`expected ':' after "${key}"`);
        i++;
        mods.push({ op: key, value: readNumber() });
      } else if (key === "rounddown" || key === "roundup" || key === "signed" || key === "unsigned") {
        mods.push({ op: key });
      } else {
        throw new TemplateEvalError(`unknown modifier "${key}"`);
      }
      skipWs();
      if (expr[i] === ",") {
        i++;
        continue;
      }
      break;
    }
    return mods;
  }

  function applyNumericMods(value: number, mods: TemplateMod[]): number {
    for (const mod of mods) {
      if (mod.op === "rounddown") value = Math.floor(value);
      else if (mod.op === "roundup") value = Math.ceil(value);
      else if (mod.op === "min") value = Math.max(value, mod.value);
      else if (mod.op === "max") value = Math.min(value, mod.value);
    }
    return value;
  }

  function abilityKey(arg: string | undefined): keyof AbilityScores {
    const key = (arg ?? "").toLowerCase();
    if (key === "str" || key === "dex" || key === "con" || key === "int" || key === "wis" || key === "cha") return key;
    throw new TemplateEvalError(`unknown ability "${arg}"`);
  }

  function resolveVariable(name: string, arg: string | undefined): number {
    switch (name) {
      case "classlevel":
      case "characterlevel":
        return ctx.level;
      case "proficiency":
        return ctx.profBonus;
      case "scalevalue":
      case "limiteduse":
        if (ctx.maxUses === undefined) throw new TemplateEvalError("scalevalue unavailable");
        return ctx.maxUses;
      case "speed":
        if (ctx.speed === undefined) throw new TemplateEvalError("speed unavailable");
        return ctx.speed;
      case "modifier":
        return abilityModifier(ctx.abilities[abilityKey(arg)]);
      case "abilityscore":
        return ctx.abilities[abilityKey(arg)];
      case "savedc":
        return 8 + ctx.profBonus + abilityModifier(ctx.abilities[abilityKey(arg)]);
      case "spellattack":
        return ctx.profBonus + abilityModifier(ctx.abilities[abilityKey(arg)]);
      default:
        throw new TemplateEvalError(`unknown variable "${name}"`);
    }
  }

  // Binds "@modlist" to the atom that directly precedes it (a number, a
  // variable, or a fully parenthesized group) before that atom's value ever
  // reaches a surrounding `*`/`/`/`+`/`-` — this is what makes
  // `(classlevel-13)@min:0,max:1*4` clamp first and multiply second.
  function parseAtom(): number {
    skipWs();
    let value: number;
    if (expr[i] === "(") {
      i++;
      value = parseExpr();
      skipWs();
      if (expr[i] !== (")" as string)) throw new TemplateEvalError("expected ')'");
      i++;
    } else if (isDigit(expr[i]) || (expr[i] === "-" && isDigit(expr[i + 1]))) {
      value = readNumber();
    } else {
      const name = readIdent().toLowerCase();
      let arg: string | undefined;
      if (expr[i] === ":") {
        i++;
        arg = readIdent();
      }
      value = resolveVariable(name, arg);
    }
    skipWs();
    while (expr[i] === "@") {
      i++;
      value = applyNumericMods(value, readModList());
      skipWs();
    }
    return value;
  }

  function parseTerm(): number {
    let value = parseAtom();
    skipWs();
    while (expr[i] === "*" || expr[i] === "/") {
      const op = expr[i];
      i++;
      const rhs = parseAtom();
      value = op === "*" ? value * rhs : value / rhs;
      skipWs();
    }
    return value;
  }

  function parseExpr(): number {
    let value = parseTerm();
    skipWs();
    while (expr[i] === "+" || expr[i] === "-") {
      const op = expr[i];
      i++;
      const rhs = parseTerm();
      value = op === "+" ? value + rhs : value - rhs;
      skipWs();
    }
    return value;
  }

  let value = parseExpr();
  skipWs();
  // "#modlist", if present, is a *final* wrapper applied once to the whole
  // expression's result — the only place `signed`/`unsigned` can appear,
  // since only here does the number turn into display text.
  let finalMods: TemplateMod[] = [];
  if (expr[i] === "#") {
    i++;
    finalMods = readModList();
  }
  skipWs();
  if (i !== n) throw new TemplateEvalError(`unexpected trailing input at ${i}`);

  value = applyNumericMods(
    value,
    finalMods.filter((m) => m.op !== "signed" && m.op !== "unsigned")
  );
  return finalMods.some((m) => m.op === "signed") ? formatModifier(value) : String(value);
}

/**
 * Resolves every `{{...}}` placeholder in a D&D Beyond snippet/description
 * via `evaluateTemplatePlaceholder`. A placeholder that fails to evaluate
 * (unknown future syntax, or `scalevalue`/`limiteduse` with no charge count
 * available) is dropped silently rather than left as a raw `{{...}}` tag or a
 * guessed number — same graceful-degradation behavior as before, now just
 * covering far fewer cases since the evaluator understands the actual
 * expression grammar instead of a fixed list of tags.
 */
export function resolveSnippetTemplate(
  text: string,
  level: number,
  abilities: AbilityScores,
  profBonus: number,
  maxUses?: number,
  speed?: number
): string {
  return text
    .replace(/\{\{([^}]+)\}\}/g, (_match, expr) => {
      try {
        return evaluateTemplatePlaceholder(String(expr).trim(), { level, abilities, profBonus, maxUses, speed });
      } catch {
        return "";
      }
    })
    // Collapse horizontal whitespace only — a "\n• " line break inserted by
    // cleanRulesText's bullet-list handling must survive this step, or every
    // bullet point collapses back into one run-on line.
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();
}

/**
 * Shared by Resources, Spells, and (via cross-reference) Features — anywhere
 * D&D Beyond tracks a live charge pool via a `limitedUse` object (as opposed
 * to the unrelated, non-live-tracked `limitedUse` scaling table that also
 * appears directly on class-feature/racial-trait/feat *definitions*, which
 * has a completely different shape and isn't usable for this). Confirmed the
 * same rich shape (`maxUses`/`statModifierUsesId`/`useProficiencyBonus`/
 * `resetType`/`numberUsed`) appears both on `data.actions.*` entries and on
 * `data.spells.*` entries (an innate spell castable a few times/day without a
 * slot), so one calculation covers both.
 */
export function computeLimitedUseCharges(
  lu: any,
  abilities: AbilityScores,
  profBonus: number
): { current: number; max: number; recovery: RecoveryType } | null {
  if (!lu || (!lu.maxUses && !lu.statModifierUsesId && !lu.useProficiencyBonus)) return null;
  const abilityById: Record<number, number> = {
    1: abilities.str,
    2: abilities.dex,
    3: abilities.con,
    4: abilities.int,
    5: abilities.wis,
    6: abilities.cha,
  };
  let maxUses = lu.maxUses && lu.maxUses !== -1 ? lu.maxUses : 0;
  if (lu.statModifierUsesId) {
    const mod = abilityModifier(abilityById[lu.statModifierUsesId] ?? 10);
    maxUses = lu.operator === 2 ? maxUses * mod : maxUses + mod;
  }
  if (lu.useProficiencyBonus) {
    maxUses = lu.proficiencyBonusOperator === 2 ? maxUses * profBonus : maxUses + profBonus;
  }
  maxUses = Math.max(0, maxUses);
  return {
    current: Math.max(0, maxUses - (lu.numberUsed ?? 0)),
    max: maxUses,
    recovery: RESET_TYPE_MAP[lu.resetType] ?? "manual",
  };
}

/**
 * D&D Beyond's own hint text states the die type (e.g. "You have 4
 * Superiority Dice, which are d8s") but that only lives in the *long*
 * `description` field — the short `snippet` this app prefers for resource
 * hints is a generic templated blurb ("You have {{scalevalue}} Superiority
 * Dice...") that never mentions the die size at all, and the die type itself
 * only shows up separately on the *action* node's own `dice` field (`{
 * diceValue: 8, ... }`), not in either text field. So rather than trying to
 * splice "d8" into whichever wording a given feature's snippet happens to
 * use, this appends one short, standalone sentence stating it plainly.
 * Scoped to names that say "die"/"dice" (Superiority Dice, Bardic
 * Inspiration Die...) rather than every resource with a `dice` field, since
 * for most actions that field is the action's *damage* roll (e.g. a weapon
 * attack), unrelated to the resource's own charge count.
 */
export function diceTypeNote(name: string, dice: any): string {
  if (!dice?.diceValue || !/\b(die|dice)\b/i.test(name)) return "";
  return ` Each die is a d${dice.diceValue}.`;
}
