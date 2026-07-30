import { AbilityScores } from "@/lib/types";
import { AdvantageLine } from "./AdvantageLine";

export const ABILITY_FULL_NAMES: Record<keyof AbilityScores, string> = {
  str: "Strength",
  dex: "Dexterity",
  con: "Constitution",
  int: "Intelligence",
  wis: "Wisdom",
  cha: "Charisma",
};

const ABILITY_BLURBS: Record<keyof AbilityScores, string> = {
  str: "Physical power — melee attacks and damage, athletics, forcing objects.",
  dex: "Agility and reflexes — Armor Class, Initiative, ranged attacks, Stealth.",
  con: "Stamina and health — hit points, Concentration checks.",
  int: "Reasoning and memory — Arcana, History, Investigation, Nature, Religion.",
  wis: "Awareness and intuition — Perception, Insight, Medicine, Survival.",
  cha: "Force of personality — Deception, Intimidation, Performance, Persuasion.",
};

/**
 * `Character.advantages` is a flat list of free-text rules strings built by
 * `computeAdvantages` (e.g. "Advantage: Dexterity Saving Throws — unless
 * you are Incapacitated"), not tagged per-ability — this scans it for the
 * first entry whose subject starts with the ability's own full name,
 * whichever exact grant that turns out to be (the saving throw
 * specifically, "Dexterity Saving Throws"; ability checks, "Dexterity
 * Checks"; or the whole ability at once, bare "Dexterity", e.g. a
 * Changeling's ability-check grant). Only ever finds something for
 * characters — `Creature` has no equivalent free-text advantage list (only
 * the numeric `savingThrows` override `AbilityScoreBox`'s `highlight` is
 * already computed from), so a creature's hint simply never has this line;
 * callers just omit `advantages` rather than this needing its own
 * creature-shaped lookup.
 */
export function findAbilityAdvantage(
  advantages: string[],
  key: keyof AbilityScores
): { kind: "Advantage" | "Disadvantage"; subject: string; restriction?: string } | undefined {
  const fullName = ABILITY_FULL_NAMES[key];
  for (const raw of advantages) {
    const match = raw.match(/^(Advantage|Disadvantage): (.+)$/);
    if (!match) continue;
    const [, kind, rest] = match;
    if (rest !== fullName && !rest.startsWith(`${fullName} `)) continue;
    const dashIndex = rest.indexOf(" — ");
    const subjectPart = dashIndex >= 0 ? rest.slice(0, dashIndex) : rest;
    const restriction = dashIndex >= 0 ? rest.slice(dashIndex + 3) : undefined;
    const subject =
      subjectPart === fullName ? "ability checks and saving throws" : subjectPart.slice(fullName.length).trim().toLowerCase();
    return { kind: kind as "Advantage" | "Disadvantage", subject, restriction };
  }
  return undefined;
}

/**
 * Hover hint for one `AbilityScoreBox` cell — mirrors the box's own
 * mod-over-save layout as two side-by-side columns (Check | Save) instead
 * of a single blended paragraph, so the two numbers read as clearly
 * distinct the same way they already do stacked on the box itself (a
 * user-reported issue with an earlier draft that ran them together in
 * prose). Skills aren't repeated here — they're their own section on the
 * card already. The Save column's number only ever turns amber under the
 * exact same `highlight` condition the box itself uses, not a separate
 * "Proficient" text badge — the hint's color signal and the card's color
 * signal were out of sync before this (another explicit piece of feedback),
 * now they're the same `highlight ? "text-amber-300" : "text-slate-400"`
 * recipe in both places.
 */
export function AbilityScoreHintPanel({
  abilityKey,
  score,
  modifier,
  save,
  highlight,
  advantages,
}: {
  abilityKey: keyof AbilityScores;
  score: number;
  modifier: string;
  save: string;
  highlight?: boolean;
  /** Omitted for a creature — see `findAbilityAdvantage`'s own doc comment. */
  advantages?: string[];
}) {
  const advantage = advantages ? findAbilityAdvantage(advantages, abilityKey) : undefined;
  return (
    <div className="w-60">
      <p className="font-medium text-white">{ABILITY_FULL_NAMES[abilityKey]}</p>
      <p className="mt-1 text-slate-300">{ABILITY_BLURBS[abilityKey]}</p>
      <div className="mt-2 flex border-t border-slate-800 pt-2">
        <div className="flex-1 text-center">
          <p className="text-[10px] uppercase tracking-wide text-slate-600">Check</p>
          <p className="text-base font-bold text-slate-100">{modifier}</p>
          <p className="text-xs text-slate-500">Score {score}</p>
        </div>
        <div className="flex-1 border-l border-slate-800 text-center">
          <p className="text-[10px] uppercase tracking-wide text-slate-600">Save</p>
          <p className={`text-base font-bold ${highlight ? "text-amber-300" : "text-slate-400"}`}>{save}</p>
          <p className="text-xs text-slate-500">{highlight ? "Proficient" : "—"}</p>
        </div>
      </div>
      {advantage && (
        <AdvantageLine kind={advantage.kind === "Advantage" ? "advantage" : "disadvantage"}>
          <b className="text-slate-100">{advantage.kind}</b> on {advantage.subject}
          {advantage.restriction ? ` — ${advantage.restriction}` : ""}
        </AdvantageLine>
      )}
    </div>
  );
}
