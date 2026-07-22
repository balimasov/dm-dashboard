import { ReactNode } from "react";
import { RichText } from "../RichText";
import { HintPanel } from "./HintPanel";

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
  duration?: string;
  components?: string;
  materialComponent?: string;
  description?: string;
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
 * damage line, a highlighted Concentration marker) that forcing it through
 * the shared multi-purpose shape would mean either bloating that shape with
 * spell-only concerns or losing this layout. Ordered to read the way a DM
 * actually asks the questions in combat: where's it from, how do I cast it,
 * do I need to roll and what happens, how long does it last — components/
 * material cost last, since that's prep-time info rather than mid-combat.
 */
export function SpellHintPanel({
  spell,
  status,
}: {
  spell: SpellDisplayData;
  /** "Short Rest recovery" etc. — only for a spell with its own limited-use charge pool (a `ChargeBadge` already shown on the row); one with no pool has nothing to recover. */
  status?: ReactNode;
}) {
  const isConcentration = spell.duration?.startsWith(CONCENTRATION_PREFIX);
  const hitOrDc = spell.hitOrDc ? splitHitOrDc(spell.hitOrDc) : undefined;

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
          {spell.source && (
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{spell.source}</span>
          )}
          {(spell.castingTime || spell.range) && (
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {[spell.castingTime, spell.range].filter(Boolean).join(" · ")}
            </span>
          )}
          {(hitOrDc || spell.effect) && (
            <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
              {hitOrDc && (
                <span>
                  <span className="text-slate-500">{hitOrDc.label}</span>{" "}
                  <span className="font-semibold text-slate-100">{hitOrDc.value}</span>
                </span>
              )}
              {spell.effect && (
                <span>
                  <span className="text-slate-500">Effect</span> <span className="font-semibold text-slate-100">{spell.effect}</span>
                  {spell.effectType && <span> {spell.effectType}</span>}
                </span>
              )}
            </span>
          )}
          {status && <span className="block text-xs font-medium">{status}</span>}
          {spell.duration && (
            <span className="block">
              {isConcentration ? (
                <>
                  <span className="font-semibold text-violet-300">Concentration</span>
                  {`, ${spell.duration.slice(CONCENTRATION_PREFIX.length)}`}
                </>
              ) : (
                spell.duration
              )}
            </span>
          )}
          {spell.description && (
            <span className="block">
              <RichText text={spell.description} />
            </span>
          )}
          {(spell.components || spell.materialComponent) && (
            <span className="block border-t border-slate-800 pt-1.5 text-slate-500">
              {[spell.components, spell.materialComponent].filter(Boolean).join(" — ")}
            </span>
          )}
        </span>
      }
    />
  );
}

/**
 * The at-a-glance to-hit/save-DC + effect summary shown right on a spell
 * row — same idea and visual weight as `AttackTrailing` (bold white numbers,
 * a middle-dot seam between the two halves, the effect's type demoted to a
 * small muted tag) so a DM reads a spell's combat-relevant numbers the same
 * way as a weapon's, without opening the hint. Replaces the old plain
 * components (V/S/M) badge here — that's prep-time info, not something a DM
 * needs mid-fight, and now lives in the hint instead (see `SpellHintPanel`).
 * Renders nothing for a spell with neither (most passive/utility spells with
 * no attack/save and no dice-based effect this data can summarize).
 */
export function SpellTrailing({ spell }: { spell: SpellDisplayData }) {
  if (!spell.hitOrDc && !spell.effect) return null;
  return (
    <span className="flex shrink-0 items-center gap-1 whitespace-nowrap text-xs">
      {spell.hitOrDc && <span className="font-semibold text-slate-100">{spell.hitOrDc}</span>}
      {spell.hitOrDc && spell.effect && <span className="text-sm font-bold leading-none text-slate-500">·</span>}
      {spell.effect && (
        <span className="flex items-baseline gap-1">
          <span className="font-semibold text-slate-100">{spell.effect}</span>
          {spell.effectType && <span className="text-[10px] text-slate-500">{spell.effectType}</span>}
        </span>
      )}
    </span>
  );
}
