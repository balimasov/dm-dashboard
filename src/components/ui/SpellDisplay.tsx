import { ReactNode } from "react";
import { KnownSpell } from "@/lib/types";
import { RichText } from "../RichText";
import { CHIP_TONE_CLASSES } from "./chipTones";
import { HINT_FACT_ROW_CLS, HINT_PANEL_DIVIDER_CLS, TRAILING_ROW_CLS } from "./containerStyles";
import { HintFact } from "./HintFact";
import { HintPanel } from "./HintPanel";
import { MetaBadge } from "./MetaBadge";
import { recoveryStatusLine } from "./RecoveryBadge";
import { TrailingDot, TrailingValue } from "./RowTrailingValue";
import { MICRO_LABEL_STRONG_CLS } from "./typography";

const CONCENTRATION_PREFIX = "Concentration, ";

/**
 * The subset of `KnownSpell` these two components need — deliberately not
 * just `KnownSpell` itself, so `PartySpellEntry` (Party Toolkit's own
 * cross-character deduped spell shape, which has no single valid `hitOrDc`
 * — see that type's own doc comment) can be passed here too, without either
 * widening `KnownSpell` down to match or duplicating this layout a second
 * time for that one field's absence.
 */
export interface SpellDisplayData {
  name: string;
  school?: string;
  source?: string;
  castingTime?: string;
  range?: string;
  hitOrDc?: string;
  effect?: string;
  effectType?: string;
  effectExtra?: string;
  duration?: string;
  components?: string;
  materialComponent?: string;
  description?: string;
  isConcentration?: boolean;
  isRitual?: boolean;
}

/** Splits `hitOrDc` (e.g. "+6", "DC 15 DEX") into a label + a value with the "DC " prefix stripped, so the hint can show "Save DC" as its own label instead of repeating "DC" in both places. */
function splitHitOrDc(hitOrDc: string): { label: string; value: string } {
  if (hitOrDc.startsWith("DC ")) return { label: "Save DC", value: hitOrDc.slice(3) };
  return { label: "To Hit", value: hitOrDc };
}

/**
 * The hover-hint for a known spell — same underlying `HintPanel` shell every
 * other ability hint uses, but with its own dedicated layout (like
 * `AttackHintPanel` has for weapons) instead of composing through the
 * generic `AbilityHintPanel`: a spell has enough of its own structure (a
 * labeled to-hit/save-DC + effect row styled like a weapon's own bonus/
 * damage line, a labeled Duration line) that forcing it through the shared
 * multi-purpose shape would mean either bloating that shape with spell-only
 * concerns or losing this layout.
 *
 * Two groups below the title, divided by `HINT_PANEL_DIVIDER_CLS`: source
 * (where this spell comes from) on its own, then everything else in the
 * order a DM actually asks the questions in combat — how do I cast it (time/
 * range), do I need to roll and what happens (to-hit-or-DC/effect), can I
 * cast it again right now (`recoveryStatusLine`'s "Recovery" line — read
 * right after the numbers it gates, before anything about *this* casting),
 * does a condition change any of that (Duration/Concentration), and finally
 * components/material cost, prep-time info rather than mid-combat.
 * Description gets its own trailing group.
 */
export function SpellHintPanel({
  spell,
  status,
}: {
  spell: SpellDisplayData;
  /** "Short Rest recovery" etc. (see `recoveryStatusLine`) — only for a spell with its own limited-use charge pool (a `ChargeBadge` already shown on the row); one with no pool has nothing to recover. */
  status?: ReactNode;
}) {
  const isConcentration = spell.duration?.startsWith(CONCENTRATION_PREFIX);
  const hitOrDc = spell.hitOrDc ? splitHitOrDc(spell.hitOrDc) : undefined;
  // A spell with more than one D&D Beyond classification tag (e.g. Sunbeam:
  // Damage + Debuff) shows every one of them here, not just the first —
  // `effect`/`effectType` (the dice/type half, when there is one) always
  // leads, `effectExtra` (every other tag) trails after. `SpellTrailing`'s
  // at-a-glance row deliberately never reads `effectExtra` — see its own
  // doc comment for why a bare classification tag stays hint-only.
  const effectTrailingText = [spell.effectType, spell.effectExtra].filter(Boolean).join(", ");
  const effectTrailing = effectTrailingText ? (spell.effectType ? ` ${effectTrailingText}` : `, ${effectTrailingText}`) : undefined;
  const hasSpecifics = Boolean(
    spell.castingTime || spell.range || hitOrDc || spell.effect || spell.duration || status || spell.components || spell.materialComponent
  );

  return (
    <HintPanel
      title={
        <>
          {spell.name}
          {spell.school && <span className="text-slate-500"> ({spell.school})</span>}
        </>
      }
      description={
        <span className="block space-y-1.5">
          {spell.source && <span className={`block ${MICRO_LABEL_STRONG_CLS}`}>{spell.source}</span>}
          {hasSpecifics && (
            <span className={`block space-y-1.5 ${spell.source ? HINT_PANEL_DIVIDER_CLS : ""}`}>
              {(spell.castingTime || spell.range) && (
                <span className={`block ${MICRO_LABEL_STRONG_CLS}`}>
                  {[spell.castingTime, spell.range].filter(Boolean).join(" · ")}
                </span>
              )}
              {(hitOrDc || spell.effect) && (
                <span className={HINT_FACT_ROW_CLS}>
                  {hitOrDc && <HintFact label={hitOrDc.label} value={hitOrDc.value} />}
                  {spell.effect && <HintFact label="Effect" value={spell.effect} trailing={effectTrailing} />}
                </span>
              )}
              {status}
              {spell.duration && (
                <HintFact
                  label="Duration"
                  value={isConcentration ? "Concentration" : spell.duration}
                  trailing={isConcentration ? `, ${spell.duration.slice(CONCENTRATION_PREFIX.length)}` : undefined}
                />
              )}
              {(spell.components || spell.materialComponent) && (
                <HintFact
                  label="Components"
                  tone="text"
                  value={[spell.components, spell.materialComponent ? `(${spell.materialComponent})` : undefined].filter(Boolean).join(" ")}
                />
              )}
            </span>
          )}
          {spell.description && (
            <span className={`block ${spell.source || hasSpecifics ? HINT_PANEL_DIVIDER_CLS : ""}`}>
              <RichText text={spell.description} />
            </span>
          )}
        </span>
      }
    />
  );
}

/**
 * `SpellHintPanel` assembled for a `KnownSpell`, `recoveryStatusLine`
 * included whenever the spell has its own limited-use charge pool — the one
 * place every caller showing a character's own spell hover-hint builds it,
 * instead of each re-deriving `status` from `spell.recovery`/`current`/`max`
 * by hand and risking the same drift `FeatureHintPanel` exists to prevent
 * (`characterReminders` once passed no `status` at all for a flagged spell).
 * Party Toolkit's cross-character `PartySpellEntry` has no single per-holder
 * charge count to show here, so it keeps calling `SpellHintPanel` directly
 * with no `status` — that omission there is deliberate, not drift.
 */
export function KnownSpellHintPanel({ spell }: { spell: KnownSpell }) {
  return <SpellHintPanel spell={spell} status={spell.max !== undefined && recoveryStatusLine(spell.recovery!, spell.current, spell.max)} />;
}

/**
 * The at-a-glance to-hit/save-DC + effect summary shown right on a spell
 * row — same idea and visual weight as `AttackTrailing` (a middle-dot seam
 * between the two halves) so a DM reads a spell's combat-relevant numbers
 * the same way as a weapon's, without opening the hint. Replaces the old
 * plain components (V/S/M) badge here — that's prep-time info, not
 * something a DM needs mid-fight, and now lives in the hint instead (see
 * `SpellHintPanel`).
 *
 * The roll shares `SpellHintPanel`'s own `HintFact` "sky" tone (`text-sky-400`)
 * — replacing the plain bold white this row used to show, a drift from the
 * hint that was never a deliberate difference. `effectType` keeps its own
 * small `text-[10px]` secondary label instead of matching the hint's
 * full-size trailing text: matches `AttackTrailing`'s own damage-type
 * treatment (same reasoning — a hint panel has room to spell it out
 * plainly, but at this row's denser size a full-size type competes with the
 * roll instead of quietly labeling it), just with the corrected
 * `text-slate-300` instead of the old, too-dim `text-slate-500`.
 *
 * Only shows `effect` when `effectType` is there too (a real damage/healing
 * die, e.g. "4d6 Fire"/"2d8 Healing") — `formatEffect` in `ddbParser/spells.ts`
 * falls back to a bare D&D Beyond classification tag ("Control", "Buff", ...)
 * with no `effectType` when a spell has no dice-based effect at all, and that
 * bare tag cluttered every row it showed up on without saying anything a DM
 * needs mid-fight the way a real damage/healing number does. Still shown in
 * the hint (`SpellHintPanel`) — worth a line once you've opened it, just not
 * worth a permanent spot on every row.
 *
 * Renders nothing for a spell with neither (most passive/utility spells with
 * no attack/save and no dice-based effect this data can summarize).
 *
 * Built from the shared `TrailingValue`/`TrailingDot` atoms
 * (`RowTrailingValue.tsx`) — the same ones `AttackTrailing`/
 * `AbilityTraitTrailing` use, so a size/color change to either reaches all
 * three at once instead of drifting per file the way this row's own size
 * and the middle-dot's size already have.
 */
export function SpellTrailing({ spell }: { spell: SpellDisplayData }) {
  const hasEffect = Boolean(spell.effect && spell.effectType);
  if (!spell.hitOrDc && !hasEffect) return null;
  return (
    <span className={`${TRAILING_ROW_CLS} gap-1 whitespace-nowrap`}>
      {spell.hitOrDc && <TrailingValue value={spell.hitOrDc} />}
      {spell.hitOrDc && hasEffect && <TrailingDot />}
      {hasEffect && <TrailingValue value={spell.effect} label={spell.effectType} />}
    </span>
  );
}

/**
 * Concentration/Ritual status pills for a spell row — sit right after the
 * name (not in `SpellTrailing`'s numbers group), the same `MetaBadge`
 * primitive `RecoveryBadge`/mastery already use in this same row, just with
 * their own `colorClassName`. Concentration reuses `LevelBadge`'s own
 * violet — the one color already meaning "concentration" on this card
 * (`StatusRail`'s toggle uses the same family) — for the badge itself, but
 * its hover hint stays plain text (no `text-violet-300` highlight on the
 * word "Concentration" the way `StatusRail`'s own `CONCENTRATION_HINT_TEXT`
 * does): that highlight reads right on a big toggle row that's otherwise
 * all-neutral, but redundant inches from a badge that's already colored
 * violet itself. Ritual has no established color of its own, so it borrows
 * `RecoveryBadge`'s recharge/`gold` tone, and its hint was already plain
 * text.
 */
export function SpellBadges({ spell }: { spell: Pick<SpellDisplayData, "isConcentration" | "isRitual"> }) {
  if (!spell.isConcentration && !spell.isRitual) return null;
  return (
    <>
      {spell.isConcentration && (
        <MetaBadge
          label="C"
          panel={
            <p>
              <span className="font-semibold text-slate-200">Concentration</span>: required to keep this spell
              active; taking damage forces a Constitution save or the spell ends.
            </p>
          }
          colorClassName={CHIP_TONE_CLASSES.violet}
        />
      )}
      {spell.isRitual && (
        <MetaBadge
          label="R"
          panel={
            <p>
              <span className="font-semibold text-slate-200">Ritual</span>: castable without expending a spell
              slot, but takes 10 minutes longer.
            </p>
          }
          colorClassName={CHIP_TONE_CLASSES.gold}
        />
      )}
    </>
  );
}
